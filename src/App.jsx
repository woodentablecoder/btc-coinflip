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
import AdminDashboard from "./components/AdminDashboard";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import UserProfile from "./components/UserProfile";
import CoinflipModal from "./components/modals/CoinflipModal";
import DepositModal from "./components/modals/DepositModal";
import WithdrawModal from "./components/modals/WithdrawModal";
import { isAdmin } from "./utils/adminUtils";
// Import new components
import SideBar from "./components/SideBar";
import SidebarContent from "./components/SidebarContent";
import ActiveGames from "./components/ActiveGames";
import MessageOfTheDay from "./components/MessageOfTheDay";

// Wrapper for route debugging
const RouteDebugger = ({ children }) => {
  const location = useLocation();
  console.log("Current route:", location.pathname);
  return children;
};

// Refresh trigger - timestamp: ${new Date().toISOString()}

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
  const [userIsAdmin, setUserIsAdmin] = useState(false);
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
              // If user doesn't exist, create a new user record
              if (error.code === "PGRST116") {
                console.log("User not found, creating new user:", user.id);

                // Create a new user with default values
                const { data: newUser, error: createError } = await supabase
                  .from("users")
                  .insert({
                    id: user.id,
                    email: user.email,
                    balance: 100000, // Give initial balance of ₿ 100 000 satoshis
                    username: `user_${user.id.substring(0, 6)}`,
                    deposit_address: generateMockBtcAddress(),
                  })
                  .select()
                  .single();

                if (createError) {
                  console.error("Error creating user:", createError);
                  
                  // If foreign key constraint error, it means records already exist
                  // This can happen with RLS policies sometimes
                  if (createError.code === "23503" && createError.message.includes("foreign key constraint")) {
                    console.log("Foreign key constraint error. Retry with existing record.");
                    retries--;
                    // Wait a moment before retrying
                    await new Promise((resolve) => setTimeout(resolve, 800));
                    continue;
                  } else {
                    // Other error
                    throw createError;
                  }
                }

                console.log("Created new user successfully:", newUser);
                setBalance(newUser.balance);
                userInitializedRef.current = user.id;
                break;
              } else {
                // Other DB error
                console.error("Error fetching user:", error);
                throw error;
              }
            } else {
              // User exists
              console.log("User found:", data);
              setBalance(data.balance);
              userInitializedRef.current = user.id;
              break;
            }
          } catch (err) {
            console.error("Error in user initialization:", err);
            retries--;
            // Wait a moment before retrying
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }

        // Check if the user is an admin
        const adminStatus = await isAdmin(user.id);
        setUserIsAdmin(adminStatus);
        console.log("User admin status:", adminStatus);

        setLoading(false);
      };

      initializeUser();

      // Set up real-time subscription to the user's balance
      const balanceChannel = supabase
        .channel(`balance-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Balance update received:", payload);
            if (payload.new && typeof payload.new.balance === "number") {
              setBalance(payload.new.balance);
            }
          }
        )
        .subscribe((status) => {
          console.log("Balance subscription status:", status);
        });

      // Cleanup function
      return () => {
        supabase.removeChannel(balanceChannel);
      };
    }
  }, [user]);

  // Handle game completion
  const handleGameComplete = useCallback((game, winner) => {
    console.log("Game completed:", game);
    setCurrentGame(game);
    setGameWinner(winner);
    setShowCoinflipModal(true);
  }, []);

  // Handle opening the coinflip modal directly
  const handleOpenCoinflipModal = useCallback((game, winner) => {
    setCurrentGame(game);
    setGameWinner(winner);
    setShowCoinflipModal(true);
  }, []);

  // Handle deposit completion
  const handleDeposit = async (amount) => {
    console.log("Deposit completed:", amount);
    setShowDepositModal(false);
  };

  // Handle withdraw completion
  const handleWithdraw = async (amount, address) => {
    console.log("Withdraw requested:", amount, "to", address);
    setShowWithdrawModal(false);
  };

  return (
    <Router>
      <div
        style={{
          minHeight: "100vh",
          color: "#e2e8f0",
          margin: 0,
          padding: 0,
          paddingTop: 0,
          backgroundColor: "#000",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header stays at the top */}
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
                  // Login page
                  <main
                    style={{
                      maxWidth: "1200px",
                      margin: "0 auto",
                      padding: "16px",
                      paddingTop: "0",
                    }}
                  >
                    {/* Sidebar for non-logged in users too */}
                    <SideBar>
                      <SidebarContent user={null} />
                    </SideBar>
                    
                    <Auth />
                  </main>
                ) : (
                  // New layout with sidebar, message of the day, and active games
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    height: "calc(100vh - 64px)",
                    margin: 0,
                    padding: 0
                  }}>
                    {/* Sidebar */}
                    <SideBar>
                      <SidebarContent user={user} />
                    </SideBar>
                    
                    {/* Message of the day */}
                    <MessageOfTheDay user={user} isAdmin={userIsAdmin} />
                    
                    {/* Main content area */}
                    <main
                      style={{
                        padding: "16px",
                        paddingTop: "24px",
                        paddingBottom: "24px",
                        flexGrow: 1,
                        display: "flex",
                        justifyContent: "center",
                        margin: 0,
                        overflow: "auto"
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "1200px",
                        }}
                      >
                        {/* Active games section */}
                        <ActiveGames
                          user={user}
                          onGameComplete={handleGameComplete}
                          onOpenCoinflipModal={handleOpenCoinflipModal}
                        />
                      </div>
                    </main>
                  </div>
                )
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute user={user}>
                  <SideBar>
                    <SidebarContent user={user} />
                  </SideBar>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/profile"
              element={
                user ? (
                  <>
                    <SideBar>
                      <SidebarContent user={user} />
                    </SideBar>
                    <UserProfile user={user} />
                  </>
                ) : (
                  <Navigate to="/" replace />
                )
              }
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
