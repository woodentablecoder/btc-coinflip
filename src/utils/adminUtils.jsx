import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase";

/**
 * Check if the current user has admin privileges
 * @returns {Promise<boolean>} True if user is an admin, false otherwise
 */
export const isAdmin = async () => {
  try {
    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      console.log("No active session found during admin check");
      return false;
    }

    // Add a debug log
    console.log("Checking admin role for user:", session.user.id);

    // Query the user_roles table to check if user has admin role
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      // Check for specific cases where the user might not have a role yet
      if (error.code === 'PGRST116') {
        console.log("User has no role assigned yet (not found)");
        return false;
      }
      console.error("Error checking admin role:", error);
      return false;
    }

    if (!data) {
      console.log("No role data found for user");
      return false;
    }

    const isUserAdmin = data.role === "admin";
    console.log("User admin role check result:", isUserAdmin);
    return isUserAdmin;
  } catch (error) {
    console.error("Error in admin check:", error);
    return false;
  }
};

/**
 * Higher-order component to protect admin routes
 * @param {Component} Component The component to protect
 * @returns {Component} Protected component
 */
export const withAdminAuth = (Component) => {
  return (props) => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
      const checkAdminStatus = async () => {
        const adminStatus = await isAdmin();
        setIsAuthorized(adminStatus);
        setLoading(false);

        if (!adminStatus) {
          navigate("/", { replace: true });
        }
      };

      checkAdminStatus();
    }, [navigate]);

    if (loading) {
      return <div>Checking authorization...</div>;
    }

    return isAuthorized ? <Component {...props} /> : null;
  };
};
