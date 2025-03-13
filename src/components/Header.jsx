import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabase";
import { isAdmin } from "../utils/adminUtils.jsx";

const Header = ({ user, balance, onOpenDepositModal, onOpenWithdrawModal }) => {
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const adminCheckAttempts = useRef(0);
  const navigate = useNavigate();

  console.log("Header rendering, user:", user?.id);

  // Enhanced admin status check that includes retries and debugging
  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      console.log("Checking admin status for user:", user.id);
      adminCheckAttempts.current += 1;
      
      const adminStatus = await isAdmin();
      console.log("Admin status result:", adminStatus, "Attempt:", adminCheckAttempts.current);
      
      setUserIsAdmin(adminStatus);
      
      // If admin status is false but we've checked fewer than 3 times, try again after a delay
      if (!adminStatus && adminCheckAttempts.current < 3) {
        console.log("Will retry admin check in 2 seconds...");
        setTimeout(checkAdminStatus, 2000);
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
    }
  };

  // Primary effect to check admin status when user changes
  useEffect(() => {
    if (user) {
      adminCheckAttempts.current = 0; // Reset attempt counter when user changes
      checkAdminStatus();
    } else {
      setUserIsAdmin(false);
    }
  }, [user]);

  // Secondary effect to periodically recheck admin status
  useEffect(() => {
    if (!user) return;
    
    // Set up periodic rechecking of admin status
    const interval = setInterval(() => {
      console.log("Performing periodic admin status check");
      adminCheckAttempts.current = 0; // Reset for periodic checks
      checkAdminStatus();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatBalance = (balanceInSatoshis) => {
    // Format the balance with space separators as per spec
    return `${
      balanceInSatoshis
        ? balanceInSatoshis.toLocaleString("en-US").replace(/,/g, " ")
        : "0"
    }`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Base font style to apply throughout the navbar
  const baseStyle = {
    fontFamily: "'GohuFontuni11NerdFont', monospace",
  };

  // Sidebar component with chat section
  const Sidebar = () => {
    return (
      <div style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "360px",
        backgroundColor: "rgba(16, 16, 20, 0.95)",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        color: "white",
        zIndex: 1000,
        ...baseStyle,
      }}>
        {/* Sidebar header with admin and profile */}
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
          {/* Admin Button */}
          {user && userIsAdmin && (
            <Link
              to="/admin"
              style={{
                display: "block",
                fontSize: "16px",
                color: "white",
                textDecoration: "none",
                fontWeight: "400",
                padding: "8px 12px",
                backgroundColor: 'transparent',
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "4px",
                marginBottom: "12px",
                textAlign: "center",
                ...baseStyle,
              }}
            >
              Admin
            </Link>
          )}
          
          {/* User Profile */}
          <div 
            ref={userMenuRef}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              padding: "8px 0",
            }}
            onClick={toggleUserMenu}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  backgroundColor: "transparent",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  marginRight: "8px",
                }}
              >
                <img
                  src="/images/icon.png"
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <span style={{ marginLeft: "8px", marginRight: "6px" }}>
                {user?.username || user?.email?.split('@')[0] || user?.id || "Account"}
              </span>
              {/* Dropdown Arrow */}
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="white"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>
          </div>
          
          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div style={{
              backgroundColor: "rgba(28, 28, 35, 0.95)",
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
              width: "100%",
              marginTop: "8px",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <Link 
                to="/profile"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  color: "white",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  transition: "background-color 0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)"
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white" style={{ marginRight: "10px" }}>
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                Edit Profile
              </Link>
              <button 
                onClick={handleSignOut}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: "12px 16px",
                  color: "white",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  fontFamily: "'GohuFontuni11NerdFont', monospace"
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="white" style={{ marginRight: "10px" }}>
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
          
          {/* Balance Display */}
          <div
            style={{
              fontSize: "16px",
              padding: "12px 0",
              marginTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              cursor: "pointer",
              ...baseStyle,
            }}
            onClick={onOpenDepositModal}
          >
            <span>Balance</span>
            <span style={{ color: "#F7931A" }}>₿ {formatBalance(balance || 0)}</span>
          </div>
        </div>
        
        {/* Chat Section */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          flex: 1,
          padding: "16px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}>
          <h3 style={{ 
            fontSize: "14px", 
            margin: "0 0 16px 0",
            color: "rgba(255, 255, 255, 0.7)",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            Chat
          </h3>
          
          {/* Chat messages area - empty skeleton */}
          <div style={{ 
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            marginBottom: "16px",
            fontSize: "14px",
          }}>
            <div style={{ 
              padding: "8px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: "8px",
              marginBottom: "8px",
              opacity: 0.6
            }}>
              Welcome to the chat!
            </div>
            
            <div style={{ 
              opacity: 0.4,
              textAlign: "center",
              padding: "20px 0",
              fontSize: "12px"
            }}>
              No messages yet
            </div>
          </div>
          
          {/* Chat input */}
          <div style={{ 
            display: "flex",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "16px"
          }}>
            <input
              type="text"
              placeholder="Type a message..."
              style={{
                flex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "none",
                padding: "10px 12px",
                borderRadius: "4px",
                color: "white",
                fontSize: "14px",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
                outline: "none"
              }}
            />
            <button
              style={{
                backgroundColor: "#F7931A",
                color: "white",
                border: "none",
                borderRadius: "4px",
                marginLeft: "8px",
                padding: "8px 12px",
                cursor: "pointer",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
                fontSize: "14px"
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar with chat */}
      <Sidebar />
      
      {/* Main navigation bar - only contains the logo now */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: "260px", // Account for sidebar width
          right: 0,
          backgroundColor: "transparent",
          color: "white",
          padding: "12px 24px",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          boxSizing: "border-box",
          ...baseStyle,
        }}
      >
        {/* Site Logo */}
        <Link
          to="/"
          style={{
            color: "#f8fafc",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "1.2rem",
          }}
        >
          SATOSHIFLIP
        </Link>
      </nav>
    </>
  );
};

export default Header;
