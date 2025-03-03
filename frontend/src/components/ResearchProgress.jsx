import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCaretDown, FaCaretRight, FaSearch, FaLink, FaFileAlt, FaCode, FaInfoCircle, FaClock } from 'react-icons/fa';

// Progress item component with improved styling and interaction
const ProgressItem = ({ type, content, timestamp }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get icon based on update type
  const getIcon = () => {
    switch (type) {
      case 'search':
        return <FaSearch className="text-primary-500" />;
      case 'link':
        return <FaLink className="text-accent-teal" />;
      case 'curation':
        return <FaCode className="text-accent-orange" />;
      case 'report':
        return <FaFileAlt className="text-accent-green" />;
      default:
        return <FaInfoCircle className="text-primary-500" />;
    }
  };
  
  // Get background color based on update type
  const getBgColor = () => {
    switch (type) {
      case 'search':
        return 'border-l-primary-400';
      case 'link':
        return 'border-l-blue-400';
      case 'curation':
        return 'border-l-orange-400';
      case 'report':
        return 'border-l-green-400';
      default:
        return 'border-l-gray-400';
    }
  };
  
  // Get formatted timestamp
  const getTime = () => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };
  
  // Check if content is long enough to need expansion
  const isExpandable = content && content.length > 80;
  
  return (
    <motion.div 
      className={`mb-2 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 ${getBgColor()} border-l-4`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className={`p-3 flex items-start justify-between ${isExpandable ? 'cursor-pointer' : ''}`}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        <div className="flex items-start w-full">
          <div className="mr-3 mt-1 flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm ${expanded ? 'font-medium' : ''} break-words`}>
              {isExpandable && !expanded ? content.substring(0, 80) + '...' : content}
            </div>
            {timestamp && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                <FaClock className="mr-1" size={10} />
                {getTime()}
              </div>
            )}
          </div>
        </div>
        {isExpandable && (
          <div className="ml-2 text-gray-400 flex-shrink-0">
            {expanded ? <FaCaretDown /> : <FaCaretRight />}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Research Progress component with better organization and visibility
const ResearchProgress = ({ progressUpdates = [], maxHeight = "500px" }) => {
  const [searchItems, setSearchItems] = useState([]);
  const [curationItems, setCurationItems] = useState([]);
  const [reportItems, setReportItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({
    search: true,
    curation: true,
    report: true
  });
  
  // Process and deduplicate updates
  useEffect(() => {
    console.log("Progress updates:", progressUpdates);
    
    // Function to remove duplicates while preserving order
    const deduplicateByContent = (items) => {
      const seen = new Set();
      return items.filter(item => {
        const key = item.content;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    
    // Group and deduplicate items by type
    const search = deduplicateByContent(
      progressUpdates.filter(item => item.type === 'search' || item.type === 'link')
    );
    
    const curation = deduplicateByContent(
      progressUpdates.filter(item => item.type === 'curation')
    );
    
    const report = deduplicateByContent(
      progressUpdates.filter(item => item.type === 'report')
    );
    
    setSearchItems(search);
    setCurationItems(curation);
    setReportItems(report);
    
    // Auto-expand the category with new items
    if (search.length > 0) setExpandedCategories(prev => ({ ...prev, search: true }));
    if (curation.length > 0) setExpandedCategories(prev => ({ ...prev, curation: true }));
    if (report.length > 0) setExpandedCategories(prev => ({ ...prev, report: true }));
    
  }, [progressUpdates]);
  
  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  
  // Check if there are any items
  const hasItems = searchItems.length > 0 || curationItems.length > 0 || reportItems.length > 0;
  
  // Get total item count
  const totalItems = searchItems.length + curationItems.length + reportItems.length;
  
  return (
    <div className="research-progress">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">
          Research Progress
        </h3>
        
        {hasItems && (
          <div className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
            {totalItems} {totalItems === 1 ? 'update' : 'updates'}
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto pr-1" style={{ maxHeight }}>
        {!hasItems ? (
          <div className="text-center text-gray-400 dark:text-gray-500 p-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            Research progress will appear here...
          </div>
        ) : (
          <>
            {/* Web Search Category */}
            {searchItems.length > 0 && (
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between mb-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md cursor-pointer"
                  onClick={() => toggleCategory('search')}
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-800/30 flex items-center justify-center mr-2">
                      <FaSearch className="text-xs text-primary-600 dark:text-primary-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                      Web Search
                    </h3>
                    <div className="ml-2 text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-full">
                      {searchItems.length}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedCategories.search ? <FaCaretDown /> : <FaCaretRight />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedCategories.search && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pl-2"
                    >
                      {searchItems.map((item, index) => (
                        <ProgressItem
                          key={`search-${index}`}
                          type={item.type}
                          content={item.content}
                          timestamp={item.timestamp}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Content Curation Category */}
            {curationItems.length > 0 && (
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between mb-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md cursor-pointer"
                  onClick={() => toggleCategory('curation')}
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-2">
                      <FaCode className="text-xs text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                      Content Curation
                    </h3>
                    <div className="ml-2 text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded-full">
                      {curationItems.length}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedCategories.curation ? <FaCaretDown /> : <FaCaretRight />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedCategories.curation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pl-2"
                    >
                      {curationItems.map((item, index) => (
                        <ProgressItem
                          key={`curation-${index}`}
                          type={item.type}
                          content={item.content}
                          timestamp={item.timestamp}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Report Generation Category */}
            {reportItems.length > 0 && (
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between mb-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md cursor-pointer"
                  onClick={() => toggleCategory('report')}
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                      <FaFileAlt className="text-xs text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                      Report Generation
                    </h3>
                    <div className="ml-2 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full">
                      {reportItems.length}
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedCategories.report ? <FaCaretDown /> : <FaCaretRight />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedCategories.report && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pl-2"
                    >
                      {reportItems.map((item, index) => (
                        <ProgressItem
                          key={`report-${index}`}
                          type={item.type}
                          content={item.content}
                          timestamp={item.timestamp}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResearchProgress;