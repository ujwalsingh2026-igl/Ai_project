from ..env import env
from .base import *  # noqa: F401,F403

DEBUG = True
SECRET_KEY = env("SECRET_KEY", "dev-only-insecure-key-do-not-use-in-production")
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True
