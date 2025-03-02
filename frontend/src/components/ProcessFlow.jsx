import React from 'react';
import { motion } from 'framer-motion';
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

const ProcessFlow = ({ currentStage }) => {
  const { processingStatus } = useResearch();
  
  // Define the stages of the research process
  const stages = [
    { id: 'input', label: 'Topic', icon: FaSearch },
    { id: 'clarification', label: 'Clarify', icon: FaQuestionCircle },
    { id: 'plan', label: 'Plan', icon: FaSitemap },
    { id: 'search', label: 'Search', icon: FaGlobe },
    { id: 'curate', label: 'Curate', icon: FaLayerGroup },
    { id: 'evaluate', label: 'Evaluate', icon: FaCheckCircle },
    { id: 'report', label: 'Report', icon: FaFileAlt }
  ];
  
  // Function to determine if a stage is active, completed, or waiting
  const getStageStatus = (stageId) => {
    // Stages for input form
    if (currentStage === 'input') {
      return stageId === 'input' ? 'active' : 'waiting';
    }
    
    // Stages for clarification
    if (currentStage === 'clarification') {
      if (stageId === 'input') return 'completed';
      if (stageId === 'clarification') return 'active';
      return 'waiting';
    }
    
    // Stages for processing
    if (currentStage === 'processing') {
      if (stageId === 'input' || stageId === 'clarification') return 'completed';
      
      // Map processing status to stages
      if (processingStatus === 'generating_plan' && stageId === 'plan') return 'active';
      if (processingStatus === 'searching_web' && stageId === 'search') return 'active';
      if (processingStatus === 'curating_context' && stageId === 'curate') return 'active';
      if (processingStatus === 'evaluating_context' && stageId === 'evaluate') return 'active';
      if (processingStatus === 'generating_report' && stageId === 'report') return 'active';
      
      // Mark stages before current as completed
      const stageIndex = stages.findIndex(s => s.id === stageId);
      const currentStatusIndex = stages.findIndex(s => {
        if (processingStatus === 'generating_plan') return s.id === 'plan';
        if (processingStatus === 'searching_web') return s.id === 'search';
        if (processingStatus === 'curating_context') return s.id === 'curate';
        if (processingStatus === 'evaluating_context') return s.id === 'evaluate';
        if (processingStatus === 'generating_report') return s.id === 'report';
        return s.id === 'plan'; // Default to plan stage
      });
      
      if (stageIndex < currentStatusIndex) return 'completed';
      if (stageIndex > currentStatusIndex) return 'waiting';
    }
    
    // Stages for final report
    if (currentStage === 'report') {
      return stageId === 'report' ? 'active' : 'completed';
    }
    
    return 'waiting';
  };
  
  // Function to get CSS classes for a stage
  const getStageClasses = (status) => {
    if (status === 'active') return 'step-indicator-active';
    if (status === 'completed') return 'step-indicator-completed';
    return 'step-indicator-waiting';
  };
  
  // Function to get CSS classes for a connector
  const getConnectorClasses = (status) => {
    if (status === 'active' || status === 'completed') {
      return status === 'active' ? 'step-connector-active' : 'step-connector-completed';
    }
    return '';
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05 
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: -10, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };
  
  return (
    <motion.div 
      className="bg-white dark:bg-dark-100 rounded-lg shadow-md p-4 mx-auto max-w-4xl"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-center justify-between flex-wrap md:flex-nowrap">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <motion.div 
              className="flex flex-col items-center my-2 md:my-0"
              variants={itemVariants}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${getStageClasses(getStageStatus(stage.id))}`}
              >
                <stage.icon />
              </div>
              <span className="text-xs mt-1 text-center text-gray-600 dark:text-gray-300">
                {stage.label}
              </span>
            </motion.div>
            
            {index < stages.length - 1 && (
              <motion.div 
                className={`step-connector ${getConnectorClasses(getStageStatus(stage.id))}`}
                variants={itemVariants}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

export default ProcessFlow;