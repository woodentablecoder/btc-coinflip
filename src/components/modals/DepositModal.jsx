import React, { useState, useEffect } from 'react';
import supabase from '../../supabase';

const DepositModal = ({ isOpen, userId, onClose, onDeposit }) => {
  const [btcAddress, setBtcAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');

  // In a real app, this would be handled differently with actual blockchain integration
  // This is just a simulation for the demo
  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          // First make sure the user exists in the database
          await ensureUserExists();
          
          // Get user BTC address
          const { data, error } = await supabase
            .from('users')
            .select('btc_address')
            .eq('id', userId)
            .single();

          if (error) throw error;

          // If user has no BTC address, generate one (for demo purposes)
          if (!data.btc_address) {
            const mockAddress = generateMockBtcAddress();
            
            await supabase
              .from('users')
              .update({ btc_address: mockAddress })
              .eq('id', userId);
              
            setBtcAddress(mockAddress);
          } else {
            setBtcAddress(data.btc_address);
          }
        } catch (err) {
          console.error('Error in fetchUserData:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [isOpen, userId]);

  // Helper function to ensure user exists in the database
  const ensureUserExists = async () => {
    if (!userId) return false;
    
    try {
      console.log('Ensuring user exists in database:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('id, btc_address')
        .eq('id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        console.log('User not found in database, creating record');
        
        // Get user email from auth
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          console.error('No authenticated user found');
          return false;
        }
        
        // Generate a mock BTC address instead of null
        const mockAddress = generateMockBtcAddress();
        console.log('Generated mock BTC address for new user:', mockAddress);
        
        // Create user record with the mock address
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: authData.user.email,
            btc_address: mockAddress, // Use generated address instead of null
            balance: 0
          });
          
        if (insertError) {
          console.error('Error creating user record:', insertError);
          return false;
        }
        
        console.log('Successfully created user with BTC address');
        return true;
      }
      
      return !!data;
    } catch (err) {
      console.error('Error ensuring user exists:', err);
      return false;
    }
  };

  // For demo purposes only
  const generateMockBtcAddress = () => {
    return 'bc1' + Array(40).fill(0).map(() => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
  };

  const handleSimulateDeposit = async () => {
    if (!depositAmount || isNaN(parseInt(depositAmount))) {
      setError('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First ensure user exists in the database
      const userExists = await ensureUserExists();
      if (!userExists) {
        setError('Failed to verify your account. Please refresh and try again.');
        setLoading(false);
        return;
      }
      
      const satoshis = parseInt(depositAmount);
      
      // In a real app, we would wait for blockchain confirmation
      // For this demo, we'll simulate an instant deposit
      
      // Update user balance
      await supabase.rpc('update_balance', {
        user_id: userId,
        amount: satoshis
      });
      
      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: satoshis,
          type: 'deposit',
          status: 'completed',
          tx_hash: 'mock_tx_' + Math.random().toString(36).substring(2, 15)
        });
      
      // Notify parent component
      onDeposit(satoshis);
      
      // Reset form
      setDepositAmount('');
      
      // Close modal after 1 second
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Deposit Bitcoin</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <p className="mb-2 font-medium">Your Deposit Address:</p>
          <div className="p-3 bg-gray-100 rounded break-all font-mono text-sm">
            {loading ? 'Loading...' : btcAddress}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            In a real app, you would send BTC to this address to fund your account.
          </p>
        </div>
        
        <div className="mb-6">
          <p className="mb-2 font-medium">Simulation (Demo Only):</p>
          <div className="flex">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Satoshis to deposit"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleSimulateDeposit}
              disabled={loading}
              className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Simulate Deposit'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepositModal; 