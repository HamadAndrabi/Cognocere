import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FaDownload, FaExternalLinkAlt, FaRedo, FaCopy, FaCheck, FaFile, FaLink, FaBookmark, FaArrowRight } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';

const FinalReport = ({ onNewSearch }) => {
  const { 
    finalReport,
    researchTopic,
    resetResearch
  } = useResearch();
  
  const [copyStatus, setCopyStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('report');
  const reportRef = useRef(null);
  
  if (!finalReport) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="card p-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-dark-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaFile className="text-gray-400 dark:text-gray-500 text-xl" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">No report is available yet.</p>
          <button 
            onClick={onNewSearch}
            className="btn btn-primary"
          >
            Start a New Research
          </button>
        </div>
      </div>
    );
  }
  
  // Format the report as markdown
  const formatReport = () => {
    let markdown = `# ${finalReport.title}\n\n`;
    
    // Add introduction
    markdown += `## Introduction\n\n${finalReport.introduction}\n\n`;
    
    // Add sections
    finalReport.sections.forEach(section => {
      markdown += `## ${section.title}\n\n${section.content}\n\n`;
    });
    
    // Add conclusion
    markdown += `## Conclusion\n\n${finalReport.conclusion}\n\n`;
    
    // Add references
    markdown += `## References\n\n`;
    finalReport.references.forEach((ref, index) => {
      markdown += `${index + 1}. [${ref.title}](${ref.url})\n`;
    });
    
    return markdown;
  };
  
  // Download report as markdown
  const downloadReport = () => {
    const markdown = formatReport();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${finalReport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Copy report to clipboard
  const copyToClipboard = async () => {
    try {
      const markdown = formatReport();
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy report:', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };
  
  // Handle new search
  const handleNewSearch = () => {
    resetResearch();
    if (onNewSearch) onNewSearch();
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
  
  return (
    <motion.div
      className="max-w-5xl mx-auto py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-primary-700 dark:text-primary-300 font-display mb-1">
              Research Complete
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Here's your comprehensive report on <span className="font-semibold text-primary-600 dark:text-primary-400">{researchTopic}</span>
            </p>
          </div>
          
          <div className="flex gap-2">
            <motion.button
              onClick={downloadReport}
              className="btn btn-outline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaDownload className="mr-2" />
              Download
            </motion.button>
            
            <motion.button
              onClick={copyToClipboard}
              className="btn btn-outline"
              disabled={copyStatus === 'copied'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copyStatus === 'copied' ? (
                <>
                  <FaCheck className="mr-2 text-accent-green" />
                  Copied!
                </>
              ) : (
                <>
                  <FaCopy className="mr-2" />
                  Copy
                </>
              )}
            </motion.button>
            
            <motion.button
              onClick={handleNewSearch}
              className="btn btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaRedo className="mr-2" />
              New Research
            </motion.button>
          </div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mb-4">
        <div className="flex border-b border-gray-200 dark:border-dark-border">
          <button
            className={`px-4 py-2 font-medium flex items-center ${
              activeTab === 'report' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
            onClick={() => setActiveTab('report')}
          >
            <FaFile className="mr-2" />
            Full Report
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center ${
              activeTab === 'references' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
            onClick={() => setActiveTab('references')}
          >
            <FaLink className="mr-2" />
            References
          </button>
          <button
            className={`px-4 py-2 font-medium flex items-center ${
              activeTab === 'summary' 
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            <FaBookmark className="mr-2" />
            Summary
          </button>
        </div>
      </motion.div>
      
      <motion.div
        variants={itemVariants}
        className="card bg-white/80 dark:bg-dark-100/60 backdrop-blur-sm"
      >
        {activeTab === 'report' && (
          <div ref={reportRef} className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="text-primary-700 dark:text-primary-300 font-display">{finalReport.title}</h1>
            
            <h2>Introduction</h2>
            <div className="mb-6">
              <ReactMarkdown>{finalReport.introduction}</ReactMarkdown>
            </div>
            
            {finalReport.sections.map((section, index) => (
              <div key={index} className="mb-6">
                <h2>{section.title}</h2>
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            ))}
            
            <h2>Conclusion</h2>
            <div className="mb-6">
              <ReactMarkdown>{finalReport.conclusion}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {activeTab === 'references' && (
          <div>
            <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-4 font-display">References</h2>
            <div className="grid gap-4">
              {finalReport.references.map((ref, index) => (
                <motion.div 
                  key={index}
                  className="p-4 border border-gray-100 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-800/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mr-3 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div>
                      <a 
                        href={ref.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center"
                      >
                        {ref.title}
                        <FaExternalLinkAlt className="ml-2 text-xs" />
                      </a>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-all">{ref.url}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'summary' && (
          <div>
            <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-4 font-display">Summary</h2>
            <div className="mb-6">
              <ReactMarkdown>{finalReport.introduction}</ReactMarkdown>
            </div>
            
            <h3 className="text-xl font-bold text-primary-700 dark:text-primary-300 mb-3 font-display">Key Findings</h3>
            <div className="mb-6">
              <ul className="space-y-2">
                {finalReport.sections.map((section, index) => (
                  <li key={index} className="flex items-center">
                    <FaArrowRight className="text-primary-500 mr-2 flex-shrink-0" />
                    <span className="font-medium">{section.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <h3 className="text-xl font-bold text-primary-700 dark:text-primary-300 mb-3 font-display">Conclusion</h3>
            <div className="mb-6">
              <ReactMarkdown>{finalReport.conclusion}</ReactMarkdown>
            </div>
          </div>
        )}
        
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-dark-border text-sm text-gray-500 dark:text-gray-400">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p>
              Generated on: {finalReport.metadata.generated_at}
            </p>
            <p>
              Sources: {finalReport.metadata.sources_count}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FinalReport;