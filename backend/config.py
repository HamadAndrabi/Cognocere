from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # API Keys
    openai_api_key: str
    serper_api_key: str

    # LLM Settings
    llm_model: str = "gpt-4o"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 4000

    # Application Settings
    debug: bool = False
    frontend_url: str = "http://localhost:3000"

    # Authentication Settings
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Google OAuth Settings
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:3000/auth/callback"

    # CORS Settings
    allow_origins: List[str] = ["http://localhost:3000"]
    allow_credentials: bool = True
    allow_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"] # Changed to List[str]
    allow_headers: List[str] = ["*"]
    
    model_config = SettingsConfigDict(env_file=".env")

