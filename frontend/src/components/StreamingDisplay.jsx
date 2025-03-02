import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';
import apiService from '../services/api';

const statusMessages = {
  generating_plan: 'Generating a research plan...',
  searching_web: 'Searching the web for relevant information...',
  searching_web_again: 'Gathering additional information from the web...',
  curating_context: 'Organizing and curating the research findings...',
  evaluating_context: 'Evaluating the completeness of the research...',
  generating_report: 'Generating your detailed research report...',
  completed: 'Research completed!',
  error: 'An error occurred during research'
};

const getStatusIcon = (status) => {
  if (status === 'completed') return <FaCheckCircle className="text-green-500 text-xl" />;
  if (status === 'error') return <FaExclamationTriangle className="text-red-500 text-xl" />;
  return <FaSpinner className="animate-spin text-primary-500 text-xl" />;
};

const StreamingDisplay = ({ onComplete }) => {
  const { 
    sessionId,
    researchTopic,
    setProcessingStatus,
    streamingContent,
    setStreamingContent,
    appendToStreamingContent,
    setFinalReport,
    setError,
    setCurrentStep,
    resetResearch
  } = useResearch();
  
  const [status, setStatus] = useState('generating_plan');
  const [eventSource, setEventSource] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState('');
  
  const contentRef = useRef(null);
  
  // Scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent]);
  
  // Setup event source for streaming
  useEffect(() => {
    if (!sessionId) return;
    
    const source = apiService.streamResearchProgress(sessionId);
    setEventSource(source);
    
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update processing status
        if (data.status) {
          setStatus(data.status);
          setProcessingStatus(data.status);
          
          // Update progress based on status
          const statusKeys = Object.keys(statusMessages);
          const currentIndex = statusKeys.indexOf(data.status);
          if (currentIndex >= 0) {
            const progressPercent = (currentIndex / (statusKeys.length - 1)) * 100;
            setProgress(progressPercent);
          }
          
          // Add status update to streaming content
          if (statusMessages[data.status] && data.status !== 'error') {
            appendToStreamingContent(`\n\n--- ${statusMessages[data.status]} ---\n\n`);
          }
        }
        
        // Handle any error message
        if (data.error) {
          // Check if this is a new error message to avoid duplicates
          if (data.error !== lastErrorMessage) {
            setLastErrorMessage(data.error);
            appendToStreamingContent(`\n\n⚠️ ERROR: ${data.error}\n\n`);
            setError(data.error);
            setHasError(true);
          }
        }
        
        // If report is completed
        if (data.status === 'completed' && data.report) {
          setFinalReport(data.report);
          setIsFinished(true);
        }
      } catch (error) {
        console.error('Error parsing event data:', error);
        if (!hasError) {
          appendToStreamingContent(`\n\n⚠️ There was an error processing the research. Please try again.\n\n`);
          setHasError(true);
        }
      }
    };
    
    source.onerror = (error) => {
      console.error('EventSource error:', error);
      setError('Connection to the research stream was lost. The process may still be running in the background.');
      setHasError(true);
    };
    
    // Clean up event source on unmount
    return () => {
      source.close();
    };
  }, [sessionId, appendToStreamingContent, setError, setProcessingStatus, setFinalReport, lastErrorMessage, hasError]);
  
  // Additional event source for report streaming
  useEffect(() => {
    if (!sessionId || status !== 'generating_report') return;
    
    // Create a separate event source for report streaming
    const reportSource = apiService.streamReportGeneration(sessionId);
    
    reportSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.text) {
          appendToStreamingContent(data.text);
        }
      } catch (error) {
        console.error('Error parsing report stream data:', error);
      }
    };
    
    reportSource.onerror = (error) => {
      console.error('Report stream error:', error);
      // Don't set error here as we still have the main event source
    };
    
    // Clean up on unmount or status change
    return () => {
      reportSource.close();
    };
  }, [sessionId, status, appendToStreamingContent]);
  
  // Move to report stage when finished
  useEffect(() => {
    if (isFinished && onComplete) {
      setCurrentStep('report');
      onComplete();
    }
  }, [isFinished, onComplete, setCurrentStep]);
  
  // Handle retry
  const handleRetry = () => {
    // Reset error state
    setHasError(false);
    setLastErrorMessage('');
    setError(null);
    
    // Close existing event source if any
    if (eventSource) {
      eventSource.close();
    }
    
    // Reset content and status
    setStreamingContent('');
    setStatus('generating_plan');
    
    // Restart the research process
    resetResearch();
    if (onComplete) {
      // Take the user back to the input screen
      setCurrentStep('input');
      onComplete();
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5
      }
    }
  };
  
  return (
    <motion.div
      className="max-w-4xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
          {getStatusIcon(status)}
          <span className="ml-3">Researching: {researchTopic}</span>
        </h2>
        
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {statusMessages[status] || 'Processing...'}
          </p>
        </div>
      </div>
      
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-200">
          Research Progress
        </h3>
        
        <div 
          ref={contentRef}
          className="bg-gray-50 dark:bg-dark-200 border border-gray-200 dark:border-dark-border rounded-md p-4 h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap"
        >
          {streamingContent || (
            <div className="text-gray-400 dark:text-gray-500 h-full flex items-center justify-center">
              Waiting for research to begin...
            </div>
          )}
          <span className="typing-indicator"></span>
        </div>
        
        {hasError && (
          <div className="mt-4">
            <button
              onClick={handleRetry}
              className="btn btn-primary flex items-center mx-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Start Over
            </button>
          </div>
        )}
      </div>
      
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Your comprehensive research report is being generated. This may take several minutes depending on the complexity of the topic.</p>
      </div>
    </motion.div>
  );
};

export default StreamingDisplay;