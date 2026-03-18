from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "DesktopHab"
    APP_ENV: str = "development"
    SECRET_KEY: str
    DEBUG: bool = False

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Email (Brevo)
    BREVO_API_KEY: str | None = None
    BREVO_SENDER_EMAIL: str = "no-reply@deskhab.com"
    BREVO_SENDER_NAME: str = "DeskHab"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REMEMBER_ME_EXPIRE_DAYS: int = 90

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_SMARTCALENDER_PRICE_ID: str = ""

    # Paystack
    PAYSTACK_SECRET_KEY: str | None = None
    PAYSTACK_PUBLIC_KEY: str | None = None
    PAYSTACK_CALLBACK_URL: str | None = None

    # Admin
    ADMIN_SECRET_KEY: str
    FIRST_ADMIN_EMAIL: str = "admin@desktophab.com"
    FIRST_ADMIN_PASSWORD: str = "changeme"
    ADMIN_ALLOWED_IPS: str | None = None  # comma-separated allowlist for admin API (optional)
    ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ADMIN_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # S3 (Releases / Downloads)
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_REGION: str = "eu-north-1"
    AWS_S3_BUCKET: str | None = None
    # If you use CloudFront or a custom domain, set this to your public base URL.
    # Example: https://d123.cloudfront.net
    AWS_S3_PUBLIC_BASE_URL: str | None = None

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # URLs
    SITE_URL: str = "https://desktophab.com"
    RENEWAL_BASE_URL: str = "https://desktophab.com/renew-smartcalender"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()