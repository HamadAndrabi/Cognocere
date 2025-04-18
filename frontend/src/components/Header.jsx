import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FaMoon, FaSun, FaSignInAlt, FaUserCircle, FaSignOutAlt, FaHistory, FaCog } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { GiIronHulledWarship } from 'react-icons/gi';

const Header = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const themeTransitionTimeoutRef = useRef(null);

  // Initialize dark mode based on system preference or localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else {
      setDarkMode(prefersDark);
    }
  }, []);

  // Update document classes and localStorage when dark mode changes
  useEffect(() => {
    // Remove the transition blocker class if it exists
    document.documentElement.classList.remove('notransition');
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', darkMode);
    
    // Set transitioning state to true
    setIsTransitioning(true);
    
    // Clear any existing timeout
    if (themeTransitionTimeoutRef.current) {
      clearTimeout(themeTransitionTimeoutRef.current);
    }
    
    // Set a timeout to mark the end of transition
    themeTransitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 350); // Slightly longer than the CSS transition duration
    
    return () => {
      if (themeTransitionTimeoutRef.current) {
        clearTimeout(themeTransitionTimeoutRef.current);
      }
    };
  }, [darkMode]);
  
  // Add scroll effect to header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle dark mode with debounce to prevent rapid toggling
  const toggleDarkMode = useCallback(() => {
    // If currently transitioning, don't allow another toggle
    if (isTransitioning) return;
    
    // Add a class to prevent flashing during transition
    document.documentElement.classList.add('notransition');
    
    // Use a setTimeout to ensure the class is applied before toggling
    setTimeout(() => {
      setDarkMode(prevMode => !prevMode);
    }, 10);
  }, [isTransitioning]);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setProfileMenuOpen(false);
    navigate('/');
  };
  
  // Handle login
  const handleLogin = () => {
    navigate('/login');
  };
  
  // Profile menu items
  const ProfileMenu = () => (
    <motion.div
      ref={profileMenuRef}
      className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-100 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-dark-border"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
        <div className="font-medium text-gray-800 dark:text-white truncate">{user?.name || 'User'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</div>
      </div>
      
      <Link 
        to="/reports" 
        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 flex items-center"
        onClick={() => setProfileMenuOpen(false)}
      >
        <FaHistory className="mr-2" />
        My Reports
      </Link>
      
      <Link 
        to="/profile" 
        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 flex items-center"
        onClick={() => setProfileMenuOpen(false)}
      >
        <FaCog className="mr-2" />
        Profile Settings
      </Link>
      
      <button 
        onClick={handleLogout}
        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-200 flex items-center"
      >
        <FaSignOutAlt className="mr-2" />
        Sign Out
      </button>
    </motion.div>
  );

  return (
    <motion.header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-md shadow-md dark:bg-dark-100/80' 
          : 'bg-gradient-metallic dark:bg-gradient-blue'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
    >
      <div className="container mx-auto flex justify-between items-center py-4 px-6">
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <div className="text-primary-500 dark:text-primary-300 text-3xl bg-primary-50 dark:bg-primary-800 p-2 rounded-lg">
              <GiIronHulledWarship />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-300 dark:from-primary-300 dark:to-primary-100 m-0">
              Cognocere
            </h1>
          </div>
        </Link>
        
        <div className="flex items-center space-x-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-primary-600 dark:text-primary-300 hover:bg-primary-100/50 dark:hover:bg-primary-800/30 transition-colors"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
          </motion.button>
          
          {isAuthenticated() ? (
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2 p-1 px-2 rounded-full text-primary-600 dark:text-primary-300 hover:bg-primary-100/50 dark:hover:bg-primary-800/30"
              >
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name || 'User'} 
                    className="w-8 h-8 rounded-full border-2 border-white/50"
                  />
                ) : (
                  <FaUserCircle className="text-2xl" />
                )}
                <span className="text-sm hidden md:block">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
              </motion.button>
              
              {profileMenuOpen && <ProfileMenu />}
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              className="flex items-center space-x-2 bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-white px-3 py-1.5 rounded-full"
            >
              <FaSignInAlt />
              <span className="hidden md:block">Sign In</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default Header;