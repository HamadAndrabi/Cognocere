from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API keys
    openai_api_key: str
    serper_api_key: str
    
    # LLM settings
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 4000
    
    # Serper settings
    serper_api_url: str = "https://google.serper.dev/search"
    
    # Application settings
    debug: bool = False
    frontend_url: str = "http://localhost:3000"
    
    model_config = ConfigDict(env_file=".env", extra="allow")  # Updated config

