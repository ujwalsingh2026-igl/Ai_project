from pathlib import Path

from corsheaders.defaults import default_headers
from core.permissions import parse_policy_overrides
from core.providers import ProviderConfig

from ..env import env, env_bool, env_list, load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]          # .../backend
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

DEBUG = False
SECRET_KEY = env("SECRET_KEY")          # dev.py supplies an insecure default; prod.py requires it
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "apps.users",
    "apps.assistant",
    "apps.permissions",
    "apps.planner",
    "apps.network",
    "apps.security",
]

MIDDLEWARE = [
    "config.middleware.RequestIDMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["x-request-id"]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# Database: PostgreSQL when DB_NAME is set, otherwise SQLite (easy first run on Windows).
if env("DB_NAME"):
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"), "USER": env("DB_USER", "postgres"), "PASSWORD": env("DB_PASSWORD", ""),
        "HOST": env("DB_HOST", "localhost"), "PORT": env("DB_PORT", "5432"),
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_USER_MODEL = "users.User"      # custom user model from day 1 (very hard to change later)
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
# Passwords are hashed by Django's default (PBKDF2). Never stored in plain text.

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "30/min", "user": "120/min", "chat": "30/min", "login": "10/min", "confirm": "30/min"},
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler",
}

# ---- AI provider: ONE central place. Change .env, not code. ----
AI_CONFIG = ProviderConfig(
    provider=env("AI_PROVIDER", "echo"),
    base_url=env("AI_BASE_URL"),
    model=env("AI_MODEL"),
    api_key=env("AI_API_KEY"),
    timeout=float(env("AI_TIMEOUT", "60")),
)
# ---- Permissions / approvals ----
# e.g. PERMISSION_OVERRIDES=2:ask makes read-only device tools ask first. A typo fails at startup.
# Hard caps in the engine still apply: level 3/4 never auto-allow, level 5 always blocked.
PERMISSION_OVERRIDES = parse_policy_overrides(env("PERMISSION_OVERRIDES", ""))
APPROVAL_TTL_SECONDS = int(env("APPROVAL_TTL_SECONDS", "300"))

CHAT_HISTORY_LIMIT = 20        # last N messages sent to the AI
CHAT_MESSAGE_MAX_LENGTH = 4000

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"request_id": {"()": "config.logging_utils.RequestIDFilter"}},
    "formatters": {"json": {"()": "config.logging_utils.JsonFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json", "filters": ["request_id"]}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
}
