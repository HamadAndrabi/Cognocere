import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code from URL query params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          setError('No authorization code found in the callback URL');
          return;
        }
        
        // Calculate the redirect URI (must match the one used for login)
        const redirectUri = `${window.location.origin}/auth/callback`;
        
        console.log('Auth callback processing with:', { code: code.substring(0, 10) + '...', redirectUri });
        
        // Process login with Google
        const success = await loginWithGoogle(code, redirectUri);
        
        if (success) {
          // Redirect to homepage after successful login
          navigate('/', { replace: true });
        } else {
          setError('Failed to authenticate with Google');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setDebugInfo(JSON.stringify(err?.response?.data || err.message));
        setError('Authentication failed. Please try again.');
      }
    };
    
    handleCallback();
  }, [loginWithGoogle, location, navigate]);
  
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-6">
      <div className="card max-w-md w-full bg-white/80 dark:bg-dark-100/60 backdrop-blur-sm text-center">
        {error ? (
          <div className="p-6">
            <div className="text-red-500 dark:text-red-400 mb-4 text-xl">
              Authentication Error
            </div>
            <div className="text-gray-700 dark:text-gray-300 mb-6">
              {error}
            </div>
            {debugInfo && (
              <div className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded-md mb-4 overflow-auto max-h-40">
                <p className="font-bold mb-1">Debug Information:</p>
                {debugInfo}
              </div>
            )}
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-primary"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="p-6">
            <FaSpinner className="animate-spin text-4xl text-primary-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Authenticating...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we complete your sign-in process.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;