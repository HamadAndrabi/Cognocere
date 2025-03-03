import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, 
  FaQuestionCircle, 
  FaSitemap, 
  FaGlobe, 
  FaLayerGroup, 
  FaCheckCircle, 
  FaFileAlt,
  FaLink,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';

const VerticalProcessFlow = () => {
  const { 
    processingStatus, 
    streamingContent,
    researchTopic
  } = useResearch();
  
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [activities, setActivities] = useState({});
  
  // Define all possible steps
  const allSteps = [
    { id: 'input', label: 'Topic', icon: FaSearch, description: 'Defining research topic' },
    { id: 'clarification', label: 'Clarify', icon: FaQuestionCircle, description: 'Understanding requirements' },
    { id: 'plan', label: 'Plan', icon: FaSitemap, description: 'Creating research strategy' },
    { id: 'search', label: 'Search', icon: FaGlobe, description: 'Gathering information' },
    { id: 'curate', label: 'Curate', icon: FaLayerGroup, description: 'Organizing findings' },
    { id: 'evaluate', label: 'Evaluate', icon: FaCheckCircle, description: 'Assessing completeness' },
    { id: 'report', label: 'Report', icon: FaFileAlt, description: 'Generating final report' }
  ];
  
  // Extract activities from streaming content
  useEffect(() => {
    // Mock activity data extraction from streaming content
    const extractActivities = (content) => {
      const newActivities = { ...activities };
      
      // Check for search related content
      if (content.includes('Searching the web')) {
        const links = [
          'https://example.com/research-paper-1',
          'https://example.com/blog-article-about-topic',
          'https://example.com/academic-journal'
        ];
        newActivities.search = links;
      }
      
      // Check for curation related content
      if (content.includes('Organizing and curating')) {
        newActivities.curate = 'Organizing research findings and extracting key insights...';
      }
      
      // Check for evaluation related content
      if (content.includes('Evaluating the completeness')) {
        newActivities.evaluate = 'Evaluating research completeness and identifying gaps...';
      }
      
      // Check for report generation
      if (content.includes('Generating your detailed research')) {
        newActivities.report = 'Creating comprehensive research report with citations...';
      }
      
      // Check for errors
      if (content.includes('ERROR:')) {
        const errorMatch = content.match(/ERROR: ([^⚠️]+)/);
        if (errorMatch) {
          const errorStep = getStepFromError(errorMatch[1]);
          if (errorStep) {
            newActivities[errorStep] = {
              error: true,
              message: errorMatch[1]
            };
          }
        }
      }
      
      return newActivities;
    };
    
    // Try to determine which step had error
    const getStepFromError = (errorText) => {
      if (errorText.includes('plan generation')) return 'plan';
      if (errorText.includes('web search')) return 'search';
      if (errorText.includes('context curation')) return 'curate';
      if (errorText.includes('evaluation')) return 'evaluate';
      if (errorText.includes('report generation')) return 'report';
      return null;
    };
    
    setActivities(extractActivities(streamingContent));
  }, [streamingContent]);
  
  // Determine which steps should be visible based on status
  useEffect(() => {
    const stepsToShow = [];
    
    // Map status to visible steps
    const statusToStep = {
      'clarification_needed': ['input'],
      'awaiting_clarification': ['input', 'clarification'],
      'generating_plan': ['input', 'clarification', 'plan'],
      'searching_web': ['input', 'clarification', 'plan', 'search'],
      'searching_web_again': ['input', 'clarification', 'plan', 'search'],
      'curating_context': ['input', 'clarification', 'plan', 'search', 'curate'],
      'evaluating_context': ['input', 'clarification', 'plan', 'search', 'curate', 'evaluate'],
      'generating_report': ['input', 'clarification', 'plan', 'search', 'curate', 'evaluate', 'report'],
      'completed': ['input', 'clarification', 'plan', 'search', 'curate', 'evaluate', 'report']
    };
    
    if (statusToStep[processingStatus]) {
      // Filter allSteps to only include steps that should be visible
      const visibleStepIds = statusToStep[processingStatus];
      stepsToShow.push(...allSteps.filter(step => visibleStepIds.includes(step.id)));
    } else {
      // Default to showing just input
      stepsToShow.push(allSteps[0]);
    }
    
    setVisibleSteps(stepsToShow);
  }, [processingStatus]);
  
  // Get current step ID based on processing status
  const getCurrentStepId = () => {
    const statusToStepMap = {
      'clarification_needed': 'input',
      'awaiting_clarification': 'clarification',
      'generating_plan': 'plan',
      'searching_web': 'search',
      'searching_web_again': 'search',
      'curating_context': 'curate',
      'evaluating_context': 'evaluate',
      'generating_report': 'report',
      'completed': 'report'
    };
    
    return statusToStepMap[processingStatus] || 'input';
  };
  
  const currentStepId = getCurrentStepId();
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };
  
  const activityVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { 
      height: 'auto', 
      opacity: 1,
      transition: { duration: 0.3, delay: 0.2 }
    }
  };
  
  // Render activity content
  const renderActivity = (stepId) => {
    const activity = activities[stepId];
    
    if (!activity) return null;
    
    // If this is an error
    if (activity.error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/30 rounded-md p-3 mt-2 text-red-600 dark:text-red-300 text-sm">
          <FaExclamationTriangle className="inline-block mr-2" />
          {activity.message}
        </div>
      );
    }
    
    // Handle different types of activities
    switch (stepId) {
      case 'search':
        return (
          <div className="bg-primary-50 dark:bg-primary-800/30 rounded-md p-3 mt-2 text-primary-800 dark:text-primary-200 text-sm">
            <div className="font-medium mb-2">Exploring sources:</div>
            {Array.isArray(activity) && activity.map((link, index) => (
              <div key={index} className="flex items-start mb-2 last:mb-0">
                <FaLink className="mt-1 mr-2 text-primary-500 dark:text-primary-300 flex-shrink-0" />
                <div>
                  <div className="text-primary-700 dark:text-primary-300">{link}</div>
                  <div className="text-xs text-primary-600/70 dark:text-primary-400/70">Extracting information...</div>
                </div>
              </div>
            ))}
          </div>
        );
        
      case 'curate':
      case 'evaluate':
      case 'report':
        return (
          <div className="bg-primary-50 dark:bg-primary-800/30 rounded-md p-3 mt-2 text-primary-800 dark:text-primary-200 text-sm">
            {activity}
            <div className="mt-2 h-1.5 bg-primary-100 dark:bg-primary-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 dark:bg-primary-300 rounded-full animate-progress"></div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-col space-y-2 px-2 py-4">
      <motion.div 
        className="space-y-4 w-full"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <AnimatePresence>
          {visibleSteps.map((step, index) => (
            <motion.div 
              key={step.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="relative"
            >
              {/* Connection line */}
              {index < visibleSteps.length - 1 && (
                <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-primary-200 dark:bg-primary-700"></div>
              )}
              
              <div className="flex items-start">
                {/* Step icon */}
                <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  step.id === currentStepId 
                    ? 'bg-primary-500 text-white dark:bg-primary-400 dark:text-primary-900' 
                    : index < visibleSteps.findIndex(s => s.id === currentStepId)
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-400 dark:bg-primary-900 dark:text-primary-600'
                }`}>
                  <step.icon className="text-xl" />
                </div>
                
                {/* Step content */}
                <div className="ml-4 flex-grow">
                  <div className="flex items-center">
                    <h3 className={`font-medium ${
                      step.id === currentStepId 
                        ? 'text-primary-700 dark:text-primary-300' 
                        : index < visibleSteps.findIndex(s => s.id === currentStepId)
                          ? 'text-primary-700 dark:text-primary-400'
                          : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </h3>
                    
                    {step.id === currentStepId && (
                      <div className="ml-3 px-2 py-0.5 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                        Active
                      </div>
                    )}
                    
                    {index < visibleSteps.findIndex(s => s.id === currentStepId) && (
                      <div className="ml-3 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        Completed
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step.description}
                    {step.id === 'input' && researchTopic && `: "${researchTopic}"`}
                  </p>
                  
                  {/* Activity details - only show for active or post-active steps */}
                  {(step.id === currentStepId || index < visibleSteps.findIndex(s => s.id === currentStepId)) && (
                    <AnimatePresence>
                      <motion.div
                        variants={activityVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                      >
                        {renderActivity(step.id)}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default VerticalProcessFlow;