import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
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
      className="max-w-4xl mx-auto py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300 font-display mb-2">
          Profile Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage your account settings
        </p>
      </motion.div>
      
      {/* Profile Info */}
      <motion.div variants={itemVariants} className="card mb-6">
        <h2 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
          <FaUser className="mr-2" />
          Account Information
        </h2>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || 'User'} 
              className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-dark-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center text-4xl">
              <FaUser />
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
              {user?.name || 'User'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {user?.email || 'No email available'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Signed in with Google
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-100 dark:border-dark-border pt-4">
          <button
            onClick={handleLogout}
            className="btn flex items-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            <FaSignOutAlt className="mr-2" />
            Sign Out
          </button>
        </div>
      </motion.div>
      
      {/* Application Settings */}
      <motion.div variants={itemVariants} className="card mb-6">
        <h2 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
          <FaCog className="mr-2" />
          Application Settings
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                Email Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive emails when your research reports are completed
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200">
                Save Research History
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically save your research sessions to your account
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </motion.div>
      
      {/* Data & Privacy */}
      <motion.div variants={itemVariants} className="card">
        <h2 className="text-lg font-semibold text-primary-700 dark:text-primary-300 mb-4">
          Data & Privacy
        </h2>
        
        <div className="mb-6">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
            Your Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We store your research reports and user information securely. You can download or delete your data at any time.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline">
              Download My Data
            </button>
            
            <button 
              onClick={() => setDeleteConfirmOpen(true)}
              className="btn bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/10 dark:hover:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
            >
              Delete My Account
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Delete Account Confirmation */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-white dark:bg-dark-100 rounded-lg p-6 max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Delete Your Account?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. All your data, including research reports, will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmOpen(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button className="btn bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700">
                Delete Account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileSettings;