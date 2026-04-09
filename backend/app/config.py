from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    cors_origins: str = "*"


settings = Settings()
