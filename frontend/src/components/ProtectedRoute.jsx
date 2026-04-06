import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useUserAuth from "../hooks/useUserAuth";

export default function ProtectedRoute({ children }) {
  const { token, isVerifyingToken } = useUserAuth();
  const location = useLocation();

  if (isVerifyingToken) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    );
  }

  if (!token) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
