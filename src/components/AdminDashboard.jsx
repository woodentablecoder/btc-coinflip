import React, { useState, useEffect } from "react";
import supabase from "../supabase";
import { isAdmin } from "../utils/adminUtils.jsx";
import "./AdminDashboard.css";

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
      // Try to fetch user data - check if auth.users is accessible first
      console.log("Fetching users...");
      try {
        const { data: authUsers, error: authError } = await supabase
          .from("auth.users")
          .select("*");

        if (!authError) {
          setUsers(authUsers || []);
          results.authUsers = { success: true, count: authUsers?.length || 0 };
        } else {
          results.authUsers = { success: false, error: authError.message };
          console.log("Falling back to user_roles for user data");

          // Try user_roles as fallback
          const { data: userRoles, error: rolesError } = await supabase
            .from("user_roles")
            .select("*");

          if (!rolesError) {
            setUsers(userRoles || []);
            results.userRoles = {
              success: true,
              count: userRoles?.length || 0,
            };
          } else {
            results.userRoles = { success: false, error: rolesError.message };
          }
        }
      } catch (error) {
        results.users = { success: false, error: error.message };
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
        const { data: balanceData, error: balanceError } = await supabase
          .from("balances")
          .select("*");

        if (!balanceError) {
          setBalances(balanceData || []);
          results.balances = { success: true, count: balanceData?.length || 0 };
        } else {
          results.balances = { success: false, error: balanceError.message };
        }
      } catch (error) {
        results.balances = { success: false, error: error.message };
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
              // Handle different user data structures
              const userId = user.id || user.user_id;
              const userEmail = user.email || "Unknown";
              const userBalance =
                balances.find((b) => b.user_id === userId)?.balance || 0;
              const userRole = user.role || "user";

              return (
                <tr key={userId}>
                  <td>{userId}</td>
                  <td>{userEmail}</td>
                  <td>{userBalance} BTC</td>
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
            <p>{totalVolume.toFixed(8)} BTC</p>
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
      <pre>{JSON.stringify(debug, null, 2)}</pre>
    </div>
  );

  const renderUserModal = () => {
    if (!selectedUser) return null;

    // Handle different user data structures
    const userId = selectedUser.id || selectedUser.user_id;
    const userEmail = selectedUser.email || "Unknown";

    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h2>Edit User: {userEmail}</h2>

          <div className="modal-section">
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
    <div className="admin-dashboard">
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
