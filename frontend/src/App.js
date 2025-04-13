import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Context providers
import { ResearchContextProvider } from './contexts/ResearchContext';
import { AuthContextProvider } from './contexts/AuthContext';
import { LLMProvider } from './contexts/LLMContext';

// Components
import Header from './components/Header';
import InputForm from './components/InputForm';
import ClarificationQuestions from './components/ClarificationQuestions';
import StreamingDisplay from './components/StreamingDisplay';
import FinalReport from './components/FinalReport';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import UserReports from './components/UserReports';
import ProfileSettings from './components/ProfileSettings';

// Main App component
function App() {
  return (
    <AuthContextProvider>
      <LLMProvider>
        <ResearchContextProvider>
          <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-dark-200 dark:to-dark-300 flex flex-col">
            <Header />
            
            <main className="flex-grow container mx-auto px-4 py-6">
              <AnimatePresence mode="wait">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Research flow - Protected */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <ResearchFlow initialStage="input" />
                    </ProtectedRoute>
                  } />
                  <Route path="/research" element={
                    <ProtectedRoute>
                      <ResearchFlow initialStage="input" />
                    </ProtectedRoute>
                  } />
                  <Route path="/research/clarification" element={
                    <ProtectedRoute>
                      <ResearchFlow initialStage="clarification" />
                    </ProtectedRoute>
                  } />
                  <Route path="/research/processing" element={
                    <ProtectedRoute>
                      <ResearchFlow initialStage="processing" />
                    </ProtectedRoute>
                  } />
                  <Route path="/research/report" element={
                    <ProtectedRoute>
                      <ResearchFlow initialStage="report" />
                    </ProtectedRoute>
                  } />
                  
                  {/* Protected routes */}
                  <Route path="/reports" element={
                    <ProtectedRoute>
                      <UserReports />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  } />
                  
                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        </ResearchContextProvider>
      </LLMProvider>
    </AuthContextProvider>
  );
}

// Research flow component to handle the research stages
function ResearchFlow({ initialStage }) {
  const [researchStage, setResearchStage] = React.useState(initialStage);
  
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
  );
}

export default App;