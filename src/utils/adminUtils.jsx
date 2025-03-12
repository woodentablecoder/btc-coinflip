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

    if (!session) return false;

    // Query the user_roles table to check if user has admin role
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }

    return data?.role === "admin";
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
