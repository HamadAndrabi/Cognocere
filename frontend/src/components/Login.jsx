import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGoogle, FaSpinner, FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';
import { GiIronHulledWarship } from 'react-icons/gi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Login = () => {
  const { loginWithGoogle, getGoogleAuthUrl, loading, error, isAuthenticated } = useAuth();
  const [googleAuthUrl, setGoogleAuthUrl] = useState(null);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
  
  // Handle Email login
  const handleEmailLogin = (e) => {
    e.preventDefault();
    // Implement email login here
    console.log('Email login with:', email, password);
    // You would connect this to your auth provider
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
  
  const buttonVariants = {
    idle: { scale: 1 },
    hover: { 
      scale: 1.03,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.98 }
  };

  return (
    <>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-800 dark:to-gray-950" />
        <div className="absolute inset-0 opacity-10 dark:opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>
      
      <motion.div
        className="min-h-screen flex items-center justify-center p-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Login Form */}
        <motion.div 
          className="w-full max-w-md"
          variants={itemVariants}
        >
          <motion.div
            className="card bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-white/20 dark:border-gray-700/50 rounded-xl overflow-hidden shadow-xl"
            variants={itemVariants}
            style={{
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              position: "relative"
            }}
          >
            {/* Glass highlight effect */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent dark:from-gray-800/30 dark:to-transparent pointer-events-none"></div>
            
            <div className="px-8 py-10 relative z-10">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="w-16 h-16 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center">
                  <GiIronHulledWarship className="w-10 h-10 text-white" />
                </div>
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
              
              <AnimatePresence mode="wait">
                {showEmailLogin ? (
                  <motion.form 
                    key="email-form"
                    className="space-y-4 mb-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleEmailLogin}
                  >
                    <div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="text-gray-400" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 bg-white/70 dark:bg-gray-900/70 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600"
                          placeholder="Email"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="text-gray-400" />
                        </div>
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 bg-white/70 dark:bg-gray-900/70 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600"
                          placeholder="Password"
                          required
                        />
                      </div>
                    </div>
                    
                    <motion.button
                      type="submit"
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                    >
                      {loading || loginInProgress ? (
                        <FaSpinner className="animate-spin mr-2" />
                      ) : (
                        <FaArrowRight className="mr-2" />
                      )}
                      {loading || loginInProgress ? 'Signing in...' : 'Sign in'}
                    </motion.button>
                    
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowEmailLogin(false)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                      >
                        Back
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="social-login"
                    className="space-y-4 mb-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <motion.button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading || loginInProgress || !googleAuthUrl}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="w-full py-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center justify-center shadow-sm transition-all duration-200"
                    >
                      {loading || loginInProgress ? (
                        <FaSpinner className="animate-spin mr-2" />
                      ) : (
                        <FaGoogle className="text-red-500 mr-2" />
                      )}
                      {loading || loginInProgress ? 'Signing in...' : 'Google'}
                    </motion.button>
                    
                    <motion.button
                      type="button"
                      onClick={() => setShowEmailLogin(true)}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="w-full py-3 bg-primary-600 dark:bg-primary-700 text-white border border-primary-600 dark:border-primary-700 hover:bg-primary-700 dark:hover:bg-primary-800 rounded-md flex items-center justify-center shadow-sm transition-all duration-200"
                    >
                      <FaEnvelope className="mr-2" />
                      Email
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                <p>By signing in, you agree to our Terms and Privacy Policy.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Login;