import React, { useState, useEffect, useRef } from "react";
import supabase from "../supabase";
import "../css/CoinflipGame.css";

const CoinflipGame = ({ user, onGameComplete, onOpenCoinflipModal }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usernames, setUsernames] = useState({});
  const fetchTimeoutRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  console.log("CoinflipGame rendering, user:", user?.id);

  // Fetch active games
  useEffect(() => {
    if (!user) {
      console.log("No user, skipping game fetch");
      return;
    }

    const fetchGames = async () => {
      // Implement debouncing - only fetch if it's been at least 3 seconds since last fetch
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 3000) {
        console.log("Debouncing fetchGames call - too frequent");
        
        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        
        // Set a new timeout
        fetchTimeoutRef.current = setTimeout(() => {
          console.log("Executing delayed fetchGames call");
          fetchGames();
        }, 3000 - (now - lastFetchTimeRef.current));
        
        return;
      }
      
      lastFetchTimeRef.current = now;
      setLoading(true);
      
      try {
        console.log("Fetching active coinflip games...");
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("game_type", "coinflip")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        console.log("Games fetched:", data?.length || 0);
        setGames(data || []);
        
        // Fetch usernames for all unique user IDs
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map(game => game.creator_id).concat(
            data.map(game => game.joiner_id).filter(Boolean)
          ))];
          
          await fetchUsernames(userIds);
        }
      } catch (err) {
        console.error("Error fetching coinflip games:", err);
        setError("Failed to load games. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
    
    // Subscribe to game updates
    const gamesSubscription = supabase
      .channel('public:games')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'games',
        filter: 'game_type=eq.coinflip'
      }, payload => {
        console.log('Game change received:', payload);
        fetchGames(); // This will now be debounced
      })
      .subscribe();

    return () => {
      // Clean up
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      supabase.removeChannel(gamesSubscription);
    };
  }, [user]);

  // Fetch usernames for user IDs
  const fetchUsernames = async (userIds) => {
    try {
      if (!userIds.length) return;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const usernameMap = {};
      data.forEach(profile => {
        usernameMap[profile.user_id] = profile.username;
      });
      
      setUsernames(usernameMap);
    } catch (err) {
      console.error('Error fetching usernames:', err);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format satoshis with proper spacing
  const formatSatoshis = (satoshis) => {
    return new Intl.NumberFormat('en-US').format(satoshis);
  };

  // If there's an error fetching games, display it
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="coinflip-container">
      {/* Page title with dice icon */}
      <div className="page-title">
        <div className="dice-icon">
          <img src="/images/dice_vector1.svg" alt="Dice Icon" />
        </div>
        <h1>Coinflip</h1>
      </div>

      {/* Active Games section */}
      <div className="active-games-section">
        <div className="games-header">
          <h2>Active Games</h2>
        </div>
        
        <div className="games-table">
          <div className="table-header">
            <div className="header-mode">Mode</div>
            <div className="header-user">User</div>
            <div className="header-time">Time</div>
            <div className="header-value">Value</div>
            <div className="header-multiplier">Multiplier</div>
            <div className="header-winner">Winner</div>
          </div>

          <div className="table-body">
            {games.length === 0 ? (
              <div className="no-games">No active coinflip games</div>
            ) : (
              games.map((game) => (
                <div className="game-row" key={game.id}>
                  <div className="game-mode">Coinflip</div>
                  <div className="game-user">{usernames[game.creator_id] || "Username"}</div>
                  <div className="game-time">{formatTime(game.created_at)}</div>
                  <div className="game-value">₿ {formatSatoshis(game.wager_amount)}</div>
                  <div className="game-multiplier">
                    <span className="multiply-symbol">×</span> 2.00
                  </div>
                  <div className="game-winner">
                    {game.status === 'completed' ? (
                      usernames[game.winner_id] || "Username"
                    ) : (
                      <button 
                        className="join-button"
                        onClick={() => {
                          // This would be implemented with actual join functionality
                          console.log("Join game:", game.id);
                        }}
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Game interface elements would go here */}
      <div className="game-controls">
        <div className="game-coin-display">
          <div className="coin heads"></div>
          <div className="coin tails"></div>
        </div>
      </div>
    </div>
  );
};

export default CoinflipGame; 