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
      width: "calc(100% - 250px)",  // Subtract sidebar width
      marginLeft: "250px",          // Match the sidebar width
      backgroundColor: "#1a1a1a",
      color: "#f7931a",
      padding: "8px 16px",
      textAlign: "center",
      fontFamily: "'GohuFontuni11NerdFont', monospace",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 1001,
      margin: 0
    }}>
      {isEditing ? (
        <input
          type="text"
          value={editedMessage}
          onChange={(e) => setEditedMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: "#2a2a2a",
            color: "#f7931a",
            border: "1px solid #f7931a",
            padding: "4px 8px",
            borderRadius: "4px",
            fontFamily: "'GohuFontuni11NerdFont', monospace",
            width: "80%",
          }}
          autoFocus
        />
      ) : (
        <div>{message || "No message of the day set"}</div>
      )}

      {isAdmin && (
        <div style={{ position: "absolute", right: "16px" }}>
          {isEditing ? (
            <button
              onClick={updateMessage}
              style={{
                backgroundColor: "transparent",
                color: "#f7931a",
                border: "1px solid #f7931a",
                borderRadius: "4px",
                padding: "2px 8px",
                marginLeft: "8px",
                marginRight: "30px", 
                cursor: "pointer",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
              }}
            >
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: "transparent",
                color: "#f7931a",
                border: "1px solid #f7931a",
                borderRadius: "4px",
                padding: "2px 8px",
                marginLeft: "8px",
                marginRight: "30px", 
                cursor: "pointer",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
              }}
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageOfTheDay; 