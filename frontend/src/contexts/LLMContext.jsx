import React, { createContext, useContext, useState } from 'react';

const LLMContext = createContext();

export const SUPPORTED_MODELS = {
  "gpt-4o": {
    name: "GPT-4o",
    provider: "openai",
    description: "Latest optimized GPT-4 model for comprehensive research"
  },
  "gpt-4o-mini": {
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Faster, more efficient version of GPT-4"
  },
  "deepseek-r1-distill-llama-70b": {
    name: "Deepseek R1",
    provider: "groq",
    description: "High-performance research model via Groq"
  },
  "gemini-2.0-flash": {
    name: "Gemini 2.0 Flash",
    provider: "google",
    description: "Google's latest Gemini model optimized for speed"
  }
};

export const LLMProvider = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  const value = {
    selectedModel,
    setSelectedModel,
    models: SUPPORTED_MODELS
  };

  return (
    <LLMContext.Provider value={value}>
      {children}
    </LLMContext.Provider>
  );
};

export const useLLM = () => {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error('useLLM must be used within a LLMProvider');
  }
  return context;
};