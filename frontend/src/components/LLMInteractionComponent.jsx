import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaSpinner } from 'react-icons/fa';
import Markdown from 'react-markdown';
import apiService from '../services/api';
import { useLLM } from '../contexts/LLMContext';

const LLMInteractionComponent = ({ query, onComplete, onNewQuery }) => {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const responseRef = useRef(null);
  const { selectedModel } = useLLM();
  
  useEffect(() => {
    if (!query) return;
    
    setIsLoading(true);
    setResponse('');
    setError(null);
    
    // Create event source for streaming
    const eventSource = apiService.streamLLMResponse(query, selectedModel);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.content) {
        setResponse(prev => prev + data.content);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setError('An error occurred while getting the response. Please try again.');
      setIsLoading(false);
      eventSource.close();
    };
    
    eventSource.addEventListener('done', () => {
      setIsLoading(false);
      eventSource.close();
      if (onComplete) onComplete();
    });
    
    return () => {
      eventSource.close();
    };
  }, [query, selectedModel, onComplete]);
  
  // Auto-scroll as content is added
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);
  
  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-dark-100 rounded-xl shadow-lg p-6"
      >
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            {query}
          </h2>
          <button
            onClick={onNewQuery}
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
          >
            New Query
          </button>
        </div>
        
        <div 
          ref={responseRef}
          className="bg-primary-50 dark:bg-dark-200 rounded-lg p-4 h-[400px] overflow-y-auto custom-scrollbar"
        >
          {isLoading && !response && (
            <div className="flex justify-center items-center h-full">
              <FaSpinner className="animate-spin text-primary-500 text-3xl" />
            </div>
          )}
          
          {response && (
            <div className="prose dark:prose-invert prose-primary max-w-none">
              <Markdown>{response}</Markdown>
            </div>
          )}
          
          {isLoading && response && (
            <div className="flex items-center mt-4">
              <FaSpinner className="animate-spin text-primary-500 mr-2" />
              <span className="text-sm text-primary-500">Generating...</span>
            </div>
          )}
          
          {error && (
            <div className="text-red-500 dark:text-red-400 mt-4">
              {error}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LLMInteractionComponent;