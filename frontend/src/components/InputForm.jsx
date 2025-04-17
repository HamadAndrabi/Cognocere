import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaSpinner, FaPaperPlane } from 'react-icons/fa';
import { GiIronHulledWarship } from 'react-icons/gi';
import { useResearch } from '../contexts/ResearchContext';
import { useLLM } from '../contexts/LLMContext';
import apiService from '../services/api';

const InputForm = ({ onSubmit }) => {
  const { 
    setResearchTopic, 
    setSessionId, 
    setClarificationQuestions,
    setLoading,
    setError
  } = useResearch();
  
  const { selectedModel, setSelectedModel, models } = useLLM();
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState('');
  const textareaRef = useRef(null);
  
  // Add effect to prevent body scrolling
  useEffect(() => {
    // Save original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';
    
    // Cleanup function to restore original style
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  // Function to auto-resize the textarea
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      // Reset height to avoid constant growing
      textareaRef.current.style.height = 'auto';
      
      // Set the height based on the scroll height
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150); // Max height of 150px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };
  
  // Update textarea height when content changes
  useEffect(() => {
    autoResizeTextarea();
  }, [topic]);
  
  const handleTopicChange = (e) => {
    setTopic(e.target.value);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setInputError('Please enter a research topic');
      return;
    }
    
    setInputError('');
    setIsSubmitting(true);
    setLoading(true);
    
    try {
      const sessionData = await apiService.startResearch(topic, selectedModel);
      setSessionId(sessionData.session_id);
      setResearchTopic(topic);
      
      const questionsData = await apiService.getClarificationQuestions(sessionData.session_id);
      setClarificationQuestions(questionsData.questions || []);
      
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

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
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

  // Group models by provider
  const groupedModels = Object.entries(models).reduce((acc, [id, model]) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push({ id, ...model });
    return acc;
  }, {});
  
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-white to-primary-50 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center overflow-hidden">
      <motion.div
        className="max-w-3xl w-full mx-auto px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="ship-icon-container text-primary-500 dark:text-primary-300 text-6xl">
              <GiIronHulledWarship />
            </div>
          </div>
          <t1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-300 dark:to-primary-100">
            Cognocere
          </t1>
        </motion.div>
        
        <motion.form 
          variants={itemVariants}
          onSubmit={handleSubmit}
          className="bg-white dark:bg-primary-900/40 rounded-xl shadow-card p-4"
        >
          <div className="relative mb-2">
            <textarea
              ref={textareaRef}
              placeholder="How can I help you today?"
              value={topic}
              onChange={handleTopicChange}
              className="w-full px-5 py-4 pl-12 pr-4 rounded-lg bg-transparent text-primary-900 dark:text-primary-100 outline-none transition-all resize-none overflow-y-auto border-0 shadow-sm focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-primary-500/30"
              disabled={isSubmitting}
              style={{ minHeight: '56px', maxHeight: '150px' }}
            />
            <FaSearch className="absolute left-4 top-5 text-lg text-primary-400 dark:text-primary-500" />
          </div>
          
          <div className="flex items-center justify-end mt-2">
            <div className="relative mr-2 group">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800 hover:border-primary-300 dark:hover:border-primary-600 shadow-sm transition-all duration-150 cursor-pointer">
                <span className="text-primary-900 dark:text-primary-100 text-sm font-medium">
                  {models[selectedModel]?.name || 'Select Model'}
                </span>
                <svg className="h-4 w-4 text-primary-500 transition-transform duration-200 group-hover:text-primary-600" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
                <select
                  id="model"
                  value={selectedModel}
                  onChange={handleModelChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isSubmitting}
                >
                  {Object.entries(groupedModels).map(([provider, providerModels]) => (
                    <optgroup key={provider} label={provider.toUpperCase()}>
                      {providerModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            
            <button
              type="submit"
              className="p-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white transition-all duration-300 disabled:opacity-70 flex items-center justify-center"
              disabled={isSubmitting}
              aria-label="Send"
            >
              {isSubmitting ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaPaperPlane />
              )}
            </button>
          </div>
          
          {inputError && (
            <p className="mt-2 text-red-500 dark:text-red-400 text-sm">{inputError}</p>
          )}
        </motion.form>
      </motion.div>
    </div>
  );
};

export default InputForm;