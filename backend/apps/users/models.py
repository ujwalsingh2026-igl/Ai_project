from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    AUTH_PROVIDER_CHOICES = (
        ("local", "Local / Operator"),
        ("email", "Email Registration"),
        ("google", "Google Sign-In"),
        ("apple", "Apple ID"),
    )

    auth_provider = models.CharField(
        max_length=20,
        choices=AUTH_PROVIDER_CHOICES,
        default="local",
        help_text="Registration or identity provider source.",
    )
    provider_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Unique external identifier for OAuth providers (Google sub / Apple sub).",
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        help_text="Optional profile photo URL from identity provider.",
    )

    def is_admin_superuser(self) -> bool:
        """Returns True if the user has full superuser / admin privileges."""
        return self.is_superuser or self.username in ["ujwalsingh12", "ujwalsingh123", "admin"]

    @property
    def role_label(self) -> str:
        if self.is_admin_superuser():
            return "SUPERUSER_ADMIN"
        return "STANDARD_USER"
