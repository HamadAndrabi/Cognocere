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
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3000/auth/google/callback"

    # CORS Settings
    allow_origins: list[str] = ["http://localhost:3000"]
    allow_credentials: bool = True
    allow_methods: list[str] = ["*"]
    allow_headers: list[str] = ["*"]
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False
    }

    # Search API settings
    serper_api_key: str = ""
    serper_api_url: str = "https://google.serper.dev/search"

