from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartQuote API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:8081",  # Expo Web default
        "http://localhost:19006", # Legacy Expo Web
        "http://localhost:8000",  # FastAPI docs
        "http://localhost:3000",
        "*",                      # Allow all for mobile client dev
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    # PostgreSQL Connection String
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/smartquote_db"

    # Security & JWT Tokens
    JWT_SECRET: str = "insecure-dev-secret-key-smartquote-jwt"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
