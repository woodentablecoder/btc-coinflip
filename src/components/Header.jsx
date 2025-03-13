import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import supabase from "../supabase";
import { isAdmin } from "../utils/adminUtils.jsx";

const Header = ({ user, balance, onOpenDepositModal, onOpenWithdrawModal }) => {
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      const checkAdminStatus = async () => {
        const adminStatus = await isAdmin();
        setUserIsAdmin(adminStatus);
      };

      checkAdminStatus();
    }
  }, [user]);

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
  };

  // Base font style to apply throughout the navbar
  const baseStyle = {
    fontFamily: "'DepartureMonoNerdFont-Regular', monospace",
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
      {/* Left Section - Scrappy Casino Logo/Title */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <Link
          to="/"
          style={{
            fontWeight: "bold",
            cursor: "pointer",
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            ...baseStyle,
          }}
        >
          <span style={{ color: "white", fontSize: "22px" }}>satoshi</span>
          <span style={{ color: "#4dabf5", fontStyle: "italic", fontSize: "22px", marginLeft: "4px" }}>flip</span>
        </Link>
      </div>

      

      {/* Right Section - Balance and Profile */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Balance Display */}
        <div
          onClick={onOpenDepositModal}
          style={{
            display: "flex",
            alignItems: "center",
            marginRight: "16px",
            fontSize: "15px",
            fontWeight: "400",
            color: "black",
            background: "rgba(255, 255, 255, 0.2)",
            padding: "8px 16px",
            borderRadius: "16px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            cursor: "pointer",
            transition: "all 0.2s",
            "&:hover": {
              background: "rgba(255, 255, 255, 0.25)",
            },
            ...baseStyle,
          }}
        >
          <span style={{ 
            display: "inline-flex",
            alignItems: "center", 
            justifyContent: "center", 
            backgroundColor: "#FFA500", 
            borderRadius: "50%", 
            width: "16px", 
            height: "16px",
            marginRight: "8px",
            fontSize: "12px"
          }}>₿</span>
          {formatBalance(balance || 0)}
        </div>

        {/* User Profile */}
        <div
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
              borderRadius: "50%",
              backgroundColor: "#8a2be2", // Purple color for avatar
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              padding: "6px 6px",
            }}
          >
            {user && user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
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

        {/* Admin Button (Hidden by default, only visible for admin users) */}
        {user && userIsAdmin && (
          <Link
            to="/admin"
            style={{
              color: "white",
              textDecoration: "none",
              marginLeft: "14px",
              fontWeight: "bold",
              padding: "8px 16px",
              backgroundColor: "#333740",
              borderRadius: "50px",
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
