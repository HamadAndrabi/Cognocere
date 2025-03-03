import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaChevronRight, FaSpinner, FaArrowLeft, FaQuestionCircle } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';
import apiService from '../services/api';

const ClarificationQuestions = ({ onSubmit }) => {
  const { 
    sessionId, 
    researchTopic,
    clarificationQuestions,
    clarificationAnswers,
    updateClarificationAnswer,
    setCurrentStep,
    setLoading,
    setError
  } = useResearch();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Validate answers before submission
  const validateAnswers = () => {
    const errors = {};
    clarificationQuestions.forEach(question => {
      if (!clarificationAnswers[question.id]?.trim()) {
        errors[question.id] = 'Please provide an answer to this question';
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all answers
    if (!validateAnswers()) {
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // Submit answers
      await apiService.submitClarificationAnswers(sessionId, {
        answers: clarificationAnswers
      });
      
      // Generate search plan
      await apiService.generatePlan(sessionId);
      
      // Set current step to processing
      setCurrentStep('processing');
      
      // Move to processing step
      if (onSubmit) onSubmit();
      
    } catch (error) {
      console.error('Error submitting clarification answers:', error);
      setError('Failed to process clarification answers. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
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
      className="max-w-3xl mx-auto py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h2 className="text-3xl font-bold text-primary-700 dark:text-primary-300 font-display mb-3">
          Let's clarify your research needs
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please answer these questions to help us better understand what you're looking for about:
          <span className="font-semibold ml-1 text-primary-600 dark:text-primary-400">{researchTopic}</span>
        </p>
      </motion.div>
      
      <motion.form 
        variants={itemVariants}
        onSubmit={handleSubmit}
        className="card bg-white/50 dark:bg-dark-100/40 backdrop-blur-sm"
      >
        {clarificationQuestions.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <FaSpinner className="animate-spin text-2xl text-primary-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading questions...</span>
          </div>
        ) : (
          <>
            <div className="space-y-8 mb-8">
              {clarificationQuestions.map((question, index) => (
                <motion.div 
                  key={question.id} 
                  className="border-b border-gray-100 dark:border-dark-border pb-6 last:border-b-0 last:pb-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <label className="flex items-start mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-800/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mr-3 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="font-medium text-gray-800 dark:text-gray-200 text-lg pt-1">
                      {question.question}
                    </div>
                  </label>
                  <div className="ml-11">
                    <textarea
                      value={clarificationAnswers[question.id] || ''}
                      onChange={(e) => updateClarificationAnswer(question.id, e.target.value)}
                      placeholder="Your answer..."
                      className="form-input h-24 resize-y bg-white/80 dark:bg-dark-200/50 backdrop-blur-xs"
                      disabled={isSubmitting}
                    />
                    {validationErrors[question.id] && (
                      <p className="mt-1 text-accent-red text-sm">{validationErrors[question.id]}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              <motion.button
                type="button"
                onClick={() => setCurrentStep('input')}
                className="btn btn-outline flex items-center"
                disabled={isSubmitting}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <FaArrowLeft className="mr-2" />
                Back
              </motion.button>
              
              <motion.button
                type="submit"
                className="btn btn-primary flex items-center"
                disabled={isSubmitting}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <FaChevronRight className="ml-2" />
                  </>
                )}
              </motion.button>
            </div>
          </>
        )}
      </motion.form>
      
      <motion.div variants={itemVariants} className="mt-6 text-center">
        <div className="flex items-center justify-center text-primary-500 dark:text-primary-400 mb-2">
          <FaQuestionCircle className="mr-2" />
          <span className="font-medium">Why do we ask these questions?</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your answers help us tailor the research to your specific needs and ensure we deliver the most relevant information.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ClarificationQuestions;