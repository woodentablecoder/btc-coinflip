import React from "react";
import supabase from "../supabase";

const Header = ({ user, balance, onOpenDepositModal, onOpenWithdrawModal }) => {
  const formatBalance = (balanceInSatoshis) => {
    // Format the balance with space separators as per spec
    return `₿ ${
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
        width: "100%",
        backgroundColor: "#1A1C24",
        color: "white",
        padding: "12px 24px",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        ...baseStyle,
      }}
    >
      {/* Left Section: Menu */}
      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
        {/* Navigation Links */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              padding: "8px 16px",
              fontWeight: "bold",
              cursor: "pointer",
              ...baseStyle,
            }}
          >
            Coinflip
          </div>
        </div>
      </div>

      {/* Center Section - Empty to create space */}
      <div style={{ flex: 1 }}></div>

      {/* Right Section */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        {/* Deposit Button */}
        <button
          onClick={onOpenDepositModal}
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#5BCA8B",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "10px 16px",
            fontWeight: "bold",
            cursor: "pointer",
            ...baseStyle,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            style={{ marginRight: "8px" }}
          >
            <path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-2 0H3V6h14v8zm-7-7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm13 0v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" />
          </svg>
          Deposit
        </button>

        {/* Balance Display */}
        <div
          style={{
            margin: "0px 30px",
            fontSize: "15px",
            fontWeight: "400",
            color: "white",
            ...baseStyle,
          }}
        >
          {formatBalance(balance || 0)}
        </div>

        {/* User Profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            ...baseStyle,
          }}
        >
          <div
            style={{
              width: "32px",
              marginRight: "6px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#5BCA8B",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <span style={{ marginRight: "40px" }}>
            {user ? user.email.split("@")[0] : "AlexRooster"}
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </div>
      </div>
    </nav>
  );
};

export default Header;
