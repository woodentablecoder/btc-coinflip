import React, { useState, useEffect } from "react";
import supabase from "../supabase";

const MessageOfTheDay = ({ user, isAdmin }) => {
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");

  // Fetch the message of the day from the database
  useEffect(() => {
    fetchMessage();
  }, []);

  const fetchMessage = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "message_of_the_day")
        .single();
      
      if (error) {
        console.error("Error fetching message:", error);
        return;
      }
      
      if (data) {
        setMessage(data.value);
        setEditedMessage(data.value);
      }
    } catch (err) {
      console.error("Error fetching message of the day:", err);
    }
  };

  const updateMessage = async () => {
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ 
          key: "message_of_the_day", 
          value: editedMessage,
          updated_at: new Date() 
        });
      
      if (error) {
        console.error("Error updating message:", error);
        return;
      }
      
      setMessage(editedMessage);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating message of the day:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      updateMessage();
    }
  };

  if (!message && !isAdmin) return null;

  return (
    <div style={{
      backgroundColor: "#F7931A", // Green color as per your layout description
      color: "white",
      padding: "12px 16px",
      textAlign: "center",
      fontFamily: "'GohuFontuni11NerdFont', monospace",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "relative", // Changed from sticky
      top: 0,
      zIndex: 999,
      width: "100%",
      margin: 0,
      marginBottom: "12px" // Add bottom margin for more even spacing
    }}>
      {isEditing ? (
        <div style={{ 
          display: "flex", 
          width: "100%", 
          justifyContent: "center", 
          alignItems: "center" 
        }}>
          <input
            type="text"
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              backgroundColor: "#2a2a2a",
              color: "white",
              border: "1px solid #fff",
              padding: "4px 8px",
              borderRadius: "4px",
              fontFamily: "'GohuFontuni11NerdFont', monospace",
              width: "80%",
              textAlign: "center"
            }}
            autoFocus
          />
        </div>
      ) : (
        <div style={{ display: "flex", width: "100%", justifyContent: "center", alignItems: "center" }}>
          <p style={{ margin: 0 }}>{message || "Welcome to BTC Coinflip!"}</p>
          
          {isAdmin && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: "rgb(255, 255, 255)",
                color: "#F7931A",
                cursor: "pointer",
                marginLeft: "10px",
                padding: "2px 5px",
                fontSize: "9px",
                fontWeight: "bold",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
                transition: "all 0.2s ease"
              }}
            >
              EDIT
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageOfTheDay; 