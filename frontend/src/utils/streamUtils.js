/**
 * Utilities for handling streaming responses
 */

/**
 * Create an event source for streaming data
 * @param {string} url - The URL to stream from
 * @param {Object} options - Options for the stream
 * @param {function} options.onMessage - Callback for message events
 * @param {function} options.onError - Callback for error events
 * @param {function} options.onOpen - Callback for when connection opens
 * @param {function} options.onClose - Callback for when connection closes
 * @returns {Object} - Methods to control the stream
 */
export const createStream = (url, options = {}) => {
    const {
      onMessage = () => {},
      onError = () => {},
      onOpen = () => {},
      onClose = () => {}
    } = options;
    
    let eventSource = null;
    let isActive = false;
    
    // Start the stream
    const start = () => {
      if (eventSource) {
        return;
      }
      
      eventSource = new EventSource(url);
      isActive = true;
      
      eventSource.onopen = (event) => {
        onOpen(event);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data, event);
        } catch (error) {
          // If not JSON, just pass the raw data
          onMessage(event.data, event);
        }
      };
      
      eventSource.onerror = (error) => {
        onError(error);
        
        // Auto-close the connection on error
        if (eventSource.readyState === EventSource.CLOSED) {
          isActive = false;
          onClose();
        }
      };
      
      return eventSource;
    };
    
    // Stop the stream
    const stop = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
        isActive = false;
        onClose();
      }
    };
    
    // Check if the stream is active
    const isStreamActive = () => isActive;
    
    return {
      start,
      stop,
      isActive: isStreamActive
    };
  };
  
  /**
   * Process streaming text with typewriter effect
   * @param {Object} options - Options for the processor
   * @param {function} options.onToken - Callback for each token
   * @param {function} options.onComplete - Callback when streaming completes
   * @param {number} options.delay - Delay between tokens in ms
   * @returns {Object} - Methods to control the processor
   */
  export const createTypewriterEffect = (options = {}) => {
    const {
      onToken = () => {},
      onComplete = () => {},
      delay = 20 // ms between tokens
    } = options;
    
    let currentText = '';
    let isProcessing = false;
    let timeoutId = null;
    
    // Process text with typewriter effect
    const process = (text) => {
      if (!text) return;
      
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      isProcessing = true;
      const tokens = text.split('');
      let index = 0;
      
      const displayNextToken = () => {
        if (index < tokens.length) {
          const token = tokens[index];
          currentText += token;
          onToken(currentText, token);
          index++;
          timeoutId = setTimeout(displayNextToken, delay);
        } else {
          isProcessing = false;
          onComplete(currentText);
        }
      };
      
      displayNextToken();
    };
    
    // Stop processing
    const stop = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isProcessing = false;
    };
    
    // Complete immediately
    const complete = () => {
      stop();
      onComplete(currentText);
    };
    
    return {
      process,
      stop,
      complete,
      isProcessing: () => isProcessing,
      getCurrentText: () => currentText
    };
  };
  
  /**
   * Handle Server-Sent Events
   * @param {string} url - The SSE endpoint URL
   * @param {Object} callbacks - Callback functions for events
   * @returns {EventSource} - The created EventSource instance
   */
  export const handleSSE = (url, callbacks = {}) => {
    const {
      onOpen,
      onMessage,
      onError,
      onComplete
    } = callbacks;
    
    const eventSource = new EventSource(url);
    
    if (onOpen) {
      eventSource.onopen = onOpen;
    }
    
    if (onMessage) {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          onMessage(event.data);
        }
      };
    }
    
    if (onError) {
      eventSource.onerror = (error) => {
        onError(error);
        eventSource.close();
        if (onComplete) onComplete();
      };
    }
    
    return eventSource;
  };