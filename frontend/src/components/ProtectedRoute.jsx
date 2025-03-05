import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

/**
 * A wrapper for protected routes that redirects to login if the user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-primary-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    // Save the location they were trying to go to for later redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;