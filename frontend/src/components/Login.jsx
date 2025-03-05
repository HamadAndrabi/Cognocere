import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaGoogle, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const { loginWithGoogle, getGoogleAuthUrl, loading, error, isAuthenticated } = useAuth();
  const [googleAuthUrl, setGoogleAuthUrl] = useState(null);
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect URL (for OAuth)
  const redirectUri = `${window.location.origin}/auth/callback`;
  
  // Get the return URL from location state
  const from = location.state?.from?.pathname || '/';
  
  useEffect(() => {
    // If already authenticated, redirect to home or return URL
    if (isAuthenticated()) {
      navigate(from, { replace: true });
    }
    
    // Get Google auth URL
    const fetchGoogleAuthUrl = async () => {
      const url = await getGoogleAuthUrl();
      setGoogleAuthUrl(url);
    };
    
    fetchGoogleAuthUrl();
  }, [isAuthenticated, navigate, from, getGoogleAuthUrl]);
  
  // Handle Google login
  const handleGoogleLogin = () => {
    if (googleAuthUrl) {
      setLoginInProgress(true);
      // Redirect to Google auth
      window.location.href = googleAuthUrl;
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div
        className="card max-w-md w-full bg-white/80 dark:bg-dark-100/60 backdrop-blur-sm"
        variants={itemVariants}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300 font-display mb-2">
            Welcome to Deep Researcher
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to save your research and access your reports.
          </p>
        </div>
        
        {error && (
          <motion.div 
            className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-md mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}
        
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || loginInProgress || !googleAuthUrl}
            className="btn w-full py-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
          >
            {loading || loginInProgress ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : (
              <FaGoogle className="text-red-500 mr-2" />
            )}
            {loading || loginInProgress ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;