import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';
import apiService from '../services/api';

const InputForm = ({ onSubmit }) => {
  const { 
    setResearchTopic, 
    setSessionId, 
    setClarificationQuestions,
    setLoading,
    setError
  } = useResearch();
  
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!topic.trim()) {
      setInputError('Please enter a research topic');
      return;
    }
    
    setInputError('');
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // Start research session
      const sessionData = await apiService.startResearch(topic);
      
      // Set session ID and research topic
      setSessionId(sessionData.session_id);
      setResearchTopic(topic);
      
      // Get clarification questions
      const questionsData = await apiService.getClarificationQuestions(sessionData.session_id);
      setClarificationQuestions(questionsData.questions || []);
      
      // Move to clarification step
      if (onSubmit) onSubmit();
      
    } catch (error) {
      console.error('Error starting research:', error);
      setError('Failed to start research. Please try again.');
      setInputError('An error occurred. Please try again.');
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
      className="max-w-2xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-6 text-center">
        <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
          Deep Research Assistant
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Enter a research topic and our AI will conduct a thorough investigation for you.
        </p>
      </motion.div>
      
      <motion.form 
        variants={itemVariants}
        onSubmit={handleSubmit}
        className="card"
      >
        <div className="mb-4">
          <label 
            htmlFor="topic" 
            className="block mb-2 font-medium text-gray-700 dark:text-gray-200"
          >
            Research Topic
          </label>
          <div className="relative">
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic to research..."
              className="form-input pl-10"
              disabled={isSubmitting}
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
          {inputError && (
            <p className="mt-1 text-red-500 text-sm">{inputError}</p>
          )}
        </div>
        
        <div className="flex justify-center">
          <button
            type="submit"
            className="btn btn-primary flex items-center justify-center w-full md:w-auto md:px-8"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Starting Research...
              </>
            ) : (
              <>
                Start Research
              </>
            )}
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>The assistant will analyze your topic, ask clarifying questions, search the web, and create a detailed report with references.</p>
        </div>
      </motion.form>
      
      <motion.div variants={itemVariants} className="mt-8">
        <h3 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">Example Topics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "Climate change mitigation strategies",
            "The impact of artificial intelligence on healthcare",
            "Renewable energy technologies compared",
            "The future of autonomous vehicles",
            "Sustainable agriculture practices",
            "Quantum computing applications"
          ].map((example, index) => (
            <div 
              key={index}
              onClick={() => setTopic(example)}
              className="p-3 rounded-md border border-gray-200 dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
            >
              {example}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InputForm;