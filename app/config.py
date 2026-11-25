from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET = "dev-only-secret-do-not-use-in-production-0000"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "sqlite:///./honor.db"
    secret_key: str = DEFAULT_SECRET
    access_token_days: int = 30  # family devices stay signed in for a month
    bcrypt_rounds: int = 12  # tests lower it for speed
    cors_origins: str = "http://localhost:5173"
    # Apply database migrations when the server starts (tests switch this off).
    run_migrations: bool = True

    # First run only: the first parent (admin) account is created from these, if no admin exists yet.
    admin_email: str | None = None
    admin_password: str | None = None
    admin_name: str = "Admin"

    @field_validator("database_url")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        # Render hands out "postgres://" URLs; SQLAlchemy needs the psycopg v3 driver spelled out.
        if v.startswith("postgres://"):
            return "postgresql+psycopg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+psycopg://" + v[len("postgresql://"):]
        return v

    @property
    def is_production(self) -> bool:
        return self.env.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
