import { useState, useEffect, useCallback } from "react";
import supabase from "./supabase";
import Header from "./components/Header";
import Auth from "./components/Auth";
import GameInterface from "./components/GameInterface";
import CoinflipModal from "./components/modals/CoinflipModal";
import DepositModal from "./components/modals/DepositModal";
import WithdrawModal from "./components/modals/WithdrawModal";

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
              .select("id, balance")
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
                break; // Success, exit the retry loop
              } else {
                console.error("Error checking if user exists:", error);
                throw error;
              }
            } else if (data) {
              // User exists, set balance
              console.log("User found in database:", data.id);
              setBalance(data.balance || 0);
              break; // Success, exit the retry loop
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

      // Subscribe to balance changes
      const balanceSubscription = supabase
        .channel(`public:users:id=eq.${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
            filter: `id=eq.${user.id}`,
          },
          fetchUserBalance
        )
        .subscribe();

      return () => {
        supabase.removeChannel(balanceSubscription);
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

  // Open coinflip modal with game data - memoized to prevent dependency cycles
  const handleOpenCoinflipModal = useCallback(
    (game) => {
      console.log("App: Opening coinflip modal for game:", {
        gameId: game.id,
        player1: game.player1_id,
        player2: game.player2_id,
        status: game.status,
        currentUserId: user?.id,
        isCreator: game.player1_id === user?.id,
        isJoiner: game.player2_id === user?.id,
      });

      setCurrentGame(game);
      setGameWinner(null);
      setShowCoinflipModal(true);
    },
    [user]
  );

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

  // Poll for active games involving the current user
  useEffect(() => {
    if (!user) return;

    // Function to check for active games
    const checkForActiveGames = async () => {
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
            handleOpenCoinflipModal(data[0]);
          }
        }
      } catch (err) {
        console.error("Error checking for active games:", err);
      }
    };

    // Check immediately upon user login
    checkForActiveGames();

    // Set up an interval to check regularly
    const intervalId = setInterval(checkForActiveGames, 2000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [user, showCoinflipModal, currentGame, handleOpenCoinflipModal]);

  return (
    <div
      style={{
        backgroundColor: "#121317",
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

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
        {!user ? (
          <Auth />
        ) : (
          <GameInterface
            user={user}
            onGameComplete={handleGameComplete}
            onOpenCoinflipModal={handleOpenCoinflipModal}
          />
        )}
      </main>

      {/* Modals */}
      <CoinflipModal
        isOpen={showCoinflipModal}
        game={currentGame}
        winner={gameWinner}
        currentUserId={user?.id}
        onClose={() => setShowCoinflipModal(false)}
      />

      <DepositModal
        isOpen={showDepositModal}
        userId={user?.id}
        onClose={() => setShowDepositModal(false)}
        onDeposit={handleDeposit}
      />

      <WithdrawModal
        isOpen={showWithdrawModal}
        userId={user?.id}
        userBalance={balance}
        onClose={() => setShowWithdrawModal(false)}
        onWithdraw={handleWithdraw}
      />
    </div>
  );
}

export default App;
