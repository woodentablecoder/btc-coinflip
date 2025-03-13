import React, { useState, useEffect } from "react";
import supabase from "../supabase";
import { isAdmin } from "../utils/adminUtils.jsx";
import "./AdminDashboard.css";

// Helper function to format BTC in satoshis format
const formatBitcoin = (btcAmount) => {
  // Convert to a number if it's not already
  const amount = typeof btcAmount === 'number' ? btcAmount : parseFloat(btcAmount || 0);
  
  // Return 0 if invalid
  if (isNaN(amount)) return "₿ 0";
  
  // Convert BTC to satoshis (1 BTC = 100,000,000 satoshis)
  const satoshis = Math.round(amount * 100000000);
  
  // Format with spaces as thousand separators
  return `₿ ${satoshis.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
};

// Helper function to format BTC in standard decimal format
const formatBitcoinDecimal = (btcAmount) => {
  // Convert to a number if it's not already
  const amount = typeof btcAmount === 'number' ? btcAmount : parseFloat(btcAmount || 0);
  
  // Return 0 if invalid
  if (isNaN(amount)) return "0.00000000 BTC";
  
  // Format with 8 decimal places
  return `${amount.toFixed(8)} BTC`;
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleChangeAmount, setRoleChangeAmount] = useState("");
  const [debug, setDebug] = useState({});

  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await isAdmin();
      if (!adminStatus) {
        setError("You do not have permission to access this page");
        setLoading(false);
        return;
      }

      checkTablesExist();
    };

    checkAdmin();
  }, []);

  // Check if required tables exist before trying to query them
  const checkTablesExist = async () => {
    try {
      console.log("Checking if tables exist...");

      // Get a list of all tables in the public schema
      const { data: tables, error: tablesError } = await supabase
        .from("pg_tables")
        .select("tablename")
        .eq("schemaname", "public");

      if (tablesError) {
        console.error("Error getting tables:", tablesError);
        setDebug((prev) => ({ ...prev, tablesError }));
        // Continue anyway since pg_tables might not be accessible
      } else {
        setDebug((prev) => ({ ...prev, tables }));
      }

      fetchData();
    } catch (error) {
      console.error("Error in table check:", error);
      setDebug((prev) => ({ ...prev, checkError: error.message }));
      fetchData(); // Try to fetch data anyway
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const results = {};

    try {
      // First try to fetch all user data from auth.users table
      console.log("Fetching users...");
      let allUsers = [];
      
      try {
        // Try alternative queries to auth schema (which is often restricted)
        // Try to get users via the profiles table if it exists
        console.log("Trying to fetch users from profiles...");
        const { data: profileUsers, error: profileError } = await supabase
          .from("profiles")
          .select("*");
          
        if (!profileError && profileUsers && profileUsers.length > 0) {
          console.log(`Found ${profileUsers.length} users in profiles table`);
          allUsers = profileUsers;
          results.profileUsers = { success: true, count: profileUsers.length };
        } else {
          results.profileUsers = { success: false, error: profileError?.message };
          console.log("No users found in profiles, trying auth.users...");
          
          // Try to fetch users from auth.users
          const { data: authUsers, error: authError } = await supabase
            .from("auth.users")
            .select("*");

          if (!authError && authUsers && authUsers.length > 0) {
            console.log(`Found ${authUsers.length} users in auth.users table`);
            allUsers = authUsers;
            results.authUsers = { success: true, count: authUsers.length };
          } else {
            results.authUsers = { success: false, error: authError?.message };
            console.log("Couldn't access auth.users:", authError?.message);
          }
        }
        
        // Now try a last resort to get users via the public users table if it exists
        if (allUsers.length === 0) {
          console.log("Trying to fetch from users table...");
          const { data: publicUsers, error: publicError } = await supabase
            .from("users")
            .select("*");
            
          if (!publicError && publicUsers && publicUsers.length > 0) {
            console.log(`Found ${publicUsers.length} users in users table`);
            allUsers = publicUsers;
            results.publicUsers = { success: true, count: publicUsers.length };
          } else {
            results.publicUsers = { success: false, error: publicError?.message };
            console.log("No users found in users table:", publicError?.message);
          }
        }
        
        // Fetch user roles data (regardless of other attempts)
        console.log("Fetching user roles...");
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("*");

        if (!rolesError && userRoles) {
          console.log(`Found ${userRoles.length} entries in user_roles`);
          results.userRoles = { success: true, count: userRoles.length };
          
          // If we got users from any table, merge role information
          if (allUsers.length > 0) {
            console.log(`Merging ${allUsers.length} users with ${userRoles.length} role entries`);
            
            // Debug: Check the structure of user objects
            if (allUsers.length > 0) {
              console.log("User object structure example:", JSON.stringify(allUsers[0]));
            }
            
            // Debug: Check the structure of role objects
            if (userRoles.length > 0) {
              console.log("Role object structure example:", JSON.stringify(userRoles[0]));
            }
            
            // Merge role data with user data
            allUsers = allUsers.map(user => {
              const userId = user.id || user.user_id;
              const roleData = userRoles.find(r => (r.user_id === userId));
              return {
                ...user,
                role: roleData ? roleData.role : "user" // Default to "user" if no role found
              };
            });
          } else if (userRoles.length > 0) {
            // If we couldn't get users from any table, just use the role data as our user list
            console.log(`No users found in any table. Using ${userRoles.length} user role entries as primary user source`);
            allUsers = userRoles;
          }
        } else {
          results.userRoles = { success: false, error: rolesError?.message };
          console.error("Failed to fetch user roles:", rolesError);
        }
        
        // If we still have no users but have found roles, use roles
        if (allUsers.length === 0 && userRoles && userRoles.length > 0) {
          allUsers = userRoles;
          console.log("Using user_roles as fallback user source");
        }
        
        console.log(`Final allUsers array has ${allUsers.length} entries`);
        setUsers(allUsers || []);
        
        // Special case: if we have the specific IDs mentioned, add them manually for debugging
        if (allUsers.length === 0) {
          console.log("Adding specific user IDs manually for debugging");
          const manualUsers = [
            { id: "172f2ce8-f40c-4486-a2d3-bef7c98e990b", email: "User 1 (Added manually)", role: "user" },
            { id: "f58433c3-8268-49df-a3fb-b3af5f6fc6b1", email: "User 2 (Added manually)", role: "user" }
          ];
          setUsers(manualUsers);
        }
      } catch (error) {
        results.users = { success: false, error: error.message };
        console.error("Error fetching users:", error);
      }

      // Try to fetch games
      console.log("Fetching games...");
      try {
        const { data: gameData, error: gameError } = await supabase
          .from("games")
          .select("*")
          .order("created_at", { ascending: false });

        if (!gameError) {
          setGames(gameData || []);
          results.games = { success: true, count: gameData?.length || 0 };
        } else {
          results.games = { success: false, error: gameError.message };
        }
      } catch (error) {
        results.games = { success: false, error: error.message };
      }

      // Try to fetch balances
      console.log("Fetching balances...");
      try {
        // Try to get balances with a more robust approach
        const { data: balanceData, error: balanceError } = await supabase
          .from("balances")
          .select("*");

        if (!balanceError && balanceData && balanceData.length > 0) {
          console.log(`Found ${balanceData.length} balance entries`);
          setBalances(balanceData);
          results.balances = { success: true, count: balanceData.length };
          
          // Debug balance structure
          if (balanceData.length > 0) {
            console.log("Balance entry example:", JSON.stringify(balanceData[0]));
          }
        } else {
          results.balances = { success: false, error: balanceError?.message };
          console.log("No balances found or error:", balanceError?.message);
          
          // Try an alternative query
          console.log("Trying alternative balance query...");
          const { data: altBalances, error: altError } = await supabase
            .from("user_balances")
            .select("*");
            
          if (!altError && altBalances && altBalances.length > 0) {
            console.log(`Found ${altBalances.length} user_balances entries`);
            setBalances(altBalances);
            results.altBalances = { success: true, count: altBalances.length };
          } else {
            results.altBalances = { success: false, error: altError?.message };
            
            // If no balances found in either table, create some dummy balances for display
            console.log("Creating dummy balances for users that don't have balance entries");
            const dummyBalances = users.map(user => ({
              user_id: user.id || user.user_id,
              balance: 0,
              dummy: true
            }));
            setBalances(dummyBalances);
          }
        }
      } catch (error) {
        results.balances = { success: false, error: error.message };
        console.error("Error fetching balances:", error);
      }

      setDebug((prev) => ({ ...prev, fetchResults: results }));

      // Only show error if all fetches failed
      if (
        !results.authUsers?.success &&
        !results.userRoles?.success &&
        !results.games?.success &&
        !results.balances?.success
      ) {
        setError("Failed to load admin data. Check console for details.");
      } else {
        setError(null);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setError("Failed to load admin data: " + error.message);
      setDebug((prev) => ({ ...prev, mainError: error.message }));
    } finally {
      setLoading(false);
    }
  };

  // Simplified update function - no RLS check needed anymore
  const updateUserRole = async (userId, makeAdmin) => {
    try {
      const { error } = await supabase.from("user_roles").upsert({
        user_id: userId,
        role: makeAdmin ? "admin" : "user",
      });

      if (error) throw error;

      // Refresh users data
      fetchData();
    } catch (error) {
      console.error("Error updating user role:", error);
      setError("Failed to update user role: " + error.message);
    }
  };

  // Simplified balance update function
  const updateUserBalance = async (userId, amount) => {
    if (!amount || isNaN(parseFloat(amount))) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      // Direct update approach
      const { error } = await supabase.rpc("adjust_balance", {
        user_id_param: userId,
        amount_param: parseFloat(amount),
      });

      if (error) throw error;

      // Refresh data
      fetchData();
      setRoleChangeAmount("");
      setError(null);
    } catch (error) {
      console.error("Error updating balance:", error);
      setError("Failed to update user balance: " + error.message);
    }
  };

  const renderUsers = () => (
    <div className="admin-table">
      <h2>Users ({users.length})</h2>
      {users.length === 0 ? (
        <p>No users found. Please check database permissions.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email/Username</th>
              <th>Balance</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              // Handle different user data structures consistently
              const userId = user.id || user.user_id;
              // For user from user_roles, it might not have email
              const userEmail = user.email || user.username || "Unknown";
              const userBalance =
                balances.find((b) => b.user_id === userId)?.balance || 0;
              // Default to "user" if no role is specified
              const userRole = user.role || "user";

              return (
                <tr key={userId}>
                  <td>{userId}</td>
                  <td>{userEmail}</td>
                  <td>
                    <div className="balance-display">
                      <span className="balance-satoshi">{formatBitcoin(userBalance)}</span>
                      <span className="balance-btc">{formatBitcoinDecimal(userBalance)}</span>
                    </div>
                  </td>
                  <td>{userRole}</td>
                  <td>
                    <button
                      onClick={() => setSelectedUser(user)}
                      style={{ marginRight: "5px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        updateUserRole(userId, userRole !== "admin")
                      }
                    >
                      {userRole === "admin" ? "Remove Admin" : "Make Admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderGames = () => (
    <div className="admin-table">
      <h2>Games ({games.length})</h2>
      {games.length === 0 ? (
        <p>No games found. Please check database permissions.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Creator</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Winner</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>{game.id}</td>
                <td>{game.creator_id}</td>
                <td>{game.amount} BTC</td>
                <td>{game.status}</td>
                <td>{game.winner_id || "N/A"}</td>
                <td>{new Date(game.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderStats = () => {
    const totalUsers = users.length;
    const totalGames = games.length;
    const totalVolume = games.reduce(
      (acc, game) => acc + (parseFloat(game.amount) || 0),
      0
    );
    const completedGames = games.filter(
      (game) => game.status === "completed"
    ).length;

    return (
      <div className="admin-stats">
        <h2>Platform Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p>{totalUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Total Games</h3>
            <p>{totalGames}</p>
          </div>
          <div className="stat-card">
            <h3>Total Volume</h3>
            <div className="balance-display stat-balance">
              <p className="balance-satoshi">{formatBitcoin(totalVolume)}</p>
              <p className="balance-btc">{formatBitcoinDecimal(totalVolume)}</p>
            </div>
          </div>
          <div className="stat-card">
            <h3>Completed Games</h3>
            <p>{completedGames}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDebug = () => (
    <div className="admin-debug">
      <h2>Debug Information</h2>
      <div className="debug-section">
        <h3>Query Results Status</h3>
        <pre>{JSON.stringify(debug?.fetchResults || {}, null, 2)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>Tables</h3>
        <pre>{JSON.stringify(debug?.tables || [], null, 2)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>Users</h3>
        <p>Users array length: {users.length}</p>
        <p>User IDs found: {users.map(u => u.id || u.user_id).join(', ')}</p>
        <pre>{JSON.stringify(users.slice(0, 2), null, 2)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>Balances</h3>
        <p>Balances array length: {balances.length}</p>
        <button onClick={async () => {
          try {
            const { data, error } = await supabase.from("balances").select("*");
            setDebug(prev => ({ ...prev, directBalanceQuery: { data, error: error?.message } }));
          } catch (err) {
            setDebug(prev => ({ ...prev, directBalanceQuery: { error: err.message } }));
          }
        }}>Query balances directly</button>
        <pre>{JSON.stringify(balances.slice(0, 5), null, 2)}</pre>
        <pre>{JSON.stringify(debug?.directBalanceQuery || {}, null, 2)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>Direct User Role Query</h3>
        <button onClick={async () => {
          try {
            const { data, error } = await supabase.from("user_roles").select("*");
            setDebug(prev => ({ ...prev, directUserRoles: { data, error: error?.message } }));
          } catch (err) {
            setDebug(prev => ({ ...prev, directUserRoles: { error: err.message } }));
          }
        }}>Query user_roles directly</button>
        <pre>{JSON.stringify(debug?.directUserRoles || {}, null, 2)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>Direct User Query</h3>
        <button onClick={async () => {
          try {
            // Try manually querying for the specific IDs
            const { data, error } = await supabase.from("users").select("*").in("id", [
              "172f2ce8-f40c-4486-a2d3-bef7c98e990b", 
              "f58433c3-8268-49df-a3fb-b3af5f6fc6b1"
            ]);
            setDebug(prev => ({ ...prev, directUserQuery: { data, error: error?.message } }));
          } catch (err) {
            setDebug(prev => ({ ...prev, directUserQuery: { error: err.message } }));
          }
        }}>Query specific users</button>
        <pre>{JSON.stringify(debug?.directUserQuery || {}, null, 2)}</pre>
      </div>
      
      <div className="debug-section">
        <h3>Other Debug Data</h3>
        <pre>{JSON.stringify(debug, null, 2)}</pre>
      </div>
    </div>
  );

  const renderUserModal = () => {
    if (!selectedUser) return null;

    // Handle different user data structures
    const userId = selectedUser.id || selectedUser.user_id;
    const userEmail = selectedUser.email || selectedUser.username || "Unknown";
    const userBalance = balances.find((b) => b.user_id === userId)?.balance || 0;

    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>Edit User: {userEmail}</h2>

          <div className="modal-section">
            <h3>Current Balance</h3>
            <div className="balance-display modal-balance">
              <span className="balance-satoshi">{formatBitcoin(userBalance)}</span>
              <span className="balance-btc">{formatBitcoinDecimal(userBalance)}</span>
            </div>
            
            <h3>Adjust Balance</h3>
            <div className="input-group">
              <input
                type="number"
                value={roleChangeAmount}
                onChange={(e) => setRoleChangeAmount(e.target.value)}
                placeholder="Amount (+ or -)"
              />
              <button
                onClick={() => updateUserBalance(userId, roleChangeAmount)}
              >
                Update Balance
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={() => setSelectedUser(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading)
    return <div className="admin-loading">Loading admin dashboard...</div>;

  return (
    <div className="admin-dashboard" style={{ 
      padding: "20px", 
      paddingLeft: "20px", // Position correctly with sidebar
      marginLeft: "auto", // Push content to right of sidebar
      marginRight: "auto",
      maxWidth: "1200px",
      width: "100%",
      boxSizing: "border-box"
    }}>
      <h1>Admin Dashboard</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-tabs">
        <button
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={activeTab === "games" ? "active" : ""}
          onClick={() => setActiveTab("games")}
        >
          Games
        </button>
        <button
          className={activeTab === "stats" ? "active" : ""}
          onClick={() => setActiveTab("stats")}
        >
          Statistics
        </button>
        <button
          className={activeTab === "debug" ? "active" : ""}
          onClick={() => setActiveTab("debug")}
        >
          Debug
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "users" && renderUsers()}
        {activeTab === "games" && renderGames()}
        {activeTab === "stats" && renderStats()}
        {activeTab === "debug" && renderDebug()}
      </div>

      {renderUserModal()}
    </div>
  );
};

export default AdminDashboard;
