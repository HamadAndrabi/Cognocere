import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResearchContextProvider, useResearch } from './contexts/ResearchContext';
import Header from './components/Header';
import InputForm from './components/InputForm';
import ClarificationQuestions from './components/ClarificationQuestions';
import ProcessFlow from './components/ProcessFlow';
import StreamingDisplay from './components/StreamingDisplay';
import FinalReport from './components/FinalReport';

// Main application wrapper
function AppWrapper() {
  return (
    <ResearchContextProvider>
      <App />
    </ResearchContextProvider>
  );
}

// Main application component
function App() {
  const [researchStage, setResearchStage] = useState('input');
  const { currentStep } = useResearch();
  
  // Update research stage based on current step
  useEffect(() => {
    if (currentStep === 'input') {
      setResearchStage('input');
    } else if (currentStep === 'clarification') {
      setResearchStage('clarification');
    } else if (['plan', 'search', 'curate', 'evaluate', 'report'].includes(currentStep)) {
      setResearchStage('processing');
    }
  }, [currentStep]);
  
  const renderStageContent = () => {
    switch (researchStage) {
      case 'input':
        return <InputForm onSubmit={() => setResearchStage('clarification')} />;
      case 'clarification':
        return <ClarificationQuestions onSubmit={() => setResearchStage('processing')} />;
      case 'processing':
        return <StreamingDisplay onComplete={() => setResearchStage('report')} />;
      case 'report':
        return <FinalReport onNewSearch={() => setResearchStage('input')} />;
      default:
        return <InputForm onSubmit={() => setResearchStage('clarification')} />;
    }
  };
  
  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-dark-200 dark:to-dark-300 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={researchStage}
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
            className="h-full"
          >
            {renderStageContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      <footer className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-dark-border bg-white/50 backdrop-blur-sm dark:bg-dark-100/30">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} Cognocere - LLM-Powered Deep Researcher</p>
          <p className="text-xs mt-1">Designed for comprehensive research on any topic</p>
        </div>
      </footer>
    </div>
  );
}

export default AppWrapper;