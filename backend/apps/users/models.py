from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom user model (empty for now). Created at the start so we can add fields
    later without a painful migration."""
