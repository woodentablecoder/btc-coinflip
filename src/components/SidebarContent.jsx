import React from "react";

const SidebarContent = ({ user }) => {
  return (
    <div className="sidebar-content" style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%"
    }}>
      {/* Logo/Branding */}
      <div style={{
        textAlign: "center",
        marginBottom: "20px",
        fontSize: "24px",
        fontWeight: "bold",
        color: "#f7931a",
        fontFamily: "'GohuFontuni11NerdFont', monospace"
      }}>
        BTC COINFLIP
      </div>
      
      {/* Navigation Links */}
      <nav style={{ marginBottom: "30px" }}>
        <ul style={{ 
          listStyle: "none", 
          padding: 0, 
          margin: 0,
          fontFamily: "'GohuFontuni11NerdFont', monospace"
        }}>
          <li style={{ marginBottom: "10px" }}>
            <a 
              href="/" 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "10px", 
                borderRadius: "4px", 
                backgroundColor: "#222222", 
                color: "#f7931a", 
                textDecoration: "none" 
              }}
            >
              🏠 Home
            </a>
          </li>
          <li style={{ marginBottom: "10px" }}>
            <a 
              href="/profile" 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "10px", 
                borderRadius: "4px", 
                backgroundColor: "#1a1a1a", 
                color: "#f7931a", 
                textDecoration: "none" 
              }}
            >
              👤 Profile
            </a>
          </li>
          {user?.admin && (
            <li style={{ marginBottom: "10px" }}>
              <a 
                href="/admin" 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  padding: "10px", 
                  borderRadius: "4px", 
                  backgroundColor: "#1a1a1a", 
                  color: "#f7931a", 
                  textDecoration: "none" 
                }}
              >
                ⚙️ Admin
              </a>
            </li>
          )}
        </ul>
      </nav>
      
      {/* Stats */}
      <div style={{ 
        backgroundColor: "#222222", 
        padding: "15px", 
        borderRadius: "8px",
        marginBottom: "20px",
        fontFamily: "'GohuFontuni11NerdFont', monospace"
      }}>
        <h3 style={{ 
          color: "#f7931a", 
          margin: "0 0 10px 0", 
          fontSize: "14px", 
          fontWeight: "normal",
          textTransform: "uppercase"
        }}>
          Stats
        </h3>
        <div style={{ marginBottom: "5px", color: "#cccccc", fontSize: "12px" }}>
          ⚡ Games Played: 1,482
        </div>
        <div style={{ marginBottom: "5px", color: "#cccccc", fontSize: "12px" }}>
          💰 Volume: ₿ 42 876 521
        </div>
        <div style={{ color: "#cccccc", fontSize: "12px" }}>
          👥 Players: 256
        </div>
      </div>
      
      {/* Contact Info */}
      <div style={{ 
        padding: "15px",
        marginTop: "auto",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        fontFamily: "'GohuFontuni11NerdFont', monospace",
        fontSize: "12px",
        color: "#666666"
      }}>
        <div style={{ marginBottom: "5px" }}>
          Need help? Contact:
        </div>
        <div style={{ color: "#f7931a" }}>
          support@btccoinflip.com
        </div>
      </div>
    </div>
  );
};

export default SidebarContent; 