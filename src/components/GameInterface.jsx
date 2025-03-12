import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const GameInterface = ({ user, onGameComplete, onOpenCoinflipModal }) => {
  const [wagerAmount, setWagerAmount] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executedGames, setExecutedGames] = useState(new Set());

  const MIN_WAGER = 100; // ₿ 100 satoshis
  const MAX_WAGER = 100000000; // ₿ 100 000 000 satoshis

  // Function to check Supabase realtime status
  const checkRealtimeStatus = async () => {
    try {
      console.log('Checking Supabase realtime status...');
      // Create a test channel with a simple listener
      const testChannel = supabase.channel('test-connection');
      testChannel
        .on('system', { event: '*' }, (payload) => {
          console.log('Supabase realtime system event:', payload);
        })
        .subscribe((status) => {
          console.log('Test channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime connection is working');
          } else {
            console.warn('⚠️ Realtime connection issue:', status);
          }
          // Cleanup test channel after status check
          setTimeout(() => supabase.removeChannel(testChannel), 5000);
        });
    } catch (error) {
      console.error('Error checking realtime status:', error);
    }
  };

  // Fetch active games
  useEffect(() => {
    if (!user) return;

    // Test the realtime connection
    checkRealtimeStatus();

    const fetchGames = async () => {
      try {
        console.log('Fetching active games...');
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching games:', error);
          return;
        }

        console.log(`Found ${data?.length || 0} active games:`, data);
        setGames(data || []);
        
        // IMPORTANT: Check for active games that involve this user
        // This is the key fix for ensuring coinflip shows for both players
        const { data: activeGames, error: activeError } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'active')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .is('completed_at', null);
          
        if (!activeError && activeGames && activeGames.length > 0) {
          console.log('Found active game the user is involved in!', activeGames[0]);
          
          // Show the coinflip for this active game
          onOpenCoinflipModal(activeGames[0]);
          
          // Execute the coinflip
          setTimeout(() => {
            console.log('Executing coinflip for active game:', activeGames[0].id);
            executeCoinflip(activeGames[0]);
          }, 3000);
        }
      } catch (err) {
        console.error('Error in fetchGames:', err);
      }
    };

    // Initial fetch
    fetchGames();

    // Subscribe to changes - using a more specific channel name
    const channelName = 'games-changes';
    
    console.log(`Setting up realtime subscription with channel: ${channelName}`);
    
    // Create a single channel with multiple event listeners
    const gamesSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'games'
          }, 
          (payload) => {
            console.log('Game INSERT detected:', payload);
            // Add the new game to the list if it's pending
            if (payload.new?.status === 'pending') {
              console.log('Adding new game to UI:', payload.new.id);
              setGames(prevGames => {
                // Check if the game already exists in the list to avoid duplicates
                const exists = prevGames.some(g => g.id === payload.new.id);
                if (!exists) {
                  return [payload.new, ...prevGames];
                }
                return prevGames;
              });
            } else {
              console.log('Ignoring non-pending INSERT event');
            }
          })
      .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public', 
            table: 'games'
          },
          (payload) => {
            console.log('Game UPDATE detected:', payload);
            if (!payload.new) {
              console.warn('Update payload missing .new property');
              return;
            }
            
            // Extra debugging for game state changes
            console.log('Game state change:', {
              oldStatus: payload.old?.status,
              newStatus: payload.new.status,
              currentUserId: user?.id,
              player1Id: payload.new.player1_id,
              player2Id: payload.new.player2_id,
              isCreator: payload.new.player1_id === user?.id,
              isJoiner: payload.new.player2_id === user?.id
            });
            
            // If game status changed from pending to active
            if (payload.new.status === 'active' && payload.old?.status === 'pending') {
              // Check if current user is involved in this game (either creator or joiner)
              if (payload.new.player1_id === user?.id || payload.new.player2_id === user?.id) {
                console.log('Game joined, showing coinflip to player:', {
                  gameId: payload.new.id,
                  isCreator: payload.new.player1_id === user?.id,
                  isJoiner: payload.new.player2_id === user?.id
                });
                
                // Show the coinflip modal
                onOpenCoinflipModal(payload.new);
                
                // Execute the coinflip after a delay
                setTimeout(() => {
                  console.log('Executing coinflip for game:', payload.new.id);
                  executeCoinflip(payload.new);
                }, 3000);
              }
            }
            
            // Remove games that are no longer pending
            if (payload.new.status !== 'pending') {
              console.log('Removing game that is no longer pending:', payload.new.id);
              setGames(prevGames => prevGames.filter(g => g.id !== payload.new.id));
            } 
            // Update game data if it's still pending
            else {
              console.log('Updating existing pending game:', payload.new.id);
              setGames(prevGames => {
                const gameExists = prevGames.some(g => g.id === payload.new.id);
                if (gameExists) {
                  return prevGames.map(g => g.id === payload.new.id ? payload.new : g);
                } else {
                  // If the game doesn't exist but should be in the list, add it
                  return [payload.new, ...prevGames];
                }
              });
            }
          })
      .on('postgres_changes',
          {
            event: 'DELETE',
            schema: 'public', 
            table: 'games'
          },
          (payload) => {
            console.log('Game DELETE detected:', payload);
            if (payload.old?.id) {
              console.log('Removing deleted game from UI:', payload.old.id);
              setGames(prevGames => prevGames.filter(g => g.id !== payload.old.id));
            } else {
              console.warn('Delete payload missing .old.id property');
            }
          })
      .subscribe((status, err) => {
        if (err) {
          console.error(`Error subscribing to ${channelName}:`, err);
        }
        
        console.log(`Subscription status for ${channelName}:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Successfully subscribed to ${channelName}`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⚠️ Subscription timed out for ${channelName}`);
          // Fallback to polling if subscription times out
          const intervalId = setInterval(fetchGames, 500);
          return () => clearInterval(intervalId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Channel error for ${channelName}`);
          // Fallback to polling on channel error
          const intervalId = setInterval(fetchGames, 500);
          return () => clearInterval(intervalId);
        } else if (status !== 'SUBSCRIBED') {
          console.warn(`⚠️ Unexpected subscription status for ${channelName}: ${status}`);
          // Fallback to polling if subscription fails
          const intervalId = setInterval(fetchGames, 500);
          return () => clearInterval(intervalId);
        }
      });

    // Fallback: Set up periodic polling even if subscription seems to work
    // This ensures we always have up-to-date data even if realtime events are missed
    const pollIntervalId = setInterval(fetchGames, 830);

    // Cleanup subscription and polling on unmount
    return () => {
      console.log(`Cleaning up realtime subscription for ${channelName}`);
      supabase.removeChannel(gamesSubscription);
      clearInterval(pollIntervalId);
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
      
      // Manually add the new game to the UI for immediate feedback
      // This ensures the UI updates even if the subscription is delayed
      setGames(prevGames => [data, ...prevGames]);
      
      setWagerAmount('');

      // Set up a special listener just for this game to detect when it becomes active
      console.log('Setting up special listener for created game:', data.id);
      const createdGameChannel = supabase
        .channel(`game-${data.id}-status`)
        .on('postgres_changes', 
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'games',
              filter: `id=eq.${data.id}`
            },
            (payload) => {
              console.log('Special creator channel detected update for game:', {
                gameId: payload.new.id,
                oldStatus: payload.old?.status,
                newStatus: payload.new.status
              });
              
              // If game becomes active, show the coinflip to the creator
              if (payload.new.status === 'active' && payload.old?.status === 'pending') {
                console.log('Creator detected game joined, showing coinflip:', payload.new.id);
                
                // Close the channel as we don't need it anymore
                supabase.removeChannel(createdGameChannel);
                
                // Show the coinflip modal to the creator
                onOpenCoinflipModal(payload.new);
                
                // Execute the coinflip
                setTimeout(() => {
                  console.log('Creator executing coinflip for game:', payload.new.id);
                  executeCoinflip(payload.new);
                }, 3000);
              }
            })
        .subscribe((status) => {
          console.log(`Special creator channel subscription status for game ${data.id}:`, status);
        });
        
      // Clean up this special channel after 5 minutes if no one joins
      setTimeout(() => {
        supabase.removeChannel(createdGameChannel);
        console.log('Cleaned up special creator channel for game:', data.id);
      }, 300000); // 5 minutes
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
      console.log('Starting to join game:', gameId);
      // Get the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
        
      if (gameError) throw gameError;
      
      console.log('Retrieved game details:', {
        gameId: game.id,
        status: game.status,
        creator: game.player1_id,
        joiner: game.player2_id
      });
      
      // Check if game is still available to join
      if (game.status !== 'pending') {
        throw new Error('This game is no longer available to join');
      }
      
      if (game.player2_id) {
        throw new Error('This game already has a second player');
      }
      
      if (game.player1_id === user.id) {
        throw new Error('You cannot join your own game');
      }
      
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
      
      console.log('Attempting to join game:', gameId);
      
      // In production, we would use a serverless function or API endpoint here
      // to handle this state change atomically.
      // For now, we'll use the regular update but we know it can fail
      // due to RLS policy restrictions.
      const { error: updateError } = await supabase
        .from('games')
        .update({
          player2_id: user.id,
          status: 'active'
        })
        .eq('id', gameId);
        
      if (updateError) {
        console.error('Error updating game:', updateError);
        throw new Error('Permission denied: Cannot join game');
      }
      
      // Get the updated game
      const { data: updatedGame, error: getError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
        
      if (getError || !updatedGame) {
        throw new Error('Failed to get updated game data');
      }
      
      // Confirm the game was successfully updated
      if (updatedGame.status !== 'active' || updatedGame.player2_id !== user.id) {
        throw new Error('Failed to join game - another player may have joined');
      }
      
      // Deduct wager from user balance
      await supabase.rpc('update_balance', {
        user_id: user.id,
        amount: -game.wager_amount
      });
      
      // IMPORTANT: Create a notification for the creator in the database
      // This is a fallback to ensure the creator gets notified even if realtime fails
      try {
        console.log('Creating notification for game creator:', updatedGame.player1_id);
        await supabase
          .from('notifications')
          .insert({
            user_id: updatedGame.player1_id,
            type: 'game_joined',
            data: updatedGame,
            is_read: false
          });
      } catch (err) {
        // Non-fatal error, just log it
        console.warn('Failed to create creator notification:', err);
      }
      
      // Open the coinflip modal with the updated game data
      console.log('Joiner directly opening coinflip modal for game:', {
        gameId: updatedGame.id,
        player1: updatedGame.player1_id,
        player2: updatedGame.player2_id,
        status: updatedGame.status
      });
      onOpenCoinflipModal(updatedGame);
      
      // Execute the coinflip (this would be server-side in a real app)
      setTimeout(() => {
        console.log('Joiner directly executing coinflip for game:', updatedGame.id);
        executeCoinflip(updatedGame);
      }, 3000);
    } catch (err) {
      console.error('Join game error:', err);
      setError(err.message || 'Failed to join game');
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
      
      // Mark the game as 'completed'
      const { error: updateError } = await supabase
        .from('games')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', gameId);
        
      if (updateError) {
        console.error('Failed to update game status:', updateError);
        throw updateError;
      }
      
      // Refund wager to user balance
      await supabase.rpc('update_balance', {
        user_id: user.id,
        amount: game.wager_amount
      });
      
      // Manually remove the game from the UI for immediate feedback
      // This ensures the UI updates even if the subscription is delayed
      setGames(prevGames => prevGames.filter(g => g.id !== gameId));
      
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
      // Check if this game has already been executed to prevent duplicates
      if (executedGames.has(game.id)) {
        console.log(`Game ${game.id} already executed, skipping duplicate execution`);
        return;
      }
      
      // Mark this game as being executed
      setExecutedGames(prev => new Set([...prev, game.id]));
      
      console.log(`Executing coinflip for game ${game.id}`);
      
      // First check if the game has already been completed by someone else
      const { data: existingGame, error: getError } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single();
        
      if (getError) {
        console.error('Error checking game status:', getError);
        return;
      }
      
      // If the game is already completed, use the existing winner
      if (existingGame.status === 'completed' && existingGame.winner_id) {
        console.log(`Game ${game.id} already completed, winner: ${existingGame.winner_id}`);
        
        // Notify parent component with the existing result
        onGameComplete({
          ...game,
          winner_id: existingGame.winner_id
        });
        
        return;
      }
      
      // IMPORTANT: To ensure consistent results across clients, use a deterministic approach
      // We'll use the sum of player IDs and the game ID as a seed for "randomness"
      // In a real app, this would be handled by a secure server-side function
      const seed = game.id.charCodeAt(0) + game.player1_id.charCodeAt(0) + (game.player2_id ? game.player2_id.charCodeAt(0) : 0);
      const isPlayer1Winner = seed % 2 === 0; // Even seed means player 1 wins
      const winnerId = isPlayer1Winner ? game.player1_id : game.player2_id;
      const winnerAmount = game.wager_amount * 2;
      
      console.log('Winner determination:', {
        seed,
        isPlayer1Winner,
        winnerId,
        player1Id: game.player1_id,
        player2Id: game.player2_id
      });
      
      // Update game status
      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString()
        })
        .eq('id', game.id);
        
      if (error) {
        console.error('Error updating game status:', error);
        return;
      }
      
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