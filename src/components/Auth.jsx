import React, { useState } from 'react';
import supabase from '../supabase';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true); // Default to sign-up mode
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    // Prevent default browser form submission
    e.preventDefault();
    console.log('Form submission started');
    
    // Validation check
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      console.log('Starting authentication process:', isSignUp ? 'Sign Up' : 'Sign In');
      
      if (isSignUp) {
        // Sign up
        console.log('Attempting to sign up with:', email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        console.log('Sign up response:', data ? 'Success' : 'Failed');
        
        if (error) {
          console.error('Sign up error:', error);
          throw error;
        }
        
        // Show a success message if no errors
        if (!error) {
          setError('Check your email for the confirmation link');
        }
      } else {
        // Sign in
        console.log('Attempting to sign in with:', email);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Sign in error:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Alternative handler for direct button click
  const handleButtonClick = () => {
    console.log('Button clicked directly');
    // Manually trigger form submission
    const form = document.querySelector('form');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '90vh',
      padding: '20px'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            {isSignUp ? 'Create an account' : 'Sign in to your account'}
          </h1>
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#2563eb', 
                marginLeft: '5px',
                padding: '0',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
        
        {error && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c', 
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="email" style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500' 
            }}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: '500' 
            }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          
          <div>
            <button
              type="submit"
              onClick={handleButtonClick}
              disabled={loading}
              style={{ 
                width: '100%', 
                backgroundColor: '#2563eb', 
                color: 'white', 
                padding: '10px',
                borderRadius: '4px',
                opacity: loading ? '0.5' : '1',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth; 