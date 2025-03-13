import { useState, useEffect, useCallback, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";
import supabase from "./supabase";
import Header from "./components/Header";
import Auth from "./components/Auth";
import GameInterface from "./components/GameInterface";
import CoinflipGame from "./components/CoinflipGame";
import AdminDashboard from "./components/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import UserProfile from "./components/UserProfile";
import CoinflipModal from "./components/modals/CoinflipModal";
import DepositModal from "./components/modals/DepositModal";
import WithdrawModal from "./components/modals/WithdrawModal";

// Wrapper for route debugging
const RouteDebugger = ({ children }) => {
  const location = useLocation();
  console.log("Current route:", location.pathname);
  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCoinflipModal, setShowCoinflipModal] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameWinner, setGameWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeGameCheckInterval, setActiveGameCheckInterval] = useState(null);
  const userInitializedRef = useRef(false); // Track if we've already initialized this user

  console.log("App rendering, user:", user?.id, "session:", !!session);

  // Check for auth session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user balance whenever the user changes
  useEffect(() => {
    if (user) {
      const initializeUser = async () => {
        // Skip initialization if we've already done it for this user ID
        if (userInitializedRef.current === user.id) {
          console.log("User already initialized, skipping:", user.id);
          return;
        }
        
        setLoading(true);
        let retries = 3; // Allow a few retries

        // Helper function to generate a mock BTC address
        const generateMockBtcAddress = () => {
          return (
            "bc1" +
            Array(40)
              .fill(0)
              .map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)])
              .join("")
          );
        };

        while (retries > 0) {
          try {
            console.log(
              `Initializing user (retries left: ${retries}):`,
              user.id
            );

            // Check if user exists in the users table
            const { data, error } = await supabase
              .from("users")
              .select("id, balance, username, avatar_url")
              .eq("id", user.id)
              .single();

            if (error) {
              if (error.code === "PGRST116") {
                // User doesn't exist, create a new user record
                console.log("Creating new user record for:", user.id);

                // Generate a mock BTC address
                const mockAddress = generateMockBtcAddress();
                console.log("Generated mock BTC address:", mockAddress);

                // Insert the user with explicit ID to ensure it matches auth.id
                const { error: insertError } = await supabase
                  .from("users")
                  .insert({
                    id: user.id,
                    email: user.email,
                    btc_address: mockAddress, // Use generated address
                    balance: 0,
                    username: null,
                    avatar_url: null,
                  });

                if (insertError) {
                  console.error("Error creating user record:", insertError);

                  // If there's a duplicate key violation, the user might already exist
                  if (insertError.code === "23505") {
                    console.log("User already exists, retrying fetch...");
                    retries--;
                    // Short delay before retry
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    continue;
                  }

                  throw insertError;
                }

                // Verify the user was created by fetching them
                console.log("Verifying user creation...");
                const { data: newUser, error: fetchError } = await supabase
                  .from("users")
                  .select("id, balance")
                  .eq("id", user.id)
                  .single();

                if (fetchError) {
                  console.error("Error verifying user creation:", fetchError);
                  throw fetchError;
                }

                console.log(
                  "User successfully created and verified:",
                  newUser.id
                );
                setBalance(newUser.balance || 0);
                
                // Update user object with profile data
                setUser(prev => ({
                  ...prev,
                  username: null,
                  avatar_url: null
                }));
                
                // Mark as initialized
                userInitializedRef.current = user.id;
                
                break; // Success, exit the retry loop
              } else {
                console.error("Error checking if user exists:", error);
                throw error;
              }
            } else if (data) {
              console.log("User found:", data);
              setBalance(data.balance);
              
              // Update user object with profile data
              setUser(prev => ({
                ...prev,
                username: data.username,
                avatar_url: data.avatar_url
              }));
              
              // Mark as initialized
              userInitializedRef.current = user.id;
              
              break; // Exit the retry loop
            }
          } catch (error) {
            console.error("Error in user initialization:", error);
            retries--;
            if (retries === 0) {
              console.error(
                "Failed to initialize user after multiple attempts"
              );
            } else {
              // Wait a moment before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        setLoading(false);
      };

      initializeUser();

      // Subscribe to balance changes using a more robust approach
      let balanceSubscription;
      try {
        console.log("Setting up balance subscription for user:", user.id);
        balanceSubscription = supabase
          .channel(`public:users:id=eq.${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "users",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              console.log("Balance update received:", payload);
              fetchUserBalance();
            }
          )
          .subscribe((status) => {
            // Only log meaningful status changes - reduce noise
            if (status !== "CLOSED") {
              console.log(`Balance subscription status: ${status}`);
            }
          });
      } catch (error) {
        console.error("Error setting up balance subscription:", error);
      }

      return () => {
        // Proper cleanup of subscription without excessive logging
        if (balanceSubscription) {
          try {
            supabase.removeChannel(balanceSubscription);
          } catch (error) {
            console.error("Error removing channel:", error);
          }
        }
      };
    }
  }, [user]);

  // Function to fetch user balance
  const fetchUserBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setBalance(data.balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // Handle deposit completion
  const handleDeposit = (amount) => {
    // Update local balance state (the actual DB update happens in the DepositModal)
    setBalance((prevBalance) => prevBalance + amount);
  };

  // Handle withdraw completion
  const handleWithdraw = (amount) => {
    // Update local balance state (the actual DB update happens in the WithdrawModal)
    setBalance((prevBalance) => prevBalance - amount);
  };

  // Handle game completion
  const handleGameComplete = (completedGame) => {
    console.log("App: Game completed:", {
      gameId: completedGame.id,
      winner: completedGame.winner_id,
      isCreatorWinner: completedGame.player1_id === completedGame.winner_id,
      isCurrentUserWinner: completedGame.winner_id === user?.id,
    });

    // Make sure the winner ID is explicitly set
    if (!completedGame.winner_id) {
      console.error("No winner_id found in completed game!", completedGame);
      return;
    }

    // Set the winner ID to be used by the CoinflipModal
    setGameWinner(completedGame.winner_id);
    console.log("Setting game winner to:", completedGame.winner_id);

    // Fetch updated balance
    fetchUserBalance();
  };

  // Open coinflip modal with game data - memoized to prevent dependency cycles
  const handleOpenCoinflipModal = useCallback(
    (game, winner = null) => {
      console.log("App: Opening coinflip modal for game:", {
        gameId: game.id,
        player1: game.player1_id,
        player2: game.player2_id,
        status: game.status,
        currentUserId: user?.id,
        isCreator: game.player1_id === user?.id,
        isJoiner: game.player2_id === user?.id,
        winner: winner
      });

      setCurrentGame(game);
      setGameWinner(winner);
      setShowCoinflipModal(true);
    },
    [user]
  );

  // Poll for active games involving the current user
  useEffect(() => {
    if (!user) return;

    const lastCheckTimeRef = { current: 0 };

    // Function to check for active games
    const checkForActiveGames = async () => {
      // Implement debouncing to prevent too frequent checks
      const now = Date.now();
      if (now - lastCheckTimeRef.current < 3000) {
        console.log("Debouncing active games check - too frequent");
        return;
      }
      
      lastCheckTimeRef.current = now;
      
      try {
        console.log("Checking for active games involving user...");
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .eq("status", "active")
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .is("completed_at", null);

        if (!error && data && data.length > 0) {
          console.log("Found active game the user is involved in:", data[0]);

          // Only show the coinflip if a modal isn't already showing
          if (
            !showCoinflipModal ||
            (currentGame && currentGame.id !== data[0].id)
          ) {
            console.log("Opening coinflip modal for active game:", data[0].id);
            handleOpenCoinflipModal(data[0], data[0].winner_id);
          }
        }
      } catch (err) {
        console.error("Error checking for active games:", err);
      }
    };

    // Check immediately upon user login
    checkForActiveGames();

    // Set up an interval to check regularly
    const intervalId = setInterval(checkForActiveGames, 10000); // Increased to 10 seconds

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [user, showCoinflipModal, currentGame, handleOpenCoinflipModal]);

  return (
    <Router>
      <div
        style={{
          minHeight: "100vh",
          color: "#e2e8f0",
        }}
      >
        <Header
          user={user}
          balance={balance}
          onOpenDepositModal={() => setShowDepositModal(true)}
          onOpenWithdrawModal={() => setShowWithdrawModal(true)}
        />

        <RouteDebugger>
          <Routes>
            <Route
              path="/"
              element={
                !session ? (
                  <main
                    style={{
                      maxWidth: "1200px",
                      margin: "0 auto",
                      padding: "16px",
                      paddingTop: "80px",
                    }}
                  >
                    <Auth />
                  </main>
                ) : (
                  <main
                    style={{
                      maxWidth: "1200px",
                      margin: "0 auto",
                      padding: "16px",
                      paddingTop: "80px",
                    }}
                  >
                    <GameInterface
                      user={user}
                      onGameComplete={handleGameComplete}
                      onOpenCoinflipModal={handleOpenCoinflipModal}
                    />
                  </main>
                )
              }
            />
            <Route
              path="/coinflip"
              element={
                !session ? (
                  <Navigate to="/" replace />
                ) : (
                  <main
                    style={{
                      maxWidth: "1200px",
                      margin: "0 auto",
                      padding: "16px",
                      paddingTop: "80px",
                    }}
                  >
                    <CoinflipGame
                      user={user}
                      onGameComplete={handleGameComplete}
                      onOpenCoinflipModal={handleOpenCoinflipModal}
                    />
                  </main>
                )
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute user={user}>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/profile"
              element={user ? <UserProfile user={user} /> : <Navigate to="/" replace />}
            />
            {/* Catch-all route for debugging */}
            <Route 
              path="*" 
              element={
                <div style={{padding: "100px 20px"}}>
                  <h1>404 - Route Not Found</h1>
                  <p>The path "{window.location.pathname}" does not exist.</p>
                </div>
              } 
            />
          </Routes>
        </RouteDebugger>

        {/* Modals */}
        {showDepositModal && (
          <DepositModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            onDeposit={handleDeposit}
            user={user}
          />
        )}
        {showWithdrawModal && (
          <WithdrawModal
            isOpen={showWithdrawModal}
            onClose={() => setShowWithdrawModal(false)}
            onWithdraw={handleWithdraw}
            user={user}
            balance={balance}
          />
        )}
        {showCoinflipModal && (
          <CoinflipModal
            isOpen={showCoinflipModal}
            onClose={() => setShowCoinflipModal(false)}
            game={currentGame}
            winner={gameWinner}
            currentUserId={user?.id}
          />
        )}
      </div>
    </Router>
  );
}

export default App;
