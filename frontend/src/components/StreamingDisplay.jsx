import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle, FaArrowRight, FaRedo } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';
import apiService from '../services/api';
import VerticalResearchTimeline from './VerticalResearchTimeline';
import ResearchProgress from './ResearchProgress';

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
  const [reportEventSource, setReportEventSource] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState('');
  const [showRawOutput, setShowRawOutput] = useState(false);
  
  // Store structured progress updates
  const [progressUpdates, setProgressUpdates] = useState([]);
  
  const contentRef = useRef(null);
  
  // Helper function to add a progress update with timestamp
  const addProgressUpdate = (type, content) => {
    console.log(`Adding progress update: type=${type}, content=${content.substring(0, 50)}...`);
    
    const now = new Date();
    
    // Check for duplicates within the same type
    const isDuplicate = progressUpdates.some(update => 
      update.type === type && update.content === content
    );
    
    if (!isDuplicate) {
      setProgressUpdates(prev => [
        ...prev,
        {
          type,
          content,
          timestamp: now.toISOString()
        }
      ]);
    }
  };
  
  // Scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent]);
  
  // Setup event source for main research progress streaming
  useEffect(() => {
    if (!sessionId) return;
    
    console.log(`Setting up main event stream for session ${sessionId}`);
    
    const source = apiService.streamResearchProgress(sessionId);
    setEventSource(source);
    
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received event data:", data);
        
        // Update processing status
        if (data.status) {
          setStatus(data.status);
          setProcessingStatus(data.status);
          
          // Update current step based on status
          const statusToStep = {
            'generating_plan': 'plan',
            'searching_web': 'search',
            'searching_web_again': 'search',
            'curating_context': 'curate',
            'evaluating_context': 'evaluate',
            'generating_report': 'report',
            'completed': 'report',
            'error': 'error'
          };
          
          if (statusToStep[data.status]) {
            setCurrentStep(statusToStep[data.status]);
          }
          
          // Update progress based on status
          const statusKeys = Object.keys(statusMessages);
          const currentIndex = statusKeys.indexOf(data.status);
          if (currentIndex >= 0) {
            const progressPercent = (currentIndex / (statusKeys.length - 1)) * 100;
            setProgress(progressPercent);
          }
          
          // Add status update to streaming content and progress updates
          if (statusMessages[data.status] && data.status !== 'error') {
            const statusMessage = statusMessages[data.status];
            appendToStreamingContent(`\n\n--- ${statusMessage} ---\n\n`);
            addProgressUpdate('status', statusMessage);
          }
          
          // Start report streaming if status is generating_report
          if (data.status === 'generating_report' && !reportEventSource) {
            startReportStreaming();
          }
        }
        
        // Handle backend details (links, processing steps, etc.)
        if (data.detail) {
          const detail = data.detail;
          const detailType = data.detail_type || 'info';
          
          // Add to progress updates
          addProgressUpdate(detailType, detail);
          
          // Add to streaming content for raw output
          if (detailType === 'link') {
            appendToStreamingContent(`\nSearching: ${detail}\n`);
          } else if (detailType === 'curation') {
            appendToStreamingContent(`\nCurating content from: ${detail}\n`);
          } else {
            appendToStreamingContent(`\n${detail}\n`);
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
            
            // Add to progress updates
            addProgressUpdate('error', data.error);
          }
        }
        
        // If report is completed
        if (data.status === 'completed' && data.report) {
          console.log("Report completed, setting final report");
          setFinalReport(data.report);
          setIsFinished(true);
          
          // Add completion message
          addProgressUpdate('report', 'Research report completed successfully');
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
      console.log("Cleaning up main event source");
      source.close();
    };
  }, [sessionId]);
  
  // Function to start report streaming
  const startReportStreaming = () => {
    if (!sessionId || reportEventSource) return;
    
    try {
      console.log(`Setting up report event stream for session ${sessionId}`);
      
      const reportSource = apiService.streamReportGeneration(sessionId);
      setReportEventSource(reportSource);
      
      reportSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            console.log(`Received report text: ${data.text.substring(0, 20)}...`);
            appendToStreamingContent(data.text);
            
            // Add to progress updates (chunk into smaller pieces for better display)
            if (data.text.length > 20) {
              addProgressUpdate('report', `Generating content: ${data.text.substring(0, 100)}...`);
            }
          }
        } catch (error) {
          console.error('Error parsing report stream data:', error);
        }
      };
      
      reportSource.onerror = (error) => {
        console.error('Report stream error:', error);
        // Don't set error here as we still have the main event source
        
        // Try to recreate the report stream with a delay if we're still in report generation
        if (status === 'generating_report') {
          console.log("Report stream error, attempting to reconnect in 3 seconds");
          setTimeout(() => {
            if (reportEventSource) {
              reportEventSource.close();
              setReportEventSource(null);
              startReportStreaming();
            }
          }, 3000);
        }
      };
    } catch (error) {
      console.error("Error starting report stream:", error);
    }
  };
  
  // Clean up report event source on unmount or status change
  useEffect(() => {
    return () => {
      if (reportEventSource) {
        console.log("Cleaning up report event source");
        reportEventSource.close();
      }
    };
  }, []);
  
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
    
    // Close existing event sources if any
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    if (reportEventSource) {
      reportEventSource.close();
      setReportEventSource(null);
    }
    
    // Reset content and status
    setStreamingContent('');
    setStatus('generating_plan');
    setProgressUpdates([]);
    
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
      className="max-w-6xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300 flex items-center">
          {getStatusIcon(status)}
          <span className="ml-3">Researching: {researchTopic}</span>
        </h2>
        
        <div className="mt-4">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {statusMessages[status] || 'Processing...'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Research Timeline */}
        <div className="col-span-1 card">
          <h3 className="text-lg font-semibold mb-3 text-primary-700 dark:text-primary-300 flex items-center">
            <FaArrowRight className="mr-2 text-primary-500" />
            Research Flow
          </h3>
          
          <VerticalResearchTimeline />
        </div>
        
        {/* Right column: Research Content & Progress */}
        <div className="col-span-1 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6">
            {/* Research Progress with improved structure */}
            <div className="card overflow-hidden">
              <ResearchProgress 
                progressUpdates={progressUpdates} 
                maxHeight="400px"
              />
            </div>
            
            {/* Raw Output (toggle) */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                  Raw Output
                </h3>
                
                <button 
                  onClick={() => setShowRawOutput(!showRawOutput)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {showRawOutput ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showRawOutput && (
                <div 
                  ref={contentRef}
                  className="terminal h-60 overflow-y-auto"
                >
                  {streamingContent || (
                    <div className="text-gray-400 dark:text-gray-500 h-full flex items-center justify-center">
                      Waiting for research to begin...
                    </div>
                  )}
                  <span className="typing-indicator"></span>
                </div>
              )}
            </div>
          </div>
          
          {hasError && (
            <div className="mt-4">
              <button
                onClick={handleRetry}
                className="btn btn-primary flex items-center mx-auto"
              >
                <FaRedo className="mr-2" />
                Start Over
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        <p>Your comprehensive research report is being generated. This may take several minutes depending on the complexity of the topic.</p>
      </div>
    </motion.div>
  );
};

export default StreamingDisplay;