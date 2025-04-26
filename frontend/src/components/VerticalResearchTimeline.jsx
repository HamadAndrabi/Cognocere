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
  const { processingStatus, activityLog } = useResearch();
  const [visibleSteps, setVisibleSteps] = useState([]);
  
  // Define the stages of the research process (start from Plan Generation)
  const allSteps = [
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
  
  // Map activity log entries to step ids
  const getStepActivities = (stepId) => {
    if (!activityLog) return [];
    console.log('DEBUG activityLog', activityLog);
    console.log('DEBUG stepId', stepId);
    const result = activityLog.filter(activity => activity.step === stepId);
    console.log('DEBUG getStepActivities result', result);
    return result;
  };
  
  // Determine which steps should be visible based on current status
  useEffect(() => {
    let stepsToShow = [];
    
    // Status to step mapping
    const statusToStep = {
      'clarification_needed': ['plan'],
      'awaiting_clarification': ['plan'],
      'generating_plan': ['plan'],
      'searching_web': ['plan', 'search'],
      'searching_web_again': ['plan', 'search'],
      'curating_context': ['plan', 'search', 'curate'],
      'evaluating_context': ['plan', 'search', 'curate', 'evaluate'],
      'generating_report': ['plan', 'search', 'curate', 'evaluate', 'report'],
      'report_generation': ['plan', 'search', 'curate', 'evaluate', 'report'],
      'report_generating': ['plan', 'search', 'curate', 'evaluate', 'report'],
      'report_in_progress': ['plan', 'search', 'curate', 'evaluate', 'report'],
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
        return 'plan';
      } else if (processingStatus === 'generating_plan') {
        return 'plan';
      } else if (processingStatus === 'searching_web' || processingStatus === 'searching_web_again') {
        return 'search';
      } else if (processingStatus === 'curating_context') {
        return 'curate';
      } else if (processingStatus === 'evaluating_context') {
        return 'evaluate';
      } else if (
        processingStatus === 'generating_report' ||
        processingStatus === 'report_generation' ||
        processingStatus === 'report_generating' ||
        processingStatus === 'report_in_progress'
      ) {
        return 'report';
      } else if (processingStatus === 'completed') {
        return 'report';
      }
      
      return 'plan';
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
  
  // Only show steps that are currently visible/progressed, animate in as they appear
  // Find the index of the current active step
  const activeStepId = (() => {
    if (processingStatus === 'clarification_needed' || processingStatus === 'awaiting_clarification') {
      return 'plan';
    } else if (processingStatus === 'generating_plan') {
      return 'plan';
    } else if (processingStatus === 'searching_web' || processingStatus === 'searching_web_again') {
      return 'search';
    } else if (processingStatus === 'curating_context') {
      return 'curate';
    } else if (processingStatus === 'evaluating_context') {
      return 'evaluate';
    } else if (
      processingStatus === 'generating_report' ||
      processingStatus === 'report_generation' ||
      processingStatus === 'report_generating' ||
      processingStatus === 'report_in_progress'
    ) {
      return 'report';
    } else if (processingStatus === 'completed') {
      return 'completed';
    }
    return 'plan';
  })();
  const activeStepIndex = visibleSteps.findIndex(s => s.id === activeStepId);

  return (
    <div className="flex flex-col items-stretch">
      <AnimatePresence>
        {visibleSteps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isLast = index === visibleSteps.length - 1;
          const activities = getStepActivities(step.id);
          // Only render up to the current active/completed step
          if (status === 'waiting') return null;
          return (
            <motion.div
              key={step.id}
              className="flex items-stretch relative w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: index * 0.18 }}
            >
              {/* Icon and Line Column */}
              <div className="flex flex-col items-center w-10 mr-4 flex-shrink-0">
                {/* Connector line above (fixed height) */}
                {index > 0 ? (
                  <div className={`h-8 w-1 ${index <= activeStepIndex ? 'bg-green-400 dark:bg-green-400' : status === 'active' ? 'bg-primary-400 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                ) : (
                  <div className="h-8 w-1"></div> /* Placeholder for alignment */
                )}
                {/* Icon Circle */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center z-10 flex-shrink-0
                  ${status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-400 dark:border-green-400' : ''}
                  ${status === 'active' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 border-primary-400 dark:border-primary-400 animate-pulse' : ''}
                  border-2 ${status === 'completed' ? 'border-green-400 dark:border-green-400' : 
                          status === 'active' ? 'border-primary-400 dark:border-primary-400' : 
                          'border-gray-300 dark:border-gray-700'}
                `}>
                  <step.icon size={20} />
                </div>
                {/* Connector line below (flex-1) */}
                {!isLast && (
                  <div className={`flex-1 w-1 ${index < activeStepIndex ? 'bg-green-400 dark:bg-green-400' : status === 'active' ? 'bg-primary-400 dark:bg-primary-400' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-8 pb-6">
                <div className={`font-medium ${
                  status === 'completed' ? 'text-green-600 dark:text-green-400' : 
                  status === 'active' ? 'text-primary-600 dark:text-primary-400' : 
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.label}
                </div>
                {/* Show backend activities if present, otherwise fallback to description */}
                {activities.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {activities.map((activity, idx) => (
                      <li key={idx} className="text-xs text-primary-400 dark:text-primary-300">
                        {activity.detail}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                    {step.description}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default VerticalResearchTimeline;