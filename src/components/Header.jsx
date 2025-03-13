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

  const handleCoinflipClick = (e) => {
    e.preventDefault();
    console.log("Coinflip link clicked, navigating to /coinflip");
    navigate("/coinflip");
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        backgroundColor: "transparent",
        color: "white",
        padding: "12px 24px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        ...baseStyle,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
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
        
        {user && (
          <div style={{ display: "flex", gap: "20px" }}>
            <Link
              to="/"
              style={{
                color: "#f8fafc",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Home
            </Link>
            <Link
              to="/coinflip"
              onClick={handleCoinflipClick}
              style={{
                color: "#f8fafc",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Coinflip
            </Link>
          </div>
        )}
      </div>

      {/* Left Section - User Profile */}
      <div
        ref={userMenuRef}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          onClick={toggleUserMenu}
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "1px solid white",
              backgroundColor: "transparent", 
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              padding: "6px 6px",
            }}
          >
            <img
              src="/images/icon.png"
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          {/* Dropdown Arrow */}
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="white" 
            style={{ marginLeft: "6px" }}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <div style={{
            position: "absolute",
            top: "45px",
            left: "0", // Changed from right to left
            backgroundColor: "rgba(28, 28, 35, 0.95)",
            borderRadius: "8px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
            minWidth: "180px",
            zIndex: 1001,
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
              Profile
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
                fontFamily: "'GohuFontuni11NerdFont', monospace",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)"
                }
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white" style={{ marginRight: "10px" }}>
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Right Section - Balance and Admin */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Balance Display */}
        <div
          style={{
            marginRight: "16px",
            padding: "8px 12px",
            backgroundColor: "rgba(59, 251, 130, 0.1)", 
            color: "#3BFB82",
            borderRadius: "4px",
            cursor: "pointer",
            border: "1px solid rgba(59, 251, 130, 0.3)",
            ...baseStyle,
          }}
          onClick={onOpenDepositModal}
        >
          ₿ {formatBalance(balance || 0)}
        </div>

        {/* Admin Button (Hidden by default, only visible for admin users) */}
        {user && userIsAdmin && (
          <Link
            to="/admin"
            style={{
              fontSize: "20px",
              color: "white",
              textDecoration: "none",
              fontWeight: "400",
              padding: "8px 16px",
              backgroundColor: 'transparent',
              border: "1px solid white",
              ...baseStyle,
            }}
          >
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Header;
