import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaSpinner, FaPaperPlane, FaChevronDown } from 'react-icons/fa';
import { GiIronHulledWarship } from 'react-icons/gi';
import { SiOpenai, SiGoogle } from 'react-icons/si';
import { useResearch } from '../contexts/ResearchContext';
import { useLLM } from '../contexts/LLMContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const customScrollbarStyle = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  margin: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(107, 114, 128, 0.3);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 0.5);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
`;

const InputForm = ({ onSubmit }) => {
  const { 
    setResearchTopic, 
    setSessionId, 
    setClarificationQuestions,
    setLoading,
    setError
  } = useResearch();
  
  const { selectedModel, setSelectedModel, models } = useLLM();
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState('');
  const textareaRef = useRef(null);
  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const fullGreeting = useRef(''); // Use ref to store the full greeting without causing re-renders on change
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef(null);

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

  useEffect(() => {
    const greeting = getGreeting();
    fullGreeting.current = greeting;
    setDisplayedGreeting('');
    
    let charIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (charIndex <= greeting.length) {
        setDisplayedGreeting(greeting.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typewriterInterval);
      }
    }, 100);
    
    return () => clearInterval(typewriterInterval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    // Get user's first name if available, or use a default greeting
    const userName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
    
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Morning';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'Afternoon';
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = 'Evening';
    } else {
      timeGreeting = 'Night';
    }
    
    // If we have a user name, include it in the greeting
    if (userName) {
      return `${timeGreeting}, ${userName}`;
    } else {
      // Fallback to a simple greeting if no user name is available
      return timeGreeting;
    }
  };

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
  
  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get provider icon
  const getProviderIcon = (provider) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return <SiOpenai className="w-4 h-4" />;
      case 'google':
        return <SiGoogle className="w-4 h-4" />;
      case 'groq':
        return <span className="font-bold text-xs">GR</span>;
      default:
        return null;
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

  // Group models by provider
  const groupedModels = Object.entries(models).reduce((acc, [id, model]) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push({ id, ...model });
    return acc;
  }, {});

  useEffect(() => {
    // Add custom scrollbar styles to the document
    const styleElement = document.createElement('style');
    styleElement.textContent = customScrollbarStyle;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-300 dark:to-primary-100 min-h-[60px] md:min-h-[72px]">
            {displayedGreeting}
          </h1>
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
            {/* Enhanced Model Selection Dropdown */}
            <div className="relative mr-2" ref={modelDropdownRef}>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800 hover:border-primary-300 dark:hover:border-primary-600 shadow-sm transition-all duration-150 text-primary-900 dark:text-primary-100 font-medium"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                disabled={isSubmitting}
              >
                {/* Model Icon + Name */}
                {models[selectedModel]?.provider && (
                  <span className="flex items-center gap-1.5">
                    {getProviderIcon(models[selectedModel].provider)}
                    <span className="text-sm font-medium">
                      {models[selectedModel]?.name || 'Select Model'}
                    </span>
                  </span>
                )}
                <FaChevronDown className={`h-3 w-3 text-primary-500 transition-transform duration-200 ${isModelDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isModelDropdownOpen && (
                <div className="absolute z-50 mt-1 w-64 max-h-[320px] overflow-y-auto rounded-md bg-white dark:bg-primary-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none custom-scrollbar">
                  <div className="py-1">
                    {Object.entries(groupedModels).map(([provider, providerModels]) => (
                      <div key={provider}>
                        {/* Provider Header */}
                        <div className="px-3 py-2 text-xs font-semibold text-primary-500 dark:text-primary-300 border-b border-primary-100 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/40 flex items-center gap-2">
                          {getProviderIcon(provider)}
                          {provider.toUpperCase()}
                        </div>
                        
                        {/* Provider Models */}
                        {providerModels.map(model => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-700/40 flex items-center justify-between group ${
                              selectedModel === model.id ? 'bg-primary-100 dark:bg-primary-700/50 font-medium' : ''
                            }`}
                          >
                            <span className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              {model.description && (
                                <span className="text-xs text-primary-400 dark:text-primary-500 mt-0.5">{model.description}</span>
                              )}
                            </span>
                            
                            {selectedModel === model.id && (
                              <span className="text-primary-600 dark:text-primary-300">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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