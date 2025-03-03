import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSearch, 
  FaQuestionCircle, 
  FaSitemap, 
  FaGlobe, 
  FaLayerGroup, 
  FaCheckCircle, 
  FaFileAlt 
} from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';

const VerticalResearchTimeline = () => {
  const { processingStatus } = useResearch();
  const [visibleSteps, setVisibleSteps] = useState([]);
  
  // Define the stages of the research process
  const allSteps = [
    { 
      id: 'topic', 
      label: 'Research Topic', 
      icon: FaSearch,
      description: 'Analyzing the research topic and preparing clarification questions.'
    },
    { 
      id: 'clarification', 
      label: 'Clarification', 
      icon: FaQuestionCircle,
      description: 'Understanding the specific aspects of your research needs.'
    },
    { 
      id: 'plan', 
      label: 'Plan Generation', 
      icon: FaSitemap,
      description: 'Creating a comprehensive research plan to gather information efficiently.'
    },
    { 
      id: 'search', 
      label: 'Web Search', 
      icon: FaGlobe,
      description: 'Searching the internet for relevant and accurate information.'
    },
    { 
      id: 'curate', 
      label: 'Context Curation', 
      icon: FaLayerGroup,
      description: 'Organizing and summarizing the gathered information.'
    },
    { 
      id: 'evaluate', 
      label: 'Evaluation', 
      icon: FaCheckCircle,
      description: 'Evaluating the completeness and quality of the research.'
    },
    { 
      id: 'report', 
      label: 'Report Generation', 
      icon: FaFileAlt,
      description: 'Creating a detailed report with proper citations and structure.'
    }
  ];
  
  // Determine which steps should be visible based on current status
  useEffect(() => {
    let stepsToShow = [];
    
    // Status to step mapping
    const statusToStep = {
      'clarification_needed': ['topic'],
      'awaiting_clarification': ['topic', 'clarification'],
      'generating_plan': ['topic', 'clarification', 'plan'],
      'searching_web': ['topic', 'clarification', 'plan', 'search'],
      'searching_web_again': ['topic', 'clarification', 'plan', 'search'],
      'curating_context': ['topic', 'clarification', 'plan', 'search', 'curate'],
      'evaluating_context': ['topic', 'clarification', 'plan', 'search', 'curate', 'evaluate'],
      'generating_report': ['topic', 'clarification', 'plan', 'search', 'curate', 'evaluate', 'report'],
      'completed': allSteps.map(step => step.id)
    };
    
    if (statusToStep[processingStatus]) {
      stepsToShow = statusToStep[processingStatus].map(stepId => 
        allSteps.find(step => step.id === stepId)
      );
    } else {
      // Default case: show all steps if status is unknown
      stepsToShow = [...allSteps];
    }
    
    // Always ensure we have at least the first step
    if (stepsToShow.length === 0) {
      stepsToShow = [allSteps[0]];
    }
    
    setVisibleSteps(stepsToShow);
  }, [processingStatus]);
  
  // Function to determine if a step is active, completed, or waiting
  const getStepStatus = (stepId) => {
    // Map processing status to active step ID
    const getActiveStepId = () => {
      if (processingStatus === 'clarification_needed' || processingStatus === 'awaiting_clarification') {
        return 'clarification';
      } else if (processingStatus === 'generating_plan') {
        return 'plan';
      } else if (processingStatus === 'searching_web' || processingStatus === 'searching_web_again') {
        return 'search';
      } else if (processingStatus === 'curating_context') {
        return 'curate';
      } else if (processingStatus === 'evaluating_context') {
        return 'evaluate';
      } else if (processingStatus === 'generating_report') {
        return 'report';
      } else if (processingStatus === 'completed') {
        return 'report';
      }
      
      return 'topic';
    };
    
    const activeStepId = getActiveStepId();
    const stepOrder = allSteps.map(step => step.id);
    const currentIndex = stepOrder.indexOf(activeStepId);
    const stepIndex = stepOrder.indexOf(stepId);
    
    if (processingStatus === 'completed') {
      return 'completed';
    }
    
    if (stepIndex < currentIndex) {
      return 'completed';
    } else if (stepIndex === currentIndex) {
      return 'active';
    } else {
      return 'waiting';
    }
  };
  
  return (
    <div className="flex flex-col space-y-1">
      {visibleSteps.map((step, index) => {
        const status = getStepStatus(step.id);
        const isLast = index === visibleSteps.length - 1;
        
        return (
          <motion.div
            key={step.id}
            className="flex items-start relative"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            {/* Step indicator */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center z-10
              ${status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : ''}
              ${status === 'active' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 animate-pulse' : ''}
              ${status === 'waiting' ? 'bg-gray-100 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500' : ''}
              border ${status === 'completed' ? 'border-green-200 dark:border-green-800' : 
                      status === 'active' ? 'border-primary-300 dark:border-primary-700' : 
                      'border-gray-300 dark:border-gray-700'}
            `}>
              <step.icon size={14} />
            </div>
            
            {/* Connector line */}
            {!isLast && (
              <div className={`
                absolute left-4 top-8 bottom-0 w-0.5 -ml-px
                ${status === 'completed' ? 'bg-green-200 dark:bg-green-800' : 
                  status === 'active' ? 'bg-primary-200 dark:bg-primary-700' : 
                  'bg-gray-200 dark:bg-gray-700'}
              `}></div>
            )}
            
            {/* Step content */}
            <div className="ml-4 pb-6">
              <div className={`font-medium ${
                status === 'completed' ? 'text-green-600 dark:text-green-400' : 
                status === 'active' ? 'text-primary-600 dark:text-primary-400' : 
                'text-gray-500 dark:text-gray-400'
              }`}>
                {step.label}
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                {step.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default VerticalResearchTimeline;