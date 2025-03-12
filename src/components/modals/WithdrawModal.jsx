import React, { useState, useEffect } from 'react';
import supabase from '../../supabase';

const WithdrawModal = ({ isOpen, userId, userBalance, onClose, onWithdraw }) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setWithdrawAmount('');
      setDestinationAddress('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleWithdraw = async () => {
    // Form validation
    if (!withdrawAmount || isNaN(parseInt(withdrawAmount))) {
      setError('Please enter a valid withdrawal amount');
      return;
    }
    
    if (!destinationAddress) {
      setError('Please enter a destination Bitcoin address');
      return;
    }
    
    const satoshis = parseInt(withdrawAmount);
    
    // Check if user has enough balance
    if (satoshis > userBalance) {
      setError(`Insufficient balance. You have ₿ ${userBalance.toLocaleString('en-US').replace(/,/g, ' ')}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would initiate a blockchain transaction
      // For this demo, we'll simulate a withdrawal
      
      // Update user balance
      await supabase.rpc('update_balance', {
        user_id: userId,
        amount: -satoshis
      });
      
      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          amount: -satoshis,
          type: 'withdrawal',
          status: 'completed',
          tx_hash: 'mock_tx_' + Math.random().toString(36).substring(2, 15)
        });
      
      // Notify parent component
      onWithdraw(satoshis);
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setWithdrawAmount('');
      setDestinationAddress('');
      
      // Close modal after 2 seconds
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Withdraw Bitcoin</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            Withdrawal successful! Closing in a moment...
          </div>
        )}
        
        <div className="mb-4">
          <p className="mb-2 font-medium">Your Balance:</p>
          <div className="p-3 bg-gray-100 rounded font-mono">
            ₿ {userBalance.toLocaleString('en-US').replace(/,/g, ' ')}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium">Withdrawal Amount (satoshis):</label>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount to withdraw"
            className="w-full p-2 border rounded"
            disabled={loading || success}
          />
        </div>
        
        <div className="mb-6">
          <label className="block mb-2 font-medium">Bitcoin Address:</label>
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="Enter destination Bitcoin address"
            className="w-full p-2 border rounded font-mono text-sm"
            disabled={loading || success}
          />
          <p className="mt-1 text-sm text-gray-600">
            In a real app, this would withdraw actual BTC to this address.
          </p>
        </div>
        
        <div className="flex justify-between">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleWithdraw}
            disabled={loading || success}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Withdraw Bitcoin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal; 