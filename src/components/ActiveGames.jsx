import React, { useState, useEffect, useRef } from "react";
import supabase from "../supabase";

const ActiveGames = ({ user, onGameComplete, onOpenCoinflipModal }) => {
  const [wagerAmount, setWagerAmount] = useState("");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executedGames, setExecutedGames] = useState(new Set());
  const [usernames, setUsernames] = useState({}); // Store mapping of user IDs to usernames
  const fetchTimeoutRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const lastRealtimeCheckRef = useRef(0);
  const gamesSubscriptionRef = useRef(null);
  const activeSpecialChannelsRef = useRef({});

  const MIN_WAGER = 100; // ₿ 100 satoshis
  const MAX_WAGER = 100000000; // ₿ 100 000 000 satoshis

  // Format satoshis with spaces instead of commas
  const formatSatoshis = (satoshis) => {
    return `₿ ${satoshis.toLocaleString("en-US").replace(/,/g, " ")}`;
  };

  // Function to check Supabase realtime status
  const checkRealtimeStatus = async () => {
    // Rate limit realtime checks to at most once every 30 seconds
    const now = Date.now();
    if (now - lastRealtimeCheckRef.current < 30000) {
      console.log("Skipping realtime check - checked recently");
      return;
    }
    
    lastRealtimeCheckRef.current = now;
    
    try {
      console.log("Checking Supabase realtime status...");
      // Create a test channel with a simple listener
      const testChannel = supabase.channel("test-connection");
      testChannel
        .on("system", { event: "*" }, (payload) => {
          console.log("Supabase realtime system event:", payload);
        })
        .subscribe((status) => {
          console.log("Test channel subscription status:", status);
          if (status === "SUBSCRIBED") {
            console.log("✅ Realtime connection is working");
          } else {
            console.warn("⚠️ Realtime connection issue:", status);
          }
          // Cleanup test channel after status check
          setTimeout(() => supabase.removeChannel(testChannel), 5000);
        });
    } catch (error) {
      console.error("Error checking realtime status:", error);
    }
  };

  // Fetch active games
  useEffect(() => {
    if (!user) return;

    // Test the realtime connection
    checkRealtimeStatus();

    const fetchGames = async () => {
      // Implement debouncing - only fetch if it's been at least 3 seconds since last fetch
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 3000) {
        console.log("Debouncing ActiveGames fetchGames call - too frequent");
        
        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        
        // Set a new timeout
        fetchTimeoutRef.current = setTimeout(() => {
          console.log("Executing delayed ActiveGames fetchGames call");
          fetchGames();
        }, 3000 - (now - lastFetchTimeRef.current));
        
        return;
      }
      
      lastFetchTimeRef.current = now;
      
      try {
        console.log("Fetching active games...");
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching games:", error);
          return;
        }

        console.log(`Found ${data?.length || 0} active games:`, data);
        setGames(data || []);

        // Fetch usernames for game creators
        if (data && data.length > 0) {
          const userIds = data.map(game => game.player1_id);
          fetchUsernames(userIds);
        }
      } catch (err) {
        console.error("Error in fetchGames:", err);
      }
    };

    // Initial fetch
    fetchGames();

    // Subscribe to games table changes
    const gamesChannel = supabase
      .channel("games_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: "status=eq.pending",
        },
        async (payload) => {
          console.log("Received games table change:", payload);
          
          // Reload active games upon any games table change
          fetchGames();
        }
      )
      .subscribe((status) => {
        console.log("Games channel subscription status:", status);
      });

    gamesSubscriptionRef.current = gamesChannel;

    // Cleanup function
    return () => {
      if (gamesSubscriptionRef.current) {
        supabase.removeChannel(gamesSubscriptionRef.current);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [user]);

  // Join a game
  const joinGame = async (gameId) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the game to check wager amount
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();
        
      if (gameError) throw gameError;
      
      // Check if user has enough balance
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single();
        
      if (userError) throw userError;
      
      if (userData.balance < gameData.wager_amount) {
        setError(`Insufficient balance. You have ${formatSatoshis(userData.balance)}`);
        setLoading(false);
        return;
      }
      
      // Update the game
      const { data, error } = await supabase
        .from("games")
        .update({
          player2_id: user.id,
          status: "active",
        })
        .eq("id", gameId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Update user balance
      await supabase.rpc("update_balance", {
        user_id: user.id,
        amount: -gameData.wager_amount,
      });
      
      // Remove this game from UI
      setGames(games.filter(game => game.id !== gameId));
      
      console.log("Successfully joined game:", data);
    } catch (err) {
      console.error("Error joining game:", err);
      setError("Failed to join game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Create a new game
  const createGame = async () => {
    if (!user || loading) return;
    
    const satoshis = parseInt(wagerAmount, 10);
    
    // Validate input
    if (isNaN(satoshis) || satoshis < MIN_WAGER || satoshis > MAX_WAGER) {
      setError(`Wager must be between ${formatSatoshis(MIN_WAGER)} and ${formatSatoshis(MAX_WAGER)}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if user has enough balance
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single();
        
      if (userError) throw userError;
      
      if (userData.balance < satoshis) {
        setError(`Insufficient balance. You have ${formatSatoshis(userData.balance)}`);
        setLoading(false);
        return;
      }
      
      // Create the game
      const { data, error } = await supabase
        .from("games")
        .insert({
          player1_id: user.id,
          wager_amount: satoshis,
          status: "pending",
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Update user balance
      await supabase.rpc("update_balance", {
        user_id: user.id,
        amount: -satoshis,
      });
      
      // Manually add the new game to the UI for immediate feedback
      setGames(prevGames => [data, ...prevGames]);
      
      setWagerAmount("");
      
      console.log("Game created successfully:", data.id);
    } catch (err) {
      console.error("Game creation error:", err);
      setError("Failed to create game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel a game
  const cancelGame = async (gameId) => {
    if (!user || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the game to verify ownership and get wager amount
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();
        
      if (gameError) throw gameError;
      
      // Verify current user is the game creator
      if (gameData.player1_id !== user.id) {
        setError("You can only cancel your own games");
        setLoading(false);
        return;
      }
      
      // Delete the game
      const { error } = await supabase
        .from("games")
        .delete()
        .eq("id", gameId);
        
      if (error) throw error;
      
      // Refund the wager amount
      await supabase.rpc("update_balance", {
        user_id: user.id,
        amount: gameData.wager_amount,
      });
      
      // Remove the game from UI
      setGames(games.filter(game => game.id !== gameId));
      
      console.log("Game cancelled successfully:", gameId);
    } catch (err) {
      console.error("Error cancelling game:", err);
      setError("Failed to cancel game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch usernames for users
  const fetchUsernames = async (userIds) => {
    if (!userIds || userIds.length === 0) return;
    
    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];
    
    // Filter out userIds that we already have in our state
    const missingUserIds = uniqueUserIds.filter(id => !usernames[id]);
    
    if (missingUserIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username")
        .in("id", missingUserIds);
        
      if (error) {
        console.error("Error fetching usernames:", error);
        return;
      }
      
      // Create a new mapping of user IDs to usernames
      const newUsernames = {};
      data.forEach(user => {
        newUsernames[user.id] = user.username || `User_${user.id.substr(0, 6)}`;
      });
      
      // Update the usernames state with the new mappings
      setUsernames(prev => ({...prev, ...newUsernames}));
    } catch (err) {
      console.error("Error in fetchUsernames:", err);
    }
  };

  return (
    <div className="active-games-container" style={{
      padding: "20px",
      paddingBottom: "32px",
      backgroundColor: "#121212",
      borderRadius: "8px",
      width: "100%"
    }}>
      {/* Error Message */}
      {error && (
        <div style={{
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "rgba(254, 226, 226, 0.3)",
          color: "#b91c1c",
          borderRadius: "4px",
          textAlign: "center",
          width: "100%",
          border: "1px solid rgba(220, 38, 38, 0.5)",
        }}>
          {error}
        </div>
      )}

      {/* Games List */}
      <div style={{ width: "100%" }}>
        <div style={{ 
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: "16px",
        }}>
          {/* Active Games Label */}
          <div style={{ 
            color: "rgb(255, 255, 255)",
            padding: "8px 16px",
            borderRadius: "4px",
            display: "inline-block",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            fontFamily: "'GohuFontuni11NerdFont', monospace",
          }}>
            Active Games
          </div>
          
          {/* Input and Button Container */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}>
            {/* Wager Input */}
            <input
              type="number"
              id="wager-amount"
              style={{
                width: "120px",
                opacity: loading || !user ? 0.5 : 1,
                padding: "12px 16px",
                borderRadius: "4px",
                textAlign: "center",
                WebkitAppearance: "none",
                MozAppearance: "textfield",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "#000000",
                border: "2px solid #FFA500",
              }}
              placeholder="Enter Amount"
              min={MIN_WAGER}
              max={MAX_WAGER}
              value={wagerAmount}
              onChange={(e) => setWagerAmount(e.target.value)}
              disabled={loading || !user}
            />
            
            {/* Create Game Button */}
            <button
              onClick={createGame}
              disabled={loading || !user}
              style={{
                padding: "12px 16px",
                backgroundColor: "#FFA500",
                color: "white",
                borderRadius: "4px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || !user ? 0.5 : 1,
                border: "none",
                fontFamily: "'GohuFontuni11NerdFont', monospace"
              }}
            >
              Create Game
            </button>
          </div>
        </div>
        
        {games.length === 0 ? (
          <p style={{ 
            color: "#ffffff", 
            textAlign: "center", 
            textShadow: "0 0 4px rgba(0,0,0,0.7)", 
            marginTop: "16px",
            fontFamily: "'GohuFontuni11NerdFont', monospace"
          }}>
            No active games. Create one!
          </p>
        ) : (
          <>
            {/* Column Headers */}
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr auto",
              alignItems: "center",
              width: "100%",
              marginBottom: "8px",
              fontFamily: "'GohuFontuni11NerdFont', monospace"
            }}>
              {/* Column 1: Mode */}
              <div style={{ 
                color: "white",
                padding: "8px 16px",
                borderRadius: "4px",
                display: "inline-block",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                fontFamily: "'GohuFontuni11NerdFont', monospace",
                gridColumn: "1",
                marginBottom: "0",
              }}>
                Mode
              </div>
            </div>
            
            {/* Game rows */}
            {games.map((game) => (
              <div key={game.id} style={{
                color: "white",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
                width: "100%",
                background: "rgba(0, 0, 0, 0.5)",
                fontFamily: "'GohuFontuni11NerdFont', monospace"
              }}>
                {/* Horizontal structure with 6 columns and action button */}
                <div style={{ 
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr auto",
                  alignItems: "center",
                  width: "100%",
                }}>
                  {/* Column 1: Mode */}
                  <div style={{ 
                    color: "white",
                    padding: "16px",
                    borderRight: "1px solid #374151",
                  }}>
                    <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Mode</div>
                    <div>Coinflip</div>
                  </div>

                  {/* Column 2: User */}
                  <div style={{ 
                    padding: "16px",
                    borderRight: "1px solid #374151",
                  }}>
                    <div style={{ color: "#9ca3af", marginBottom: "4px" }}>User</div>
                    <div style={{ color: "#FFA500" }}>
                      {usernames[game.player1_id] || 
                        (user && game.player1_id === user.id ? 
                          (user.username || "You") : 
                          `Player-${game.player1_id.substring(0, 6)}`)}
                    </div>
                  </div>

                  {/* Column 3: Time */}
                  <div style={{ 
                    padding: "16px",
                    borderRight: "1px solid #374151",
                  }}>
                    <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Time</div>
                    <div>{new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                  </div>

                  {/* Column 4: Team */}
                  <div style={{ 
                    padding: "16px",
                    borderRight: "1px solid #374151",
                  }}>
                    <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Team</div>
                    <div>{game.id.charCodeAt(0) % 2 === 0 ? "Heads" : "Tails"}</div>
                  </div>

                  {/* Column 5: Multiplier */}
                  <div style={{ 
                    padding: "16px",
                    borderRight: "1px solid #374151",
                    color: "rgb(71, 255, 65)",
                  }}>
                    <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Multiplier</div>
                    <div>2x</div>
                  </div>

                  {/* Column 6: Value */}
                  <div style={{ 
                    padding: "16px",
                    borderRight: "1px solid #374151",
                  }}>
                    <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Value</div>
                    <div style={{ 
                      display: "inline-block",
                      color: "#f7931a",
                    }}>
                      {formatSatoshis(game.wager_amount)}
                    </div>
                  </div>

                  {/* Action button */}
                  <div style={{ 
                    padding: "16px",
                  }}>
                    {game.player1_id === user?.id ? (
                      <button
                        onClick={() => cancelGame(game.id)}
                        disabled={loading}
                        style={{
                          backgroundColor: "#ef4444",
                          color: "white",
                          borderRadius: "4px",
                          padding: "8px 16px",
                          cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.5 : 1,
                          whiteSpace: "nowrap",
                          border: "none",
                          fontFamily: "'GohuFont14NerdFont', monospace"
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => joinGame(game.id)}
                        disabled={loading}
                        style={{
                          backgroundColor: "#3b82f6",
                          color: "white",
                          borderRadius: "4px",
                          padding: "8px 16px",
                          cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.5 : 1,
                          whiteSpace: "nowrap",
                          border: "none",
                          fontFamily: "'GohuFont14NerdFont', monospace"
                        }}
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ActiveGames; 