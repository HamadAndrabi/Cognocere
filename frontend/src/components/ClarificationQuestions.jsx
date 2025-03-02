import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaChevronRight, FaSpinner, FaArrowLeft } from 'react-icons/fa';
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
      className="max-w-3xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Clarify Your Research Topic
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please answer these questions to help us better understand what you're looking for about:
          <span className="font-semibold ml-1">{researchTopic}</span>
        </p>
      </motion.div>
      
      <motion.form 
        variants={itemVariants}
        onSubmit={handleSubmit}
        className="card"
      >
        {clarificationQuestions.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <FaSpinner className="animate-spin text-2xl text-gray-400" />
            <span className="ml-3 text-gray-500">Loading questions...</span>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-6">
              {clarificationQuestions.map((question, index) => (
                <div key={question.id} className="border-b border-gray-100 dark:border-dark-border pb-5 last:border-b-0 last:pb-0">
                  <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                    {index + 1}. {question.question}
                  </label>
                  <textarea
                    value={clarificationAnswers[question.id] || ''}
                    onChange={(e) => updateClarificationAnswer(question.id, e.target.value)}
                    placeholder="Your answer..."
                    className="form-input h-24 resize-y"
                    disabled={isSubmitting}
                  />
                  {validationErrors[question.id] && (
                    <p className="mt-1 text-red-500 text-sm">{validationErrors[question.id]}</p>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep('input')}
                className="btn btn-outline flex items-center"
                disabled={isSubmitting}
              >
                <FaArrowLeft className="mr-2" />
                Back
              </button>
              
              <button
                type="submit"
                className="btn btn-primary flex items-center"
                disabled={isSubmitting}
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
              </button>
            </div>
          </>
        )}
      </motion.form>
      
      <motion.div variants={itemVariants} className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
        <p>Your answers will help tailor the research to your specific needs.</p>
      </motion.div>
    </motion.div>
  );
};

export default ClarificationQuestions;