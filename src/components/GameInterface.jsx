import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const GameInterface = ({ user, onGameComplete, onOpenCoinflipModal }) => {
  const [wagerAmount, setWagerAmount] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const MIN_WAGER = 100; // 100 satoshis
  const MAX_WAGER = 100000000; // 1 BTC

  // Fetch active games
  useEffect(() => {
    if (!user) return;

    const fetchGames = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching games:', error);
        return;
      }

      setGames(data || []);
    };

    fetchGames();

    // Subscribe to changes
    const gamesSubscription = supabase
      .channel('public:games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchGames)
      .subscribe();

    return () => {
      supabase.removeChannel(gamesSubscription);
    };
  }, [user]);

  const createGame = async () => {
    if (!user) {
      setError('You must be logged in to create a game');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const satoshis = parseInt(wagerAmount);
    
    // Validate wager amount
    if (isNaN(satoshis) || satoshis < MIN_WAGER || satoshis > MAX_WAGER) {
      setError(`Wager must be between ${MIN_WAGER} and ${MAX_WAGER} satoshis`);
      setLoading(false);
      return;
    }
    
    try {
      // Try to verify user exists in database (with retry logic)
      let userData = null;
      let retries = 2;
      
      while (retries >= 0 && !userData) {
        try {
          console.log(`Verifying user before game creation (retries: ${retries}):`, user.id);
          const { data, error } = await supabase
            .from('users')
            .select('id, balance')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error(`Error verifying user (retry ${retries}):`, error);
            if (retries > 0) {
              retries--;
              // Wait a moment before retrying
              await new Promise(resolve => setTimeout(resolve, 800));
              continue;
            } else {
              throw error;
            }
          }
          
          userData = data;
        } catch (err) {
          if (retries > 0) {
            retries--;
            // Wait a moment before retrying
            await new Promise(resolve => setTimeout(resolve, 800));
          } else {
            console.error('Failed to verify user after retries');
            setError('Failed to verify user account. Please try again in a moment.');
            setLoading(false);
            return;
          }
        }
      }
      
      // If we got here and still don't have userData, return with error
      if (!userData) {
        setError('User verification failed. Please refresh the page and try again.');
        setLoading(false);
        return;
      }
      
      // Check if user has enough balance
      if (userData.balance < satoshis) {
        setError(`Insufficient balance. You have ₿ ${userData.balance.toLocaleString('en-US').replace(/,/g, ' ')}`);
        setLoading(false);
        return;
      }
      
      // Create the game
      console.log('Creating game with wager:', satoshis);
      const { data, error } = await supabase
        .from('games')
        .insert({
          player1_id: user.id,
          wager_amount: satoshis,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) {
        console.error('Game creation error:', error);
        
        // Special handling for the foreign key constraint error
        if (error.code === '23503' && error.message.includes('foreign key constraint')) {
          setError('Unable to create game: your account is not properly initialized. Please refresh the page.');
        } else {
          throw error;
        }
        return;
      }
      
      console.log('Game created successfully:', data.id);
      
      // Update user balance
      await supabase.rpc('update_balance', {
        user_id: user.id,
        amount: -satoshis
      });
      
      setWagerAmount('');
    } catch (err) {
      console.error('Create game error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (gameId) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
        
      if (gameError) throw gameError;
      
      // Check if user has enough balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', user.id)
        .single();
        
      if (userError) throw userError;
      
      if (userData.balance < game.wager_amount) {
        throw new Error('Insufficient balance');
      }
      
      // Update game status
      const { error: updateError } = await supabase
        .from('games')
        .update({
          player2_id: user.id,
          status: 'active'
        })
        .eq('id', gameId);
        
      if (updateError) throw updateError;
      
      // Deduct wager from user balance
      await supabase.rpc('update_balance', {
        user_id: user.id,
        amount: -game.wager_amount
      });
      
      // Open the coinflip modal
      onOpenCoinflipModal(game);
      
      // Execute the coinflip (this would be server-side in a real app)
      setTimeout(() => {
        executeCoinflip(game);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelGame = async (gameId) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
        
      if (gameError) throw gameError;
      
      // Verify this is the creator's game
      if (game.player1_id !== user.id) {
        throw new Error('You can only cancel games you created');
      }
      
      // Verify game is still in pending status
      if (game.status !== 'pending') {
        throw new Error('Only pending games can be canceled');
      }
      
      // Delete the game
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);
        
      if (deleteError) throw deleteError;
      
      // Refund wager to user balance
      await supabase.rpc('update_balance', {
        user_id: user.id,
        amount: game.wager_amount
      });
      
      // Immediately update the UI by removing the cancelled game from the local state
      setGames(games.filter(g => g.id !== gameId));
      
      console.log('Game canceled successfully:', gameId);
      
    } catch (err) {
      console.error('Cancel game error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeCoinflip = async (game) => {
    try {
      // Simple 50/50 random for frontend demonstration
      // In a real app, this would be handled by a secure server-side function
      const winnerId = Math.random() < 0.5 ? game.player1_id : game.player2_id;
      const winnerAmount = game.wager_amount * 2;
      
      // Update game status
      await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString()
        })
        .eq('id', game.id);
      
      // Update winner balance
      await supabase.rpc('update_balance', {
        user_id: winnerId,
        amount: winnerAmount
      });
      
      // Notify parent component
      onGameComplete({
        ...game,
        winner_id: winnerId
      });
    } catch (error) {
      console.error('Error executing coinflip:', error);
    }
  };

  const formatSatoshis = (satoshis) => {
    return `₿ ${satoshis.toLocaleString('en-US').replace(/,/g, ' ')}`;
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: '96px auto 0',
    padding: '24px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px'
  };

  const buttonStyle = {
    padding: '12px 24px',
    backgroundColor: '#22c55e',
    color: 'white',
    borderRadius: '4px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading || !user ? 0.5 : 1
  };

  const joinButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer'
  };
  
  const gameItemStyle = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: '16px'
  };

  const cancelButtonStyle = {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '8px'
  };

  // Add a new function to handle user record repair
  const repairUserRecord = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('Attempting to repair user account...');
    
    // Helper function to generate a BTC address
    const generateMockBtcAddress = () => {
      return 'bc1' + Array(40).fill(0).map(() => 
        '0123456789abcdef'[Math.floor(Math.random() * 16)]
      ).join('');
    };
    
    try {
      console.log('Repairing user record for:', user.id);
      
      // Generate a new mock BTC address
      const mockAddress = generateMockBtcAddress();
      console.log('Generated mock BTC address for repair:', mockAddress);
      
      // First try to delete any problematic records (if permissions allow)
      try {
        await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
        
        console.log('Deleted existing user record');
      } catch (err) {
        console.log('Could not delete user record, will try to create/update instead');
      }
      
      // Create a fresh user record
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          btc_address: mockAddress, // Use generated address
          balance: 0
        });
        
      if (insertError) {
        console.error('Error creating fresh user record:', insertError);
        
        // If insert failed, try an update
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: user.email,
            btc_address: mockAddress, // Use generated address
            balance: 0
          })
          .eq('id', user.id);
          
        if (updateError) {
          throw new Error('Could not repair user record');
        }
      }
      
      // Verify the user record
      const { data, error } = await supabase
        .from('users')
        .select('id, balance, btc_address')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      console.log('User record repaired successfully:', data);
      setError('User account repaired! You can now create games.');
      
      // Wait a moment and clear the error
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Error repairing user record:', err);
      setError(`Failed to repair user account: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Bitcoin Coinflip</h1>
        
        {/* Wager Input */}
        <div style={{ marginBottom: '24px' }}>
          <input 
            type="number" 
            id="wager-amount" 
            style={{ 
              border: '1px solid #d1d5db', 
              padding: '8px', 
              borderRadius: '4px',
              marginRight: '8px'
            }}
            placeholder="Enter amount in satoshis"
            min={MIN_WAGER}
            max={MAX_WAGER}
            value={wagerAmount}
            onChange={(e) => setWagerAmount(e.target.value)}
            disabled={loading || !user}
          />
          <span>₿</span>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c', 
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div>{error}</div>
            
            {/* Show repair button for user verification errors */}
            {error.includes('verify') && (
              <button
                onClick={repairUserRecord}
                disabled={loading}
                style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                Repair My Account
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <button 
          onClick={createGame}
          disabled={loading || !user}
          style={buttonStyle}
        >
          Create Game
        </button>

        {/* Games List */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Active Games</h2>
          
          {games.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No active games. Create one!</p>
          ) : (
            <div>
              {games.map((game) => (
                <div 
                  key={game.id} 
                  style={gameItemStyle}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold' }}>{formatSatoshis(game.wager_amount)}</span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      Created {new Date(game.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    {game.player1_id === user?.id ? (
                      <button
                        onClick={() => cancelGame(game.id)}
                        disabled={loading}
                        style={{
                          ...cancelButtonStyle,
                          opacity: loading ? 0.5 : 1
                        }}
                      >
                        Cancel Game
                      </button>
                    ) : (
                      <button
                        onClick={() => joinGame(game.id)}
                        disabled={loading}
                        style={{
                          ...joinButtonStyle,
                          opacity: loading ? 0.5 : 1
                        }}
                      >
                        Join Game
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInterface; 