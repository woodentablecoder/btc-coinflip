import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabase';

const UserProfile = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Fetch the user's profile data
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('users')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatar) return null;
    
    try {
      // Create a unique file path for the avatar
      const filePath = `avatars/${user.id}/${Date.now()}_${avatar.name}`;
      
      // Upload the avatar to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, avatar, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (error) throw error;
      
      // Get the public URL for the uploaded avatar
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Avatar upload failed');
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      let avatarUrl = null;
      
      // Upload avatar if a new one was selected
      if (avatar) {
        avatarUrl = await uploadAvatar();
        if (!avatarUrl) {
          setError('Failed to upload avatar');
          setLoading(false);
          return;
        }
      }
      
      // Prepare update data
      const updates = {
        username: username
      };
      
      // Only include avatar_url in updates if a new avatar was uploaded
      if (avatarUrl) {
        updates.avatar_url = avatarUrl;
      }
      
      // Update the user's profile in the database
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '90vh',
      padding: '20px',
      paddingTop: '0',
      color: 'white'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '500px',
        padding: '30px',
        backgroundColor: 'rgba(28, 28, 35, 0.8)',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(5px)'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          marginBottom: '30px',
          textAlign: 'center',
          color: '#4dabf5'
        }}>
          Your Profile
        </h1>
        
        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(220, 38, 38, 0.2)', 
            color: '#ef4444', 
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid rgba(220, 38, 38, 0.3)'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(16, 185, 129, 0.2)', 
            color: '#10b981', 
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Avatar Upload Section */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{ 
              width: '120px', 
              height: '120px', 
              borderRadius: '50%',
              backgroundColor: '#8a2be2',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              margin: '0 auto 16px auto',
              border: '3px solid rgba(255, 255, 255, 0.2)'
            }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg viewBox="0 0 24 24" width="50" height="50" fill="#ffffff">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            
            <label htmlFor="avatar-upload" style={{ 
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: 'rgba(79, 70, 229, 0.7)',
              color: 'white',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontFamily: "'GohuFontuni11NerdFont', monospace"
            }}>
              Change Picture
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Username Input */}
          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="username" style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              fontSize: '16px'
            }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter a username"
              style={{ 
                width: '100%', 
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px'
              }}
            />
            <p style={{ 
              marginTop: '8px', 
              fontSize: '14px', 
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              This is how other players will see you
            </p>
          </div>
          
          {/* Bitcoin Address (Read-only) */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ 
              marginBottom: '8px', 
              fontWeight: '500',
              fontSize: '16px' 
            }}>
              Email Address
            </h3>
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '16px',
              fontFamily: "'GohuFontuni11NerdFont', monospace"
            }}>
              {user?.email || 'No email address'}
            </div>
          </div>
          
          {/* Submit Button */}
          <div style={{ marginTop: '30px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', 
                backgroundColor: '#4dabf5', 
                color: 'white', 
                padding: '14px',
                borderRadius: '8px',
                opacity: loading ? '0.7' : '1',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                border: 'none',
                transition: 'all 0.2s',
                fontFamily: "'GohuFontuni11NerdFont', monospace"
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile; 