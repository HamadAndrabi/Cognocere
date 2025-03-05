import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaFileAlt, FaExternalLinkAlt, FaTrash, FaSearch, FaSpinner } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const UserReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch user reports
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/user/reports`);
        setReports(response.data.reports || []);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load your reports. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, []);
  
  // Filter reports based on search term
  const filteredReports = reports.filter(report => 
    report.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    report.topic?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      className="max-w-6xl mx-auto py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300 font-display mb-2">
          My Research Reports
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage all your research reports
        </p>
      </motion.div>
      
      {/* Search and filters */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search your reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10 w-full"
          />
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </motion.div>
      
      {/* Reports list */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="card p-12 text-center">
            <FaSpinner className="animate-spin text-3xl text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Loading your reports...</p>
          </div>
        ) : error ? (
          <div className="card p-6 text-center">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary mt-4"
            >
              Try Again
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl text-gray-300 dark:text-gray-700 mx-auto mb-4">
              <FaFileAlt />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Research Reports Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start your first research to see your reports here.
            </p>
            <Link to="/" className="btn btn-primary">
              Start New Research
            </Link>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No reports match your search term "{searchTerm}".
            </p>
            <button 
              onClick={() => setSearchTerm('')} 
              className="btn btn-outline"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report, index) => (
              <motion.div
                key={report.session_id}
                className="card p-0 overflow-hidden hover:shadow-md transition-shadow duration-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="p-4 flex-grow">
                    <h3 className="font-semibold text-lg text-primary-700 dark:text-primary-300">
                      {report.title || `Research on ${report.topic}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Created on {formatDate(report.created_at)}
                    </p>
                  </div>
                  
                  <div className="border-t md:border-t-0 md:border-l border-gray-100 dark:border-dark-border p-3 flex items-center gap-2 bg-gray-50 dark:bg-dark-200/50">
                    <Link
                      to={`/research/report?session=${report.session_id}`}
                      className="btn btn-outline py-1 px-3 text-sm flex items-center"
                    >
                      <FaExternalLinkAlt className="mr-1" size={12} />
                      View
                    </Link>
                    
                    <button
                      className="btn py-1 px-3 text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 flex items-center"
                    >
                      <FaTrash className="mr-1" size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default UserReports;