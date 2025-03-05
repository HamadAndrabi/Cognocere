import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};

// Provider component
export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
          // Set the token
          setToken(storedToken);
          
          // Fetch user info
          await fetchUserInfo(storedToken);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
        setError('Failed to authenticate. Please log in again.');
        
        // Clear any invalid tokens
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  // Configure axios with token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Fetch user information
  const fetchUserInfo = async (currentToken) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      
      setUser(response.data);
    } catch (err) {
      console.error('Error fetching user info:', err);
      throw err;
    }
  };

  // Log in with Google
  const loginWithGoogle = async (code, redirectUri) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('code', code);
      if (redirectUri) {
        formData.append('redirect_uri', redirectUri);
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/google/callback`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const { access_token, user: userData } = response.data;
      
      // Save to state
      setToken(access_token);
      setUser(userData);
      
      // Save to localStorage
      localStorage.setItem('accessToken', access_token);
      
      return true;
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.detail || 'Failed to log in with Google');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get Google auth URL
  const getGoogleAuthUrl = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/google/url`);
      return response.data.auth_url;
    } catch (err) {
      console.error('Error getting Google auth URL:', err);
      setError('Failed to get authentication URL');
      return null;
    }
  };

  // Log out
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    
    // Call logout endpoint to invalidate session
    if (token) {
      axios.post(`${API_BASE_URL}/api/auth/logout`)
        .catch(err => console.error('Logout error:', err));
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => !!user;

  // Auth context value
  const value = {
    user,
    token,
    loading,
    error,
    loginWithGoogle,
    getGoogleAuthUrl,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};