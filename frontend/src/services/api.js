import axios from 'axios';

// Base URL for API calls
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service object
const apiService = {
  /**
   * Start a new research session
   * @param {string} topic - The research topic
   * @returns {Promise} - Promise with session data
   */
  startResearch: async (topic) => {
    try {
      const response = await apiClient.post('/research/start', {
        topic,
        depth: 'medium' // Default depth
      });
      return response.data;
    } catch (error) {
      console.error('Error starting research:', error);
      throw error;
    }
  },

  /**
   * Get clarification questions for a research session
   * @param {string} sessionId - The session ID
   * @returns {Promise} - Promise with clarification questions
   */
  getClarificationQuestions: async (sessionId) => {
    try {
      const response = await apiClient.get(`/research/${sessionId}/clarification`);
      return response.data;
    } catch (error) {
      console.error('Error getting clarification questions:', error);
      throw error;
    }
  },

  /**
   * Submit answers to clarification questions
   * @param {string} sessionId - The session ID
   * @param {Object} answers - The answers to clarification questions
   * @returns {Promise} - Promise with submission result
   */
  submitClarificationAnswers: async (sessionId, answers) => {
    try {
      const response = await apiClient.post(`/research/${sessionId}/clarification`, answers);
      return response.data;
    } catch (error) {
      console.error('Error submitting clarification answers:', error);
      throw error;
    }
  },

  /**
   * Generate a search plan
   * @param {string} sessionId - The session ID
   * @returns {Promise} - Promise with plan generation status
   */
  generatePlan: async (sessionId) => {
    try {
      const response = await apiClient.get(`/research/${sessionId}/plan`);
      return response.data;
    } catch (error) {
      console.error('Error generating plan:', error);
      throw error;
    }
  },

  /**
   * Get the current research status
   * @param {string} sessionId - The session ID
   * @returns {Promise} - Promise with current status
   */
  getResearchStatus: async (sessionId) => {
    try {
      const response = await apiClient.get(`/research/${sessionId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting research status:', error);
      throw error;
    }
  },

  /**
   * Get the final research report
   * @param {string} sessionId - The session ID
   * @returns {Promise} - Promise with final report data
   */
  getFinalReport: async (sessionId) => {
    try {
      const response = await apiClient.get(`/research/${sessionId}/report`);
      return response.data;
    } catch (error) {
      console.error('Error getting final report:', error);
      throw error;
    }
  },

  /**
   * Create an event source for streaming research progress
   * @param {string} sessionId - The session ID
   * @returns {EventSource} - Event source for streaming
   */
  streamResearchProgress: (sessionId) => {
    return new EventSource(`${API_BASE_URL}/research/${sessionId}/stream`);
  },

  /**
   * Create an event source for streaming report generation
   * @param {string} sessionId - The session ID
   * @returns {EventSource} - Event source for streaming
   */
  streamReportGeneration: (sessionId) => {
    return new EventSource(`${API_BASE_URL}/research/${sessionId}/report/stream`);
  }
};

export default apiService;