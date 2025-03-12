import React, { useState, useEffect } from 'react';

const CoinflipModal = ({ isOpen, game, winner, currentUserId, onClose }) => {
  const [flipping, setFlipping] = useState(true);
  const [result, setResult] = useState(null);
  
  useEffect(() => {
    if (isOpen) {
      // Start the animation
      setFlipping(true);
      
      // After 3 seconds, show the result
      const timer = setTimeout(() => {
        setFlipping(false);
        setResult(winner);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, winner]);

  if (!isOpen) return null;

  const modalOverlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  };

  const coinStyle = {
    width: '128px',
    height: '128px',
    borderRadius: '50%',
    backgroundColor: '#fbbf24',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: flipping ? 'spin 1s linear infinite' : 'none'
  };

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '4px',
    cursor: flipping ? 'not-allowed' : 'pointer',
    opacity: flipping ? 0.5 : 1
  };

  // Determine if the current user is the winner
  const isUserWinner = result && currentUserId && (currentUserId === result);
  const isUserInvolved = currentUserId && game && (game.player1_id === currentUserId || game.player2_id === currentUserId);
  
  // Debug output
  console.log('CoinflipModal winner determination:', {
    currentUserId,
    winnerId: result,
    isUserWinner,
    isUserInvolved,
    player1: game?.player1_id,
    player2: game?.player2_id
  });

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Coinflip in Progress
        </h2>
        
        <div style={{ margin: '32px 0', display: 'flex', justifyContent: 'center' }}>
          {flipping ? (
            <div style={{
              ...coinStyle,
              transition: 'transform 0.5s',
              transform: `rotate(${Date.now() % 360}deg)`
            }}>
              <div style={{ fontSize: '30px' }}>₿</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{...coinStyle, animation: 'none'}}>
                <div style={{ fontSize: '30px' }}>₿</div>
              </div>
              <p style={{ marginTop: '16px', fontSize: '20px', fontWeight: 'bold' }}>
                {result ? (
                  <>
                    {!isUserInvolved && (
                      <span style={{ color: '#16a34a', marginBottom: '8px', display: 'block' }}>
                        Player {game.player1_id === result ? '1' : '2'} wins!
                      </span>
                    )}
                    
                    {isUserInvolved && !isUserWinner ? (
                      <span style={{ color: '#dc2626' }}>
                        Lost: ₿ {game.wager_amount.toLocaleString('en-US').replace(/,/g, ' ')}
                      </span>
                    ) : (
                      <span style={{ color: isUserWinner ? '#16a34a' : 'inherit' }}>
                        {isUserWinner ? 'Won: ' : 'Prize: '}
                        ₿ {(game.wager_amount * 2).toLocaleString('en-US').replace(/,/g, ' ')}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: '#dc2626' }}>Waiting for result...</span>
                )}
              </p>
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          disabled={flipping}
          style={buttonStyle}
        >
          {flipping ? 'Flipping...' : 'Close'}
        </button>
      </div>
    </div>
  );
};

export default CoinflipModal; 