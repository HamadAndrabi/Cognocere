import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaSpinner } from 'react-icons/fa';
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

  const handleExampleClick = (example) => {
    setTopic(example);
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

  const examples = [
    "Climate change mitigation strategies",
    "The impact of artificial intelligence on healthcare",
    "Renewable energy technologies compared",
    "The future of autonomous vehicles",
    "Sustainable agriculture practices",
    "Quantum computing applications"
  ];

  // Group models by provider
  const groupedModels = Object.entries(models).reduce((acc, [id, model]) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push({ id, ...model });
    return acc;
  }, {});
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-primary-50 dark:from-primary-900 dark:to-primary-800 py-10">
      <motion.div
        className="max-w-3xl mx-auto px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="mb-12 text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="text-primary-500 dark:text-primary-300 text-6xl">
              <GiIronHulledWarship />
            </div>
          </div>
          <t1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500 dark:from-primary-300 dark:to-primary-100">
            Cognocere
          </t1>
          <p className="text-xl text-primary-600 dark:text-primary-300 max-w-2xl mx-auto">
            Explore any topic with AI-powered deep research
          </p>
        </motion.div>
        
        <motion.form 
          variants={itemVariants}
          onSubmit={handleSubmit}
          className="bg-white dark:bg-primary-900/40 rounded-xl shadow-card p-8 mb-10"
        >
          <div className="mb-6">
            <label 
              htmlFor="topic" 
              className="block mb-2 font-medium text-primary-700 dark:text-primary-300"
            >
              What would you like to research?
            </label>
            <div className="relative">
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic to research..."
                className="w-full px-4 py-3 pl-12 rounded-lg border-2 border-primary-100 dark:border-primary-700 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-primary-500/30 bg-transparent text-primary-900 dark:text-primary-100 outline-none transition-all"
                disabled={isSubmitting}
              />
              <FaSearch className="absolute left-4 top-3.5 text-lg text-primary-400 dark:text-primary-500" />
            </div>
            {inputError && (
              <p className="mt-2 text-red-500 dark:text-red-400 text-sm">{inputError}</p>
            )}
          </div>

          <div className="mb-6">
            <label 
              htmlFor="model" 
              className="block mb-2 font-medium text-primary-700 dark:text-primary-300"
            >
              Select AI Model
            </label>
            <select
              id="model"
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full px-4 py-3 rounded-lg border-2 border-primary-100 dark:border-primary-700 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-primary-500/30 bg-transparent text-primary-900 dark:text-primary-100 outline-none transition-all"
              disabled={isSubmitting}
            >
              {Object.entries(groupedModels).map(([provider, providerModels]) => (
                <optgroup key={provider} label={provider.toUpperCase()}>
                  {providerModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div className="flex justify-center">
            <button
              type="submit"
              className="w-full py-3 px-6 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-medium rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Starting Research...
                </>
              ) : (
                <>
                  Start Deep Research
                </>
              )}
            </button>
          </div>
          
          <div className="mt-6 text-sm text-primary-600 dark:text-primary-400">
            <p className="text-center">Our AI will analyze your topic, ask clarifying questions, search the web, and create a detailed report with references.</p>
          </div>
        </motion.form>
        
        <motion.div variants={itemVariants} className="mb-10">
          <h3 className="text-xl font-semibold mb-4 text-primary-700 dark:text-primary-300 text-center">
            Popular Research Topics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {examples.map((example, index) => (
              <div 
                key={index}
                onClick={() => handleExampleClick(example)}
                className="p-4 rounded-lg border-2 border-primary-100 dark:border-primary-700/60 hover:border-primary-400 dark:hover:border-primary-500 bg-white dark:bg-primary-900/40 cursor-pointer hover:shadow-md transition-all duration-200 text-primary-700 dark:text-primary-300"
              >
                {example}
              </div>
            ))}
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-primary-600 dark:text-primary-400 max-w-xl mx-auto">
            Cognocere uses AI to conduct deep research on any topic, analyzing multiple sources to provide comprehensive, fact-based reports with proper citations.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InputForm;