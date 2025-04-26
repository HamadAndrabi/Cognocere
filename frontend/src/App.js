import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Context providers
import { ResearchContextProvider } from './contexts/ResearchContext';
import { AuthContextProvider } from './contexts/AuthContext';
import { LLMProvider } from './contexts/LLMContext';

// Components
import Header from './components/Header';
import InputForm from './components/InputForm';
import ClarificationQuestions from './components/ClarificationQuestions';
import UnifiedResearchView from './components/UnifiedResearchView';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import UserReports from './components/UserReports';
import ProfileSettings from './components/ProfileSettings';

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
};

// Main App component
function App() {
  const location = useLocation(); // Needed for AnimatePresence key

  return (
    <AuthContextProvider>
      <LLMProvider>
        <ResearchContextProvider>
          <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-dark-200 dark:to-dark-300 flex flex-col">
            <Header />
            
            <main className="flex-grow container mx-auto px-4 py-6">
              {/* Use location.pathname as key for transitions on route change */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname} 
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  variants={pageVariants}
                  className="h-full"
                >
                  <Routes location={location}> {/* Pass location to Routes */}
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    
                    {/* Research flow - Protected */}
                    <Route 
                      path="/research" 
                      element={
                        <ProtectedRoute>
                          <InputForm /> 
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/research/:sessionId/clarification" 
                      element={
                        <ProtectedRoute>
                          <ClarificationQuestions />
                        </ProtectedRoute>
                      }
                    />
                    <Route 
                      path="/research/:sessionId/view" 
                      element={
                        <ProtectedRoute>
                          <UnifiedResearchView />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Other Protected routes */}
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
                    <Route path="*" element={<Navigate to="/research" replace />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </ResearchContextProvider>
      </LLMProvider>
    </AuthContextProvider>
  );
}

export default App;