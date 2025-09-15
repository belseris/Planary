from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    env: str = Field("dev", alias="ENV")
    database_url: str = Field(..., alias="DATABASE_URL")
    secret_key: str = Field(..., alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(120, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    algorithm: str = "HS256"
    media_dir: str = "media"
    avatars_dir: str = "media/avatars"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

settings = Settings()