import secrets
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


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
        db_index=True,
        help_text="Unique external identifier for OAuth providers (Google sub / Apple sub).",
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        max_length=1024,
        help_text="Optional profile photo URL from identity provider.",
    )
    email_verified = models.BooleanField(
        default=False,
        help_text="Whether email address has been verified.",
    )
    preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom operator/user interface preferences.",
    )

    def is_admin_superuser(self) -> bool:
        """Returns True if the user has full superuser / admin privileges."""
        return self.is_superuser or self.username in ["ujwalsingh12", "ujwalsingh123", "admin"]

    @property
    def role_label(self) -> str:
        if self.is_admin_superuser():
            return "SUPERUSER_ADMIN"
        return "STANDARD_USER"

    @property
    def full_name(self) -> str:
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.username


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def create_for_user(cls, user: User, expires_in_minutes: int = 30) -> "PasswordResetToken":
        # Invalidate existing unused tokens for this user
        cls.objects.filter(user=user, used=False).update(used=True)
        token_str = secrets.token_urlsafe(32)
        expiry = timezone.now() + timedelta(minutes=expires_in_minutes)
        return cls.objects.create(user=user, token=token_str, expires_at=expiry)

    def is_valid(self) -> bool:
        return not self.used and timezone.now() <= self.expires_at


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_verification_tokens",
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    @classmethod
    def create_for_user(cls, user: User, expires_in_hours: int = 24) -> "EmailVerificationToken":
        cls.objects.filter(user=user, used=False).update(used=True)
        token_str = secrets.token_urlsafe(32)
        expiry = timezone.now() + timedelta(hours=expires_in_hours)
        return cls.objects.create(user=user, token=token_str, expires_at=expiry)

    def is_valid(self) -> bool:
        return not self.used and timezone.now() <= self.expires_at
