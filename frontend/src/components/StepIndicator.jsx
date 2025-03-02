import React from 'react';
import { motion } from 'framer-motion';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';

/**
 * A component that displays a step in a multi-step process
 * @param {Object} props Component props
 * @param {string} props.title The title of the step
 * @param {string} props.description Optional description of the step
 * @param {string} props.status The status of the step (waiting, active, completed, error)
 * @param {React.ReactNode} props.icon Optional custom icon to display
 * @param {number} props.step Step number
 */
const StepIndicator = ({ 
  title, 
  description, 
  status = 'waiting', 
  icon = null,
  step = 1 
}) => {
  // Determine the status icon
  const getStatusIcon = () => {
    if (icon) return icon;
    
    switch (status) {
      case 'active':
        return <FaSpinner className="animate-spin" />;
      case 'completed':
        return <FaCheckCircle />;
      case 'error':
        return <span className="text-red-500">!</span>;
      default:
        return <span>{step}</span>;
    }
  };
  
  // Determine container classes based on status
  const getContainerClasses = () => {
    const baseClasses = "flex items-start";
    
    switch (status) {
      case 'active':
        return `${baseClasses} text-primary-600 dark:text-primary-400`;
      case 'completed':
        return `${baseClasses} text-green-600 dark:text-green-400`;
      case 'error':
        return `${baseClasses} text-red-600 dark:text-red-400`;
      default:
        return `${baseClasses} text-gray-400 dark:text-gray-500`;
    }
  };
  
  // Determine indicator classes based on status
  const getIndicatorClasses = () => {
    const baseClasses = "w-8 h-8 flex items-center justify-center rounded-full mr-3";
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-primary-100 dark:bg-primary-900 border-2 border-primary-500`;
      case 'completed':
        return `${baseClasses} bg-green-100 dark:bg-green-900 border-2 border-green-500`;
      case 'error':
        return `${baseClasses} bg-red-100 dark:bg-red-900 border-2 border-red-500`;
      default:
        return `${baseClasses} bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700`;
    }
  };
  
  // Animation variants
  const variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };
  
  return (
    <motion.div
      className={getContainerClasses()}
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      <div className={getIndicatorClasses()}>
        {getStatusIcon()}
      </div>
      
      <div>
        <h4 className="font-medium text-gray-800 dark:text-white">
          {title}
        </h4>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default StepIndicator;