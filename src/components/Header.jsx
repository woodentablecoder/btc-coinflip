import React from 'react';
import supabase from '../supabase';

const Header = ({ user, balance, onOpenDepositModal, onOpenWithdrawModal }) => {
  const formatBalance = (balanceInSatoshis) => {
    // Format the balance with space separators as per spec
    return `₿ ${balanceInSatoshis.toLocaleString('en-US').replace(/,/g, ' ')}`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    marginLeft: '8px'
  };

  return (
    <nav style={{ 
      position: 'fixed', 
      width: '100%', 
      backgroundColor: '#1f2937', 
      color: 'white', 
      padding: '16px',
      zIndex: 10
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Coinflip</div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span id="user-balance" style={{ marginRight: '16px' }}>
              {formatBalance(balance || 0)}
            </span>
            <button
              onClick={onOpenDepositModal}
              style={{ ...buttonStyle, backgroundColor: '#3b82f6' }}
            >
              Deposit
            </button>
            <button
              onClick={onOpenWithdrawModal}
              style={{ ...buttonStyle, backgroundColor: '#dc2626' }}
            >
              Withdraw
            </button>
            <button
              onClick={handleSignOut}
              style={{ ...buttonStyle, backgroundColor: '#4b5563' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <span style={{ marginRight: '16px' }}>Sign in to play</span>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header; 