import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { createRoot } from 'react-dom/client'; 
import { useParams, useNavigate } from 'react-router-dom'; 
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from 'react-toastify';
import apiService from '../services/api'; 
import html2pdf from 'html2pdf.js'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FaReact, FaDownload, FaFilePdf, FaFileAlt, FaLink, FaBook, FaChevronDown, FaSpinner, FaCopy, FaCheck, FaLightbulb, FaQuestion, FaListOl, FaCheckCircle, FaSearch, FaBookOpen, FaBolt, FaRedo } from 'react-icons/fa'; 
import { GiIronHulledWarship } from 'react-icons/gi'; 
import VerticalResearchTimeline from './VerticalResearchTimeline';
import { useResearch } from '../contexts/ResearchContext'; 

// --- Helper Icons & Functions (similar to FinalReport.jsx) ---

// Simple Check Icon Component
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// Simple Copy Icon Component
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5-.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625l-2.25-2.25m0 0l-2.25 2.25M13.5 12l2.25 2.25" />
  </svg>
);

// Added Icons from FinalReport (as components for consistency)
const DownloadIcon = () => <FaDownload className="w-4 h-4" />;
const PdfIcon = () => <FaFilePdf className="w-4 h-4 mr-2" />;
const MarkdownIcon = () => <FaFileAlt className="w-4 h-4 mr-2" />;
const ReportTabIcon = () => <FaBook className="w-4 h-4 mr-2" />;
const ReferencesTabIcon = () => <FaLink className="w-4 h-4 mr-2" />;
const ChevronDownIcon = () => <FaChevronDown className="w-4 h-4 ml-1" />;
const SpinnerIcon = () => <FaSpinner className="w-4 h-4 animate-spin" />;

// Copy to Clipboard Utility
const copyToClipboard = (text) => {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Prevent scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return Promise.resolve(true);
    } catch (err) {
      return Promise.reject(err);
    } finally {
      document.body.removeChild(textArea);
    }
  }
  return navigator.clipboard.writeText(text);
};

// Define tab styling classes outside the component
const tabCommonClass = "py-4 px-1 border-b-2 font-medium text-sm focus:outline-none";
const tabActiveClass = "border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400";
const tabInactiveClass = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600";

// --- Component --- 

function UnifiedResearchView() {
  const { sessionId: routeSessionId } = useParams();
  const navigate = useNavigate(); 
  const { addActivity, setProcessingStatus, researchTopic } = useResearch(); 
  const [sessionId, setSessionId] = useState(routeSessionId || null);
  const [researchQuery, setResearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState('Initializing...');
  const [stepDetail, setStepDetail] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [isReportStreaming, setIsReportStreaming] = useState(false);
  const [isReportComplete, setIsReportComplete] = useState(false);
  const [error, setError] = useState(null);
  const statusRef = useRef(null); 

  // State from FinalReport
  const [copyStatus, setCopyStatus] = useState('idle'); 
  const [reportMetadata, setReportMetadata] = useState(null); 
  const [refreshSpin, setRefreshSpin] = useState(false); 
  const [activeTab, setActiveTab] = useState('report'); // 'report', 'references'
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef(null);
  const [downloadStatus, setDownloadStatus] = useState('idle'); // 'idle', 'downloading', 'downloaded', 'error'
  const [exportStatus, setExportStatus] = useState('idle'); // 'idle', 'exporting', 'exported', 'error' (for PDF)
  const [structuredReport, setStructuredReport] = useState(null); // Store the full report object
  const [highlightedRefIndex, setHighlightedRefIndex] = useState(null); // Added for citation highlight

  // Refs from FinalReport
  const reportRef = useRef(null); // For PDF export content area
  const progressEventSourceRef = useRef(null);
  const reportEventSourceRef = useRef(null);
  const reportContainerRef = useRef(null); // Ref for PDF generation target

  // Define the steps and their icons
  const stepChain = [
    { key: 'Clarification', label: 'Clarification', icon: <FaQuestion /> },
    { key: 'Planning', label: 'Planning', icon: <FaListOl /> },
    { key: 'Research', label: 'Research', icon: <FaLightbulb /> },
    { key: 'Report', label: 'Report', icon: <FaFileAlt /> },
    { key: 'Complete', label: 'Complete', icon: <FaCheckCircle /> },
  ];

  // Helper to get the index of the current step
  let currentStepIndex = stepChain.findIndex(s => s.key.toLowerCase() === (currentStep || '').toLowerCase());
  if (currentStepIndex === -1) currentStepIndex = 0; // Always show at least the first step

  // Minimalist green for active/completed steps
  const activeStepClass = 'text-green-600';
  const completeStepClass = 'text-green-400';
  const inactiveStepClass = 'text-gray-400 dark:text-gray-600';

  // Render the dynamic step chain
  const renderStepStatus = () => (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-6 py-4 select-none">
        {stepChain.slice(0, currentStepIndex + 1).map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isComplete = idx < currentStepIndex;
          return (
            <div key={step.key} className="flex items-center group transition-all">
              <div
                className={`flex flex-col items-center transition-all duration-300 ${isActive ? activeStepClass : isComplete ? completeStepClass : inactiveStepClass}`}
              >
                <span className="text-2xl mb-1">
                  {step.icon}
                </span>
                <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-green-600' : ''}`}>{step.label}</span>
              </div>
              {idx < currentStepIndex && (
                <span className="mx-2 h-1 w-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{ transitionDelay: `${idx * 80 + 40}ms` }}></span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- Step Details Card ---
  const stepIcons = {
    Clarification: <FaQuestion className="text-blue-500" />,
    Planning: <FaListOl className="text-purple-500" />,
    Research: <FaSearch className="text-orange-500" />,
    Report: <FaBookOpen className="text-cyan-500" />,
    Complete: <FaCheckCircle className="text-green-500" />,
  };
  const renderStepDetails = () => {
    const step = stepChain[currentStepIndex];
    // Only show the current step's detail
    const detail = stepDetail || '';
    if (!detail) return null;
    return (
      <div className="w-full flex justify-center">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-5 mb-4 mt-2 animate-fade-in flex gap-4 items-start">
          <div className="flex-shrink-0 mt-1">{stepIcons[step.key] || <FaBolt className="text-gray-400" />}</div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1 text-base">{step.label} Step</div>
            <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-line">{detail}</div>
          </div>
        </div>
      </div>
    );
  };

  // --- Handlers & Functions --- 

  // Handle click outside for closing download menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      console.log('handleClickOutside: checking ref', downloadMenuRef.current, 'target:', event.target);
      if (downloadMenuRef.current && document.body.contains(event.target) && !downloadMenuRef.current.contains(event.target)) {
        setIsDownloadMenuOpen(false);
      }
    };

    if (isDownloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      console.log('Cleanup: removing mousedown listener for download menu', downloadMenuRef.current);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDownloadMenuOpen]);

  // Format the report as markdown (using structuredReport)
  const formatReport = useCallback(() => {
    if (!structuredReport) return '';
    let markdown = `# ${structuredReport.title}\n\n`;
    markdown += `## Introduction\n\n${structuredReport.introduction}\n\n`;
    structuredReport.sections.forEach(section => {
      markdown += `## ${section.title}\n\n${section.content}\n\n`;
    });
    markdown += `## Conclusion\n\n${structuredReport.conclusion}\n\n`;
    markdown += `## References\n\n`;
    structuredReport.references.forEach((ref, index) => {
      // Use ref.index if available from backend, otherwise use loop index
      const refIndex = ref.index !== undefined ? ref.index : index + 1; 
      markdown += `${refIndex}. [${ref.title}](${ref.url})\n`;
    });
    return markdown;
  }, [structuredReport]);
  
  // Download report as markdown
  const downloadReport = useCallback(() => {
    if (!structuredReport) return;
    setDownloadStatus('downloading');
    try {
      const markdown = formatReport(); 
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Sanitize title for filename
      const filename = structuredReport.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'report';
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadStatus('downloaded');
      toast.success('Markdown report downloaded!');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    } catch (err) {
      console.error("Failed to download MD:", err);
      setDownloadStatus('error');
      toast.error('Failed to download Markdown report.');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    }
  }, [structuredReport, formatReport]);
  
  // Export report as PDF
  const exportToPdf = useCallback(async () => {
    if (!reportContainerRef.current) {
      console.error('Report container ref not found for PDF generation.');
      alert('Could not find report content to generate PDF.');
      return;
    }

    setExportStatus('loading');
    toast.info('Generating PDF, please wait...', { autoClose: 2000 });

    // --- Create Temporary Header --- 
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';
    header.style.paddingBottom = '10px';
    header.style.borderBottom = '1px solid #eee';
    header.style.color = '#333'; // Ensure header text/icons have visible color
    header.id = 'pdf-temp-header'; 

    // Create a container for the ship icon
    const iconContainer = document.createElement('div');
    iconContainer.style.marginRight = '15px';
    iconContainer.id = 'temp-icon-container';

    // Create the brand name
    const brandName = document.createElement('span');
    brandName.textContent = 'Cognocere'; // Brand name
    brandName.style.fontSize = '24px';
    brandName.style.fontWeight = 'bold';
    brandName.style.color = '#333';

    // Append the icon container and brand name to the header
    header.appendChild(iconContainer);
    header.appendChild(brandName);

    // Prepend the header to the report container
    reportContainerRef.current.insertBefore(header, reportContainerRef.current.firstChild);

    // Render the GiIronHulledWarship icon into the icon container
    // Using createRoot for React 18+
    const iconRoot = createRoot(iconContainer);
    iconRoot.render(<GiIronHulledWarship style={{ fontSize: '2em', color: '#333' }} />);

    // Wait a moment for the icon to render
    setTimeout(async () => {
      try {
        // Use html2pdf.js library with proper pagination
        const element = reportContainerRef.current;
        const options = {
          margin: 15, // margin in mm
          filename: `${researchTopic?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'research'}_report.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().from(element).set(options).save();
        toast.success('PDF downloaded successfully!');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF.');
      } finally {
        // Clean up
        try {
          iconRoot.unmount();
          const addedHeader = reportContainerRef.current.querySelector('#pdf-temp-header');
          if (addedHeader) {
            reportContainerRef.current.removeChild(addedHeader);
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
        setExportStatus('idle');
      }
    }, 100); // Wait 100ms for the icon to render properly
  }, [structuredReport, researchTopic]);

  // Combined download handler
  const handleDownload = (type) => {
    if (type === 'md') {
      downloadReport();
    } else if (type === 'pdf') {
      exportToPdf();
    }
    setIsDownloadMenuOpen(false); // Close menu after selection
  };

  // Handle Copy
  const handleCopy = useCallback(async () => {
    // Use formatted full report if available and on report tab, else use streamed content
    const contentToCopy = (activeTab === 'report' && structuredReport) ? formatReport() : reportContent;
    if (!contentToCopy) return;
    try {
      await copyToClipboard(contentToCopy);
      setCopyStatus('copied');
      toast.success('Report content copied!');
      setTimeout(() => setCopyStatus('idle'), 2000); 
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('error');
      toast.error('Failed to copy content.');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [reportContent, structuredReport, activeTab, formatReport]);

  // Handle New Research
  const handleNewResearch = () => {
    setRefreshSpin(true);
    navigate('/research');
  };

  // Step mapping logic
  const stepMapping = {
    "initiating": "Clarification",
    "clarification": "Clarification",
    "planning": "Planning",
    "searching": "Research",
    "reading": "Research",
    "generating_report": "Report",
    "completed": "Complete"
  };

  // Function to determine step based on activity
  const determineStepFromActivity = (activity, message) => {
    // More aggressive search detection - look for any message containing search terms
    if (message && 
        (message.toLowerCase().includes('search') || 
         message.toLowerCase().includes('searching web') || 
         message.toLowerCase().includes('looking for'))) {
      console.log("Detected search activity in message:", message);
      return "Research";
    }
    if (message && message.toLowerCase().includes('read')) {
      return "Research";
    }
    if (message && message.toLowerCase().includes('report')) {
      return "Report";
    }
    return null; // Use default step mapping
  };

  // Effect for handling the progress stream
  useEffect(() => {
    if (!sessionId) return;

    setError(null); 
    setCurrentStep('Connecting to progress stream...');
    setStepDetail('');
    setReportContent('');
    setIsReportStreaming(false);
    setIsReportComplete(false);

    if (progressEventSourceRef.current) {
      progressEventSourceRef.current.close();
    }
    if (reportEventSourceRef.current) {
      reportEventSourceRef.current.close();
    }

    console.log(`Connecting to progress stream for session: ${sessionId}`);
    const progressEs = apiService.streamResearchProgress(sessionId);
    progressEventSourceRef.current = progressEs;

    progressEs.onmessage = (event) => {
      try {
        // Attempt to parse as JSON first
        let data;
        let isJson = false;
        try {
          data = JSON.parse(event.data);
          isJson = true;
        } catch (parseError) {
          // If JSON parsing fails, treat as plain text
          data = event.data;
          isJson = false;
          console.log("Progress stream: Received plain text message:", data);
        }

        // --- Handle JSON messages ---
        if (isJson && typeof data === 'object' && data !== null) {
          console.log('DEBUG (UnifiedResearchView): Received JSON progress:', data); // Debug log

          // Update status ref if status is present
          if (data.status) {
            const newStatus = data.status;
            statusRef.current = newStatus; // Update the ref
            setProcessingStatus(newStatus); // Update context status

            // --- Trigger Report Streaming --- 
            // Check if the status indicates the start of report generation
            if (newStatus === 'generating_report' || newStatus === 'report_generation' || newStatus === 'report_streaming') {
              if (!isReportStreaming) {
                console.log(`*** STATUS CHANGE: Detected report generation status (${newStatus}). Setting isReportStreaming = true. ***`);
                setIsReportStreaming(true);
              }
            }
            // --- End Trigger Report Streaming ---

            const stepId = stepMapping[newStatus];
            if (stepId) {
              setCurrentStep(stepId); // Use mapped step ID for UI
            } else {
              console.warn("Unknown status received:", newStatus);
              // Optionally set a generic step or keep the current one
            }
          }

          // Log activity if detail is present
          if (data.detail) {
            const currentStatus = statusRef.current || 'unknown';
            const stepId = stepMapping[currentStatus];
            if (stepId) {
              try {
                console.log(`DEBUG (UnifiedResearchView): Adding JSON activity for step '${stepId}':`, data.detail); // Debug log
                addActivity(stepId, data.detail);
              } catch (logError) {
                console.error(`Failed to add JSON activity for step ${stepId}:`, logError);
              }
            } else {
              console.warn(`Could not map status '${currentStatus}' to step ID for JSON activity log:`, data.detail);
            }
          }

          // Update step detail message if present
          if (data.message) {
            console.log("Setting step detail to:", data.message);
            setStepDetail(data.message);
          }

          // Handle Error Status
          if (data.status === 'error') {
            setError(data.error || 'An unknown error occurred during research.');
            setCurrentStep('Error'); // Use UI Step Name
            setProcessingStatus('error'); // Update context status
            setStepDetail(data.error || 'Unknown error');
            toast.error(`Research Error: ${data.error || 'Unknown error'}`);
            progressEs.close(); 
            if (reportEventSourceRef.current) {
              reportEventSourceRef.current.close();
            }
            return; // Stop processing on error
          }

          // Handle Completion Status
          if (data.status === 'completed') {
            setCurrentStep('Completed'); // Use UI Step Name
            setProcessingStatus('completed'); // Update context status
            setStepDetail('Research finished. Final report below.');
            setIsReportComplete(true);
            if (data.report && typeof data.report.markdown_content === 'string') {
              setReportContent(data.report.markdown_content);
              setIsReportStreaming(false); 
            } else {
              console.error("Completed status received, but report markdown_content is missing or not a string:", data.report);
              setReportContent("[Error: Failed to load final report content]");
            }
            progressEs.close(); 
            if (reportEventSourceRef.current) {
              reportEventSourceRef.current.close();
            }
            // No return here, allow potential final report chunk handling?
          }

          // Store structured report if present (might come with completion or separately)
          if (data.report) {
            setStructuredReport(data.report);
          }
          
        // --- Handle Plain Text messages ---
        } else if (!isJson && typeof data === 'string') {
          const currentStatus = statusRef.current || 'unknown';
          const stepId = stepMapping[currentStatus];
          if (stepId) {
            try {
              console.log(`DEBUG (UnifiedResearchView): Adding plain text activity for step '${stepId}':`, data); // Debug log
              addActivity(stepId, data); // Log the plain text message as an activity
            } catch (logError) {
              console.error(`Failed to add plain text activity for step ${stepId}:`, logError);
            }
          } else {
            console.warn(`Could not map status '${currentStatus}' to step ID for plain text activity log:`, data);
          }
          // Optionally update stepDetail with plain text too?
          // setStepDetail(data); 
        
        // --- Handle unexpected data format ---
        } else {
          console.warn("Received unexpected data format in progress stream:", data);
        }

      } catch (e) { // Outer catch block for errors during processing
        console.error('Error processing progress stream data:', event.data, e);
        // Avoid setting a global error unless it's critical
        // setError('Failed to process progress update.');
        // toast.error('Error receiving progress update.');
        // Log the raw message as an activity if possible
         try {
            const currentStatus = statusRef.current || 'unknown';
            const stepId = stepMapping[currentStatus] || 'unknown';
            addActivity(stepId, `Received unparsable message: ${event.data}`);
        } catch (logError) {
            console.error('Failed to log unparsable message activity:', logError);
        }
      }
    }; // End of onmessage handler

    progressEs.onerror = (err) => {
      console.error('Progress EventSource failed:', err);
      setError('Connection error with progress stream.');
      setCurrentStep('Error');
      setStepDetail('Lost connection to progress updates.');
      toast.error('Connection error with progress stream.');
      progressEs.close();
      if (reportEventSourceRef.current) {
        reportEventSourceRef.current.close();
      }
    };

    // Cleanup function for the progress stream effect
    return () => {
      console.log('Closing progress stream.');
      if (progressEventSourceRef.current) {
        progressEventSourceRef.current.close();
      }
    };
  }, [sessionId]); // Dependency array includes sessionId

  // Effect for handling the report stream, triggered by isReportStreaming state
  useEffect(() => {
    if (!sessionId || !isReportStreaming || isReportComplete) {
      return; 
    }

    console.log(`*** EFFECT RUN: Connecting to report stream for session: ${sessionId} (isReportStreaming=${isReportStreaming}, isReportComplete=${isReportComplete}) ***`);
    const reportEs = apiService.streamReportGeneration(sessionId);
    reportEventSourceRef.current = reportEs;
    setReportContent(''); 

    reportEs.onmessage = (event) => {
      // console.log('Raw report chunk:', event.data); // Very verbose
      try {
        console.log('*** REPORT STREAM: Received message: ***', event.data); // Log received report data
        if (event.data.startsWith('{"report_chunk":')) {
          const chunkData = JSON.parse(event.data);
          if (chunkData.report_chunk) {
            console.log('*** REPORT STREAM: Calling setReportContent with chunk: ***', chunkData.report_chunk); // Log before setting state
            setReportContent(prev => prev + chunkData.report_chunk);
          }
        } else if (event.data.includes('"status": "completed"')) {
          console.log('*** REPORT STREAM: Received completion status. ***');
          setIsReportStreaming(false);
          setIsReportComplete(true);
          setReportContent(event.data);
        }
      } catch (e) {
        console.error("Failed to parse report chunk JSON:", event.data, e);
      };
    };

    reportEs.onerror = (err) => {
      console.error('Report EventSource failed:', err);
      toast.warning('Report stream connection issue. It might have completed or encountered an error.');
      setIsReportStreaming(false); 
      reportEs.close(); 
    };

    reportEs.addEventListener('close', () => {
      console.log('Report stream closed by server.');
      setIsReportStreaming(false);
    });

    return () => {
      console.log('Closing report stream.');
      if (reportEventSourceRef.current) {
        reportEventSourceRef.current.close();
      };
    };
  }, [sessionId, isReportStreaming, isReportComplete]);

  // Effect to automatically clear the reference highlight after a delay
  useEffect(() => {
    let timer;
    if (highlightedRefIndex !== null) {
      timer = setTimeout(() => {
        setHighlightedRefIndex(null);
      }, 3000); // Highlight duration: 3 seconds
    }
    // Cleanup function to clear the timer if the component unmounts
    // or if the highlightedRefIndex changes again before the timer finishes
    return () => clearTimeout(timer);
  }, [highlightedRefIndex]); // Depend on highlightedRefIndex

  // Custom component for rendering paragraphs with reference handling
  const ParagraphRenderer = useCallback(({ node, children }) => {
    // Join children to string if it's an array (ReactMarkdown sometimes splits text)
    const text = Array.isArray(children) ? children.join('') : children;
    if (!structuredReport?.references?.length || typeof text !== 'string') {
      return <p>{children}</p>;
    }
    // Improved Regex: match [12], [13]., [14];, [15] etc.
    const citationRegex = /\[(\d+(?:[\s,]+\d+)*)\](?=[\s.,;:!?)\"]|$)/g;
    let lastIndex = 0;
    const elements = [];
    let match;
    while ((match = citationRegex.exec(text)) !== null) {
      // Push text before the citation
      if (match.index > lastIndex) {
        elements.push(text.slice(lastIndex, match.index));
      }
      // Extract numbers (split by comma or whitespace)
      const numbersString = match[1];
      const refIndices = numbersString.split(/[\s,]+/).map(numStr => parseInt(numStr.trim(), 10)).filter(Boolean);
      // Render each number as a blue superscript clickable
      refIndices.forEach((refIndex, i) => {
        const supNumber = refIndex + 1; // Convert to 1-based citation numbering
        elements.push(
          <sup key={`sup-${match.index}-${i}`} className="relative group" style={{ marginLeft: i > 0 ? 2 : 1, marginRight: 2 }}>
            {structuredReport.references.find(r => r.index === refIndex) ? (
              <span className="relative inline-block">
                <a
                  href={structuredReport.references.find(r => r.index === refIndex).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold px-0.5"
                  style={{ fontSize: '0.85em', lineHeight: 1 }}
                >
                  {supNumber}
                </a>
                <span className="pointer-events-none absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-700 text-white text-left p-2 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {(() => {
                    try {
                      const host = new URL(structuredReport.references.find(r => r.index === refIndex).url).hostname;
                      return <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" className="w-6 h-6 flex-shrink-0 mt-0.5" />;
                    } catch {
                      return null;
                    }
                  })()}
                  <div className="font-semibold inline-block align-middle">{structuredReport.references.find(r => r.index === refIndex).title || structuredReport.references.find(r => r.index === refIndex).url}</div>
                  {(() => {
                    try {
                      const urlObj = new URL(structuredReport.references.find(r => r.index === refIndex).url);
                      const segs = urlObj.pathname.split('/').filter(Boolean);
                      const displayPath = [urlObj.hostname, ...segs].join(' › ');
                      return <div className="text-gray-300 text-xs mt-1 truncate">{displayPath}</div>;
                    } catch {
                      return null;
                    }
                  })()}
                  <div className="truncate">{structuredReport.references.find(r => r.index === refIndex).url}</div>
                </span>
              </span>
            ) : (
              <span className="text-red-500 dark:text-red-400 font-bold px-0.5">{supNumber}</span>
            )}
          </sup>
        );
      });
      lastIndex = citationRegex.lastIndex;
    }
    // Push the rest of the text after the last citation
    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }
    return <p>{elements}</p>;
  }, [structuredReport]);

  // Custom component to handle report content with objects
  const sanitizeText = (text) => {
    if (!text) return '';
    // This function replaces any [object Object] with proper string representations
    return text.toString().replace(/\[object Object\]/g, (match) => {
      // You could add custom logic here to better format objects if needed
      return "bullet point"; // Simple replacement - or handle this differently based on context
    });
  };

  // Custom renderer for any content that might contain objects
  const TextRenderer = ({ children }) => {
    if (!children) return null;
    // If children is an array, process each item
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === 'string') {
          return <span key={index}>{sanitizeText(child)}</span>;
        }
        return child;
      });
    }
    // If it's a string, sanitize it
    if (typeof children === 'string') {
      return sanitizeText(children);
    }
    // Otherwise just return as is
    return children;
  };

  // Custom component for code blocks with syntax highlighting
  const CustomCodeBlock = ({ node, inline, className, children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, ''); // Trim trailing newline

    const handleCopy = () => {
      navigator.clipboard.writeText(codeString).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
      }, (err) => {
        console.error('Failed to copy code:', err);
        // Maybe show an error state
      });
    };

    return !inline && match ? (
      <div className="relative my-4 rounded-md bg-gray-800 dark:bg-gray-900 group"> 
         {/* Apply vscDarkPlus background or similar explicitly if needed */}
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          aria-label="Copy code"
        >
          {isCopied ? <FaCheck size={12} className="text-green-400" /> : <FaCopy size={12} />}
        </button>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
          className="!p-4 !bg-transparent rounded-md text-sm overflow-x-auto"
          // customStyle={{ background: 'transparent' }} // Ensure highlighter doesn't override container bg
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    ) : (
      // Render inline code or code blocks without a language tag
      <code className={`bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm ${className || ''}`} {...props}>
        {children}
      </code>
    );
  };

  // Render References Tab Content
  const renderReferences = () => {
    if (!structuredReport || !structuredReport.references || structuredReport.references.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 italic p-4">No references available.</p>;
    }
    return (
        <div className="grid grid-cols-1 gap-4">
            {structuredReport.references
                .sort((a, b) => (a.index || a.temp_index || 0) - (b.index || b.temp_index || 0)) // Ensure sorted by index
                .map((ref, idx) => {
                    const refNumber = idx + 1; // 1-based sequential numbering
                    const isHighlighted = highlightedRefIndex === refNumber;
                    
                    return (
                        <div
                            key={ref.url || refNumber}
                            id={`reference-${refNumber}`}
                            className={`relative group bg-white dark:bg-gray-800 p-4 rounded-lg shadow transition-transform hover:shadow-lg hover:-translate-y-1 ${isHighlighted ? 'ring-2 ring-yellow-400 dark:ring-yellow-600' : ''}`}
                        >
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold">{refNumber}.</span>
                                {(() => {
                                    try {
                                        const urlObj = new URL(ref.url);
                                        const host = urlObj.hostname;
                                        const segs = urlObj.pathname.split('/').filter(Boolean);
                                        const displayPath = [host, ...segs].join(' › ');
                                        return <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" className="w-6 h-6 flex-shrink-0" />;
                                    } catch {
                                        return null;
                                    }
                                })()}
                                <a
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold truncate"
                                >
                                    {ref.title || ref.url}
                                </a>
                            </div>
                            {(() => {
                                try {
                                    const urlObj = new URL(ref.url);
                                    const segs = urlObj.pathname.split('/').filter(Boolean);
                                    const displayPath = [urlObj.hostname, ...segs].join(' › ');
                                    return <div className="text-gray-500 text-xs mt-1 truncate">{displayPath}</div>;
                                } catch {
                                    return null;
                                }
                            })()}
                            {/* Hover preview card */}
                            <div className="absolute z-50 top-0 left-full ml-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg text-sm">
                                {(() => {
                                    try {
                                        const urlObj = new URL(ref.url);
                                        const segs = urlObj.pathname.split('/').filter(Boolean);
                                        const displayPath = [urlObj.hostname, ...segs].join(' › ');
                                        return (
                                            <div>
                                                <div className="font-semibold mb-1 truncate">{ref.title || ref.url}</div>
                                                <div className="text-gray-500 mb-1 truncate">{displayPath}</div>
                                                {ref.description && <div className="text-gray-600 dark:text-gray-400 line-clamp-3">{ref.description}</div>}
                                            </div>
                                        );
                                    } catch {
                                        return null;
                                    }
                                })()}
                            </div>
                        </div>
                    );
                })}
        </div>
    );
  };

   // Render Summary Tab Content
  const renderSummary = () => {
    // Check if structuredReport and its parts exist before accessing them
    const intro = structuredReport?.introduction || "No introduction provided.";
    const conclusion = structuredReport?.conclusion || "No conclusion provided.";

    if (!structuredReport) {
        return <p className="text-gray-500 dark:text-gray-400 italic p-4">Summary not available yet.</p>;
    }
    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Introduction</h3>
            {/* Use ReactMarkdown for summary parts too if they contain markdown */}
            <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{intro}</ReactMarkdown>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-4">Conclusion</h3>
            <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{conclusion}</ReactMarkdown>
        </div>
    );
  };

  // Placeholder functions for actions
  const handleDownloadMD = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize topic for filename
    const safeTopic = researchTopic?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'research';
    link.download = `${safeTopic}_report.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('Download MD requested');
  };

  const handleDownloadPDF = async () => {
    if (!reportContainerRef.current) {
      console.error('Report container ref not found for PDF generation.');
      alert('Could not find report content to generate PDF.');
      return;
    }

    setExportStatus('loading');
    toast.info('Generating PDF, please wait...', { autoClose: 2000 });

    // --- Create Temporary Header --- 
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';
    header.style.paddingBottom = '10px';
    header.style.borderBottom = '1px solid #eee';
    header.style.color = '#333';
    header.id = 'pdf-temp-header';

    // Create a container for the ship icon
    const iconContainer = document.createElement('div');
    iconContainer.style.marginRight = '15px';
    iconContainer.id = 'temp-icon-container';

    // Create the brand name
    const brandName = document.createElement('span');
    brandName.textContent = 'Cognocere';
    brandName.style.fontSize = '24px';
    brandName.style.fontWeight = 'bold';
    brandName.style.color = '#333';

    // Append the icon container and brand name to the header
    header.appendChild(iconContainer);
    header.appendChild(brandName);

    // Prepend the header to the report container
    reportContainerRef.current.insertBefore(header, reportContainerRef.current.firstChild);

    // Render the GiIronHulledWarship icon into the icon container
    // Using createRoot for React 18+
    const iconRoot = createRoot(iconContainer);
    iconRoot.render(<GiIronHulledWarship style={{ fontSize: '2em', color: '#333' }} />);

    // Wait a moment for the icon to render
    setTimeout(async () => {
      try {
        // Use html2pdf.js library with proper pagination
        const element = reportContainerRef.current;
        const options = {
          margin: 15, // margin in mm
          filename: `${researchTopic?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'research'}_report.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().from(element).set(options).save();
        toast.success('PDF downloaded successfully!');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF.');
      } finally {
        // Clean up
        try {
          iconRoot.unmount();
          const addedHeader = reportContainerRef.current.querySelector('#pdf-temp-header');
          if (addedHeader) {
            reportContainerRef.current.removeChild(addedHeader);
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
        setExportStatus('idle');
      }
    }, 100); // Wait 100ms for the icon to render properly
  };

  if (error && currentStep === 'error') {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Research Failed</h1>
        <p className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900 p-4 rounded">{error}</p>
        <button
          className="mt-6 btn btn-primary rounded-full shadow-sm flex items-center gap-2 px-5 py-2 text-base font-semibold transition hover:bg-primary-700 mx-auto"
          onClick={handleNewResearch}
          type="button"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className={`inline-block`}><path d="M4.93 4.93a10 10 0 1 1-1.32 12.74"/><path d="M4 4v5h5"/></svg>
          Start New Research
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row justify-center items-start min-h-screen w-full p-4 space-y-4 md:space-y-0 md:space-x-8">
      {/* Timeline Section */}
      <div className="w-full md:w-1/3 lg:w-1/4 pt-8">
        <VerticalResearchTimeline />
      </div>

      {/* Report Content Section */}
      <div className="w-full md:w-2/3 lg:w-3/4">
        {/* Only render report area if content exists or it's complete/errored */}
        {(reportContent || isReportComplete || (error && currentStep === 'Error')) && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mt-8">
            <div className="flex justify-between items-start mb-4">
              {/* Remove the h2 heading */} 
              {/* <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Research Report</h2> */} 
              {/* Placeholder for title if needed, or adjust spacing */} 
              <div></div> {/* Add an empty div to maintain flex layout if needed */} 
              {/* Action buttons - Show only when complete */}
              {isReportComplete && (
                <div className="flex space-x-2 items-center">
                  {/* Download Dropdown */} 
                  <div className="relative" ref={downloadMenuRef}> 
                    <button
                      onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                      className="btn btn-outline btn-sm rounded-full shadow-sm flex items-center gap-2 px-3 py-1 text-sm font-medium transition hover:bg-gray-100 dark:hover:bg-dark-700"
                      title="Download Report"
                    >
                      <FaDownload /> <span>Download</span> <FaChevronDown className={`transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {/* Dropdown Menu */} 
                    {isDownloadMenuOpen && (
                      <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                        <button
                          onClick={() => { handleDownloadMD(); setIsDownloadMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <FaFileAlt /> Markdown (.md)
                        </button>
                        <button
                          onClick={() => { handleDownloadPDF(); setIsDownloadMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <FaFilePdf /> PDF (.pdf)
                        </button>
                      </div>
                    )}
                  </div>
                  {/* New Research Button */} 
                  <button 
                    onClick={handleNewResearch}
                    className="btn btn-primary btn-sm rounded-full shadow-sm flex items-center gap-2 px-3 py-1 text-sm font-medium transition"
                    title="Start New Research"
                  >
                    <FaRedo /> <span>New</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && currentStep === 'Error' && (
              <div className="text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900 p-4 rounded mb-4">
                <p><strong>Error during report generation:</strong> {error}</p>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`${tabCommonClass} ${activeTab === 'report' ? tabActiveClass : tabInactiveClass}`}
                    >
                        Report
                    </button>
                    <button
                        onClick={() => setActiveTab('references')}
                        className={`${tabCommonClass} ${activeTab === 'references' ? tabActiveClass : tabInactiveClass}`}
                    >
                        References
                    </button>
                </nav>
            </div>

            {/* Spinner while streaming */}
            {isReportStreaming && !isReportComplete && activeTab === 'report' && (
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                  <FaSpinner className="animate-spin mr-2" />
                  <span>Generating report...</span>
              </div>
            )}

            {/* Tab Content Area - Apply ref here for PDF capture */}
            <div ref={reportContainerRef} className="prose prose-sm dark:prose-invert max-w-none">
                {/* --- Brand header removed from UI --- */}
                {/* 
                <div className="flex items-center mb-6">
                  <FaReact className="text-blue-500 text-3xl mr-3" />
                  <span className="text-2xl font-bold tracking-tight">Deep Researcher</span>
                </div>
                */}
                {activeTab === 'report' && (
                    <ReactMarkdown 
                        children={reportContent} 
                        remarkPlugins={[remarkGfm]} 
                        components={{ 
                          p: ParagraphRenderer, 
                          code: CustomCodeBlock,
                          text: TextRenderer
                        }} 
                    />
                )}
                {activeTab === 'references' && renderReferences()}
            </div>

          </div>
        )}
        {/* Placeholder when no report yet */}
        {!reportContent && !isReportComplete && currentStep !== 'Error' && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mt-8 text-center text-gray-500 dark:text-gray-400">
            Report will appear here once generated.
          </div>
        )}
      </div>
    </div>
  );
}

export default UnifiedResearchView;
