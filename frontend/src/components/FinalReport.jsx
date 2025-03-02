import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FaDownload, FaExternalLinkAlt, FaRedo, FaCopy, FaCheck } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';

const FinalReport = ({ onNewSearch }) => {
  const { 
    finalReport,
    researchTopic,
    resetResearch
  } = useResearch();
  
  const [copyStatus, setCopyStatus] = React.useState('idle');
  const reportRef = useRef(null);
  
  if (!finalReport) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No report is available yet.</p>
        <button 
          onClick={onNewSearch}
          className="btn btn-primary mt-4"
        >
          Start a New Research
        </button>
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
      className="max-w-4xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Research Complete
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Here's your comprehensive report on <span className="font-semibold">{researchTopic}</span>
        </p>
      </motion.div>
      
      <motion.div variants={itemVariants} className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={downloadReport}
          className="btn btn-outline flex items-center"
        >
          <FaDownload className="mr-2" />
          Download Report
        </button>
        
        <button
          onClick={copyToClipboard}
          className="btn btn-outline flex items-center"
          disabled={copyStatus === 'copied'}
        >
          {copyStatus === 'copied' ? (
            <>
              <FaCheck className="mr-2 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <FaCopy className="mr-2" />
              Copy to Clipboard
            </>
          )}
        </button>
        
        <button
          onClick={handleNewSearch}
          className="btn btn-primary flex items-center"
        >
          <FaRedo className="mr-2" />
          New Research
        </button>
      </motion.div>
      
      <motion.div
        ref={reportRef}
        variants={itemVariants}
        className="card"
      >
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <h1>{finalReport.title}</h1>
          
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
          
          <h2>References</h2>
          <ol className="list-decimal list-inside">
            {finalReport.references.map((ref, index) => (
              <li key={index} className="mb-2">
                <a 
                  href={ref.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {ref.title}
                  <FaExternalLinkAlt className="ml-2 text-xs" />
                </a>
              </li>
            ))}
          </ol>
          
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-dark-border text-sm text-gray-500 dark:text-gray-400">
            <p>
              Generated on: {finalReport.metadata.generated_at} • 
              Sources: {finalReport.metadata.sources_count}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FinalReport;