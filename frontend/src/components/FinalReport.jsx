import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaDownload, FaExternalLinkAlt, FaRedo, FaCopy, FaCheck, FaFile, FaLink, FaBookmark, FaArrowRight, FaFilePdf } from 'react-icons/fa';
import { useResearch } from '../contexts/ResearchContext';
import html2pdf from 'html2pdf.js';

const FinalReport = ({ onNewSearch }) => {
  const { 
    finalReport,
    researchTopic,
    resetResearch
  } = useResearch();
  
  const [copyStatus, setCopyStatus] = useState('idle'); 
  const [downloadStatus, setDownloadStatus] = useState('idle'); 
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [exportStatus, setExportStatus] = useState('idle');
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const reportRef = useRef(null);
  const downloadMenuRef = useRef(null);

  // Handle click outside for closing download menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setDownloadMenuOpen(false);
      }
    }
    if (downloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadMenuOpen]);

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
  
  // Export report as PDF
  const exportToPdf = async () => {
    if (!reportRef.current) return;
    
    try {
      setExportStatus('exporting');
      
      // Force light mode and readable text for PDF export
      const reportNode = reportRef.current;
      const originalBg = reportNode.style.backgroundColor;
      const originalColor = reportNode.style.color;
      reportNode.style.backgroundColor = '#fff';
      reportNode.style.color = '#222';
      reportNode.classList.add('pdf-export-mode');

      // Store original state of citation links to restore later
      const citationLinks = reportNode.querySelectorAll('.citation-link');
      const originalStyles = Array.from(citationLinks).map(link => ({
        element: link,
        style: link.getAttribute('style') || '',
        class: link.getAttribute('class') || '',
        html: link.innerHTML
      }));
      
      // Temporarily restyle citation links for PDF (superscript, blue, underlined, inline)
      citationLinks.forEach(link => {
        link.style.backgroundColor = 'transparent';
        link.style.color = '#2563eb';
        link.style.border = 'none';
        link.style.borderRadius = '0';
        link.style.width = 'auto';
        link.style.height = 'auto';
        link.style.display = 'inline';
        link.style.alignItems = '';
        link.style.justifyContent = '';
        link.style.fontSize = '13px';
        link.style.textDecoration = 'underline';
        link.style.margin = '0 1px';
        link.style.verticalAlign = 'super';
        link.innerHTML = `<sup>${link.textContent}</sup>`;
      });
      
      // PDF export options
      const options = {
        margin: [10, 10, 10, 10],
        filename: `${finalReport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Generate PDF
      await html2pdf().from(reportNode).set(options).save();
      
      // Restore original styling for citations
      originalStyles.forEach(item => {
        if (item.style) {
          item.element.setAttribute('style', item.style);
        } else {
          item.element.removeAttribute('style');
        }
        item.element.setAttribute('class', item.class);
        item.element.innerHTML = item.html;
      });
      // Restore report background and color
      reportNode.style.backgroundColor = originalBg;
      reportNode.style.color = originalColor;
      reportNode.classList.remove('pdf-export-mode');
      
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 2000);
    }
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
  
  // Define the code renderer component for reuse
  const CodeRenderer = ({ darkMode }) => ({node, inline, className, children, ...props}) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    return !inline && match ? (
      <SyntaxHighlighter
        style={darkMode ? vscDarkPlus : vs}
        language={language}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };
  
  // Custom paragraph renderer with citation transformation
  const ParagraphRenderer = () => ({ children }) => {
    if (!finalReport || !finalReport.references) return <p>{children}</p>;
    
    // Find citations in the format [1, 2, 3] or [1]
    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    let content = String(children);
    let key = 0;
    
    // Convert React children to string if needed
    if (typeof content !== 'string') {
      if (Array.isArray(children)) {
        content = children.map(child => 
          typeof child === 'string' ? child : 
          (child?.props?.children ? String(child.props.children) : '')
        ).join('');
      } else {
        return <p>{children}</p>; // If we can't process it, return as is
      }
    }
    
    // Process each citation match
    while ((match = citationRegex.exec(content)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.substring(lastIndex, match.index)}</span>);
      }
      
      // Process the citation numbers
      const citationNumbers = match[1].split(',').map(num => parseInt(num.trim(), 10));
      
      // Add citation links as inline blue underlined superscript numbers
      parts.push(
        <span key={key++}>
          {citationNumbers.map((num, i) => {
            // Ensure reference exists
            const reference = finalReport.references.find(ref => ref.index === num);
            if (!reference) return <sup key={i}>[{num}]</sup>;
            return (
              <a
                key={i}
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="citation-link"
                style={{
                  color: '#2563eb',
                  textDecoration: 'underline',
                  fontSize: '13px',
                  verticalAlign: 'super',
                  background: 'none',
                  border: 'none',
                  borderRadius: 0,
                  width: 'auto',
                  height: 'auto',
                  padding: 0,
                  margin: '0 1px',
                  display: 'inline',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                title={reference.title}
              >
                <sup>{num}</sup>
              </a>
            );
          })}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.substring(lastIndex)}</span>);
    }
    
    return <p>{parts}</p>;
  };
  
  const DownloadIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="inline-block"><path d="M12 4v12m0 0l-4-4m4 4l4-4"/><rect x="4" y="18" width="16" height="2" rx="1"/></svg>
  );
  const CopyIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="inline-block"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>
  );
  const RefreshIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="inline-block"><path d="M4.93 4.93a10 10 0 1 1-1.32 12.74"/><path d="M4 4v5h5"/></svg>
  );
  const ChevronDownIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="inline-block"><path d="M6 9l6 6 6-6"/></svg>
  );
  const SpinnerIcon = () => (
    <svg className="animate-spin" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeOpacity=".2" strokeWidth="4"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/></svg>
  );
  const CheckIcon = () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
  );

  const ReportTabIcon = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 9h10M7 13h4"/></svg>
  );
  const ReferencesTabIcon = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M17 7a5 5 0 0 1 0 10M7 17a5 5 0 0 1 0-10"/><path d="M8.59 15.41 15.42 8.59"/></svg>
  );
  const SummaryTabIcon = () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h6M8 17h4"/></svg>
  );

  const handleCopy = () => {
    copyToClipboard();
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleDownload = (type) => {
    setDownloadStatus('downloading');
    setTimeout(() => setDownloadStatus('downloaded'), 900); 
    setTimeout(() => setDownloadStatus('idle'), 2200);
    if (type === 'md') downloadReport();
    else if (type === 'pdf') exportToPdf();
  };

  const handleNewResearch = () => {
    setRefreshSpin(true);
    setTimeout(() => setRefreshSpin(false), 1000);
    onNewSearch();
  };

  return (
    <motion.div
      className="max-w-5xl mx-auto py-10 flex flex-col items-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-6 text-lg text-center max-w-2xl mx-auto text-gray-700 dark:text-gray-200">
        Here's your comprehensive report on <span className="font-semibold text-primary-700 dark:text-primary-300">{finalReport?.topic || ''}</span>
      </p>
      <div
        ref={reportRef}
        className="bg-white dark:bg-dark-900 rounded-2xl shadow-lg p-8 max-w-4xl w-full mx-auto mb-8 mt-2 border border-gray-100 dark:border-dark-800 transition-all"
        style={{ fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.7 }}
      >
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-primary-700 dark:text-primary-300 font-display text-2xl md:text-3xl font-bold mb-0">
            {finalReport.title}
          </h1>
          <div className="flex items-center">
            <div className="flex bg-gray-100 dark:bg-dark-800 rounded-full shadow-sm px-2 py-1 gap-1 border border-gray-200 dark:border-dark-700">
              {[
                { key: 'report', icon: <ReportTabIcon />, label: 'Report' },
                { key: 'references', icon: <ReferencesTabIcon />, label: 'References' },
                { key: 'summary', icon: <SummaryTabIcon />, label: 'Summary' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`group rounded-full p-2 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-400 ${activeTab === tab.key
                    ? 'bg-primary-600 text-white shadow dark:bg-primary-400 dark:text-dark-900'
                    : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'}
                  `}
                  style={{ minWidth: 40, minHeight: 40 }}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                  aria-label={tab.label}
                >
                  {tab.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
        {activeTab === 'report' && (
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2>Introduction</h2>
            <div className="mb-6">
              <ReactMarkdown components={{ 
                code: CodeRenderer({ darkMode: true }),
                p: ParagraphRenderer()
              }}>
                {finalReport.introduction}
              </ReactMarkdown>
            </div>
            
            {finalReport.sections.map((section, index) => (
              <div key={index} className="mb-6">
                <h2>{section.title}</h2>
                <ReactMarkdown components={{ 
                  code: CodeRenderer({ darkMode: true }),
                  p: ParagraphRenderer()
                }}>
                  {section.content}
                </ReactMarkdown>
              </div>
            ))}
            
            <h2>Conclusion</h2>
            <div className="mb-6">
              <ReactMarkdown components={{ 
                code: CodeRenderer({ darkMode: true }),
                p: ParagraphRenderer()
              }}>
                {finalReport.conclusion}
              </ReactMarkdown>
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
              <ReactMarkdown components={{ 
                code: CodeRenderer({ darkMode: true }),
                p: ParagraphRenderer()
              }}>
                {finalReport.introduction}
              </ReactMarkdown>
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
              <ReactMarkdown components={{ 
                code: CodeRenderer({ darkMode: true }),
                p: ParagraphRenderer()
              }}>
                {finalReport.conclusion}
              </ReactMarkdown>
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
      </div>
      <div className="flex gap-4 flex-wrap justify-center items-center mb-7">
        <div className="relative" ref={downloadMenuRef}>
          <button
            className={`btn btn-primary rounded-full shadow-sm flex items-center gap-2 px-5 py-2 text-base font-semibold transition-all hover:bg-primary-700 ${downloadMenuOpen ? 'ring-2 ring-primary-300 dark:ring-primary-700' : ''} ${downloadStatus === 'downloaded' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={() => setDownloadMenuOpen(open => !open)}
            type="button"
            style={{minWidth: 140}}
            disabled={downloadStatus === 'downloading'}
          >
            {downloadStatus === 'downloading' ? <SpinnerIcon /> : downloadStatus === 'downloaded' ? <CheckIcon /> : <DownloadIcon />}
            {downloadStatus === 'downloaded' ? 'Downloaded!' : 'Download'}
            <ChevronDownIcon />
          </button>
          {downloadMenuOpen && (
            <div className="absolute left-0 mt-2 min-w-[180px] bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
              <button
                className="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors border-b border-gray-100 dark:border-dark-700 flex items-center gap-3"
                onClick={() => {
                  setDownloadMenuOpen(false);
                  handleDownload('md');
                }}
                type="button"
                disabled={downloadStatus === 'downloading'}
              >
                <span role="img" aria-label="Markdown">📝</span>
                Download as Markdown
              </button>
              <button
                className="w-full text-left px-5 py-3 text-base text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors flex items-center gap-3"
                onClick={() => {
                  setDownloadMenuOpen(false);
                  handleDownload('pdf');
                }}
                type="button"
                disabled={downloadStatus === 'downloading'}
              >
                <span role="img" aria-label="PDF">📄</span>
                Download as PDF
              </button>
            </div>
          )}
        </div>
        <button
          className={`btn btn-outline rounded-full shadow-sm flex items-center gap-2 px-5 py-2 text-base font-semibold transition hover:bg-gray-100 dark:hover:bg-dark-700 ${copyStatus === 'copied' ? 'bg-green-500 text-white border-green-600 hover:bg-green-600' : ''}`}
          onClick={handleCopy}
          type="button"
          disabled={copyStatus === 'copied'}
        >
          {copyStatus === 'copied' ? <CheckIcon /> : <CopyIcon />}
          {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
        </button>
        <button
          className={`btn btn-primary rounded-full shadow-sm flex items-center gap-2 px-5 py-2 text-base font-semibold transition hover:bg-primary-700 ${refreshSpin ? 'animate-spin-slow' : ''}`}
          onClick={handleNewResearch}
          type="button"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className={`inline-block ${refreshSpin ? 'animate-spin-slow' : ''}`}><path d="M4.93 4.93a10 10 0 1 1-1.32 12.74"/><path d="M4 4v5h5"/></svg>
          New Research
        </button>
      </div>
    </motion.div>
  );
};

export default FinalReport;