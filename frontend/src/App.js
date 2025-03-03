import React, { useState } from 'react';
import { ResearchContextProvider } from './contexts/ResearchContext';
import Header from './components/Header';
import InputForm from './components/InputForm';
import ClarificationQuestions from './components/ClarificationQuestions';
import ProcessFlow from './components/ProcessFlow';
import StreamingDisplay from './components/StreamingDisplay';
import FinalReport from './components/FinalReport';

function App() {
  const [researchStage, setResearchStage] = useState('input');
  
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
  
  return (
    <ResearchContextProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-200 flex flex-col">
        <Header />
        
        <main className="flex-grow container mx-auto px-4 py-8">
          <ProcessFlow currentStage={researchStage} />
          
          <div className="mt-8 animate-fade-in">
            {renderStageContent()}
          </div>
        </main>
        
        <footer className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-dark-border">
          <p>© {new Date().getFullYear()} Cognocere</p>
        </footer>
      </div>
    </ResearchContextProvider>
  );
}

export default App;