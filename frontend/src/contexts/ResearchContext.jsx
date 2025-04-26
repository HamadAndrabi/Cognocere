import React, { createContext, useState, useContext } from 'react';

// Create the context
const ResearchContext = createContext();

// Custom hook to use the research context
export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchContextProvider');
  }
  return context;
};

// Provider component
export const ResearchContextProvider = ({ children }) => {
  // State for the research process
  const [sessionId, setSessionId] = useState(null);
  const [researchTopic, setResearchTopic] = useState('');
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState('input');
  const [processingStatus, setProcessingStatus] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [finalReport, setFinalReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  // Reset the research state
  const resetResearch = () => {
    setSessionId(null);
    setResearchTopic('');
    setClarificationQuestions([]);
    setClarificationAnswers({});
    setCurrentStep('input');
    setProcessingStatus('');
    setStreamingContent('');
    setFinalReport(null);
    setError(null);
    setActivityLog([]);
  };

  // Update clarification answer
  const updateClarificationAnswer = (questionId, answer) => {
    setClarificationAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Add to streaming content
  const appendToStreamingContent = (text) => {
    setStreamingContent(prev => prev + text);
  };

  // Add activity to activity log
  const addActivity = (step, detail) => {
    setActivityLog(prev => [...prev, { step, detail, timestamp: new Date().toISOString() }]);
  };

  // Value object to be provided by the context
  const value = {
    sessionId,
    setSessionId,
    researchTopic,
    setResearchTopic,
    clarificationQuestions,
    setClarificationQuestions,
    clarificationAnswers,
    updateClarificationAnswer,
    currentStep,
    setCurrentStep,
    processingStatus,
    setProcessingStatus,
    streamingContent,
    setStreamingContent,
    appendToStreamingContent,
    activityLog,
    addActivity,
    finalReport,
    setFinalReport,
    error,
    setError,
    loading,
    setLoading,
    resetResearch
  };

  return (
    <ResearchContext.Provider value={value}>
      {children}
    </ResearchContext.Provider>
  );
};