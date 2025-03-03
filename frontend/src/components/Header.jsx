import React, { useState, useEffect } from 'react';
import { FaMoon, FaSun} from 'react-icons/fa';
import { GiIronHulledWarship } from "react-icons/gi";


const Header = () => {
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode based on system preference or localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    } else {
      setDarkMode(prefersDark);
    }
  }, []);

  // Update document classes and localStorage when dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <header className="bg-white dark:bg-dark-100 shadow-md py-4 px-6 border-b border-gray-200 dark:border-dark-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <GiIronHulledWarship className="text-primary-600 dark:text-primary-400 text-2xl" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white m-0">
            Cognocere
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-200 transition-colors"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;