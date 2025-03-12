import React, { useState, useEffect } from 'react';

const CoinflipModal = ({ isOpen, game, winner, onClose }) => {
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
                    <span style={{ color: '#16a34a' }}>
                      Player {game.player1_id === result ? '1' : '2'} wins!
                    </span>
                    <span style={{ display: 'block', marginTop: '8px' }}>
                      ₿ {(game.wager_amount * 2).toLocaleString('en-US').replace(/,/g, ' ')}
                    </span>
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