import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabase";
import { isAdmin } from "../utils/adminUtils.jsx";

const Header = ({ user, balance, onOpenDepositModal, onOpenWithdrawModal }) => {
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(
    parseInt(localStorage.getItem('sidebarWidth')) || 300
  );
  const [isResizing, setIsResizing] = useState(false);
  const userMenuRef = useRef(null);
  const adminCheckAttempts = useRef(0);
  const sidebarRef = useRef(null);
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

  // Check window size and collapse sidebar accordingly
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1850) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidebar resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      // Calculate new width with boundaries (min 200px, max 500px)
      const newWidth = Math.max(350, Math.min(500, e.clientX));
      
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
      
      // Visual indicator while resizing
      if (sidebarRef.current) {
        sidebarRef.current.style.boxShadow = "0 0 15px rgba(247, 147, 26, 0.5)";
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      
      // Reset shadow when done resizing
      if (sidebarRef.current) {
        sidebarRef.current.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";
      }
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarRef]);

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

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    // If expanding the sidebar, load the stored width from localStorage
    if (sidebarCollapsed) {
      const storedWidth = parseInt(localStorage.getItem('sidebarWidth')) || 300;
      setSidebarWidth(storedWidth);
    }
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
      {/* Sidebar toggle button for mobile view */}
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            left: "10px",
            top: "10px",
            zIndex: 1001,
            background: "rgba(28, 28, 35, 0.8)",
            border: "none",
            borderRadius: "4px",
            padding: "8px",
            cursor: "pointer",
            color: "white",
          }}
        >
          ☰
        </button>
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: sidebarCollapsed ? "60px" : `${sidebarWidth}px`,
          height: "100vh",
          backgroundColor: "rgba(17, 17, 23, 0.95)",
          color: "white",
          transition: isResizing ? "none" : "width 0.3s ease",
          zIndex: 1000,
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
      
        {/* Admin Button */}
        {user && userIsAdmin && (
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              color: "white",
              textDecoration: "none",
              padding: "20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: "'GohuFontuni11NerdFont', monospace",
            }}
          >
            {sidebarCollapsed ? "A" : "Admin"}
          </Link>
        )}

        {/* Home Icon Link - Added above the user profile */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            color: "white",
            textDecoration: "none",
            padding: "20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            fontFamily: "'GohuFontuni11NerdFont', monospace",
          }}
        >
          {!sidebarCollapsed && <span>Coinflip</span>}
        </Link>

        {/* User Profile */}
        <div
          ref={userMenuRef}
          style={{
            position: "relative",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            onClick={toggleUserMenu}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "15px 20px",
              cursor: "pointer",
              justifyContent: sidebarCollapsed ? "center" : "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  backgroundColor: "transparent",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/images/icon.png"
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              {!sidebarCollapsed && (
                <span style={{ marginLeft: "10px" }}>
                  {user?.username || user?.email?.split('@')[0] || user?.id || "Account"}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            )}
          </div>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div style={{
              position: sidebarCollapsed ? "absolute" : "relative",
              left: sidebarCollapsed ? "60px" : "0",
              top: sidebarCollapsed ? "0" : "auto",
              backgroundColor: "rgba(28, 28, 35, 0.95)",
              width: sidebarCollapsed ? "180px" : "100%",
              zIndex: 1001,
              border: sidebarCollapsed ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
              borderRadius: sidebarCollapsed ? "0 8px 8px 0" : "0",
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
                  color: "red",
                  cursor: "pointer",
                  fontFamily: "'GohuFontuni11NerdFont', monospace",
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="red" style={{ marginRight: "10px" }}>
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Balance Display */}
        <div
          style={{
            padding: "15px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={onOpenDepositModal}
        >
          {!sidebarCollapsed && <span>Balance</span>}
          <div
            style={{
              color: "#F7931A",
              fontSize: "16px",
              fontFamily: "'GohuFontuni11NerdFont', monospace",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "4px 10px",
              borderRadius: "4px",
            }}
          >
            {sidebarCollapsed ? "₿" : `₿ ${formatBalance(balance || 0)}`}
          </div>
        </div>

        {/* Chat Section */}
        <div style={{ 
          flexGrow: 1, 
          display: "flex", 
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Chat Header */}
          <div style={{
            padding: "15px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            fontFamily: "'GohuFontuni11NerdFont', monospace",
            textAlign: sidebarCollapsed ? "center" : "left"
          }}>
            {sidebarCollapsed ? "C" : "CHAT"}
          </div>

          {/* Chat Messages Area */}
          <div style={{ 
            flexGrow: 1, 
            overflowY: "auto",
            padding: sidebarCollapsed ? "10px 5px" : "10px 20px",
            fontSize: "14px"
          }}>
            {!sidebarCollapsed && (
              <>
                <div style={{ marginBottom: "15px", opacity: 0.8 }}>
                  Welcome to the chat!
                </div>
                <div style={{ textAlign: "center", color: "#666", margin: "30px 0" }}>
                  No messages yet
                </div>
              </>
            )}
          </div>

          {/* Chat Input */}
          {!sidebarCollapsed && (
            <div style={{ 
              padding: "15px", 
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex"
            }}>
              <input
                type="text"
                placeholder="Type a message..."
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  padding: "10px 15px",
                  color: "white",
                  borderRadius: "4px",
                  flexGrow: 1,
                  marginRight: "8px",
                  fontFamily: "'GohuFontuni11NerdFont', monospace",
                }}
              />
              <button
                style={{
                  background: "#F7931A",
                  border: "none",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "'GohuFontuni11NerdFont', monospace",
                }}
              >
                Send
              </button>
            </div>
          )}
        </div>

        {/* Resizer handle - only visible when sidebar is expanded */}
        {!sidebarCollapsed && (
          <div 
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "6px",
              cursor: "ew-resize",
              zIndex: 1001,
              backgroundColor: isResizing ? "rgba(247, 147, 26, 0.7)" : "transparent",
              transition: "background-color 0.2s ease",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(247, 147, 26, 0.3)";
            }}
            onMouseOut={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {/* Visual indicator dots */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              height: "60px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  style={{
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    backgroundColor: "#F7931A",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content - adjusted to respect sidebar width and center content better */}
      <div style={{ 
        marginLeft: sidebarCollapsed ? "60px" : `${sidebarWidth}px`,
        transition: isResizing ? "none" : "margin-left 0.3s ease",
        width: sidebarCollapsed ? "calc(100% - 60px)" : `calc(100% - ${sidebarWidth}px)`,
        paddingTop: "0", // Eliminate top padding
        marginTop: "0", // Eliminate top margin
      }}>
        {/* Content container with adjusted padding/margins */}
        <div style={{
          paddingLeft: "5%",  // Reduced left padding to move content right
          paddingRight: "5%", // Also reduced right padding for balance
          maxWidth: "1600px", // Increased max width to allow content to expand more
          margin: "0 auto",   // Center the content container
          boxSizing: "border-box",
          paddingTop: "0", // Eliminate top padding
          marginTop: "0", // Eliminate top margin
        }}>
          {/* Active Games section with expanded width */}
          <div style={{
            marginTop: "0", // Removed top margin to eliminate empty space
            width: "100%",    // Take full width of the container
            marginLeft: "150px", // Added left margin to align with game list
            paddingTop: "0", // Eliminate top padding
          }}>
            {/* Games table with expanded width */}
            <div style={{
              width: "100%",
              overflowX: "auto", // Add horizontal scroll for small screens
              marginTop: "0",
              paddingTop: "0",
            }}>
              {/* Your existing table content */}
              {/* ... */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
