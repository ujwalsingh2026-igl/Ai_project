import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import EmailVerificationToken, PasswordResetToken

logger = logging.getLogger(__name__)
User = get_user_model()


def serialize_user_profile(user: User) -> dict:
    """Helper to consistently format user objects for responses."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "is_superuser": user.is_admin_superuser(),
        "role": user.role_label,
        "auth_provider": user.auth_provider,
        "provider_label": user.get_auth_provider_display(),
        "avatar_url": user.avatar_url,
        "email_verified": getattr(user, "email_verified", False),
        "preferences": getattr(user, "preferences", {}),
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


class LoginView(APIView):
    """POST username or email + password -> token + user profile.
    Throttled to prevent brute-force attacks."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
    serializer_class = AuthTokenSerializer

    def post(self, request, *args, **kwargs):
        identifier = (request.data.get("username") or request.data.get("email") or "").strip()
        password = request.data.get("password", "")

        if not identifier or not password:
            return Response(
                {"error": {"code": "invalid_credentials", "message": "Username/email and password are required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow user to log in by either username OR email (case-insensitive)
        user = None
        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user or not user.check_password(password):
            return Response(
                {"error": {"code": "invalid_credentials", "message": "Invalid username or password."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"error": {"code": "account_disabled", "message": "This account is inactive. Please contact administrator."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": serialize_user_profile(user),
            }
        )


class RegisterView(APIView):
    """Dynamically register users via Email, Google OAuth, or Apple ID."""
    permission_classes = [AllowAny]

    def post(self, request):
        provider = request.data.get("provider") or request.data.get("auth_provider", "email")
        provider = str(provider).lower().strip()
        email = request.data.get("email", "").strip()
        username = request.data.get("username", "").strip()
        name = request.data.get("name", "").strip()
        avatar_url = request.data.get("avatar_url", "")
        provider_id = request.data.get("provider_id", "")
        password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        if provider == "email":
            if not email or not password:
                return Response(
                    {"error": {"code": "missing_fields", "message": "Email and password are required for registration."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if confirm_password and password != confirm_password:
                return Response(
                    {"error": {"code": "password_mismatch", "message": "Passwords do not match."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(password) < 8:
                return Response(
                    {"error": {"code": "password_too_short", "message": "Password must be at least 8 characters long."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not username:
                username = email.split("@")[0].lower()

            # Check if user already exists
            if User.objects.filter(username__iexact=username).exists():
                return Response(
                    {"error": {"code": "username_taken", "message": f"Username '{username}' is already registered. Please choose another or log in."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if User.objects.filter(email__iexact=email).exists():
                return Response(
                    {"error": {"code": "email_taken", "message": f"Email '{email}' is already registered. Please log in."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            is_super = username in ["ujwalsingh12", "ujwalsingh123", "admin"]
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                auth_provider="email",
                first_name=name or username,
                is_superuser=is_super,
                is_staff=is_super,
            )
            # Create verification token
            EmailVerificationToken.create_for_user(user)

        elif provider in ["google", "apple"]:
            if not email:
                return Response(
                    {"error": {"code": "missing_email", "message": f"{provider.capitalize()} registration requires an email address."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(email__iexact=email).first()
            if not user and provider_id:
                user = User.objects.filter(provider_id=provider_id).first()

            if not user:
                base_username = (name or email.split("@")[0]).lower().replace(" ", "_")
                candidate_username = base_username
                counter = 1
                while User.objects.filter(username__iexact=candidate_username).exists():
                    candidate_username = f"{base_username}_{counter}"
                    counter += 1

                is_super = candidate_username in ["ujwalsingh12", "ujwalsingh123", "admin"]
                user = User.objects.create_user(
                    username=candidate_username,
                    email=email,
                    auth_provider=provider,
                    provider_id=provider_id,
                    avatar_url=avatar_url,
                    first_name=name or candidate_username,
                    is_superuser=is_super,
                    is_staff=is_super,
                )
                user.set_unusable_password()
                if provider == "google":
                    user.email_verified = True
                user.save()
            else:
                if not user.auth_provider or user.auth_provider == "local":
                    user.auth_provider = provider
                if avatar_url:
                    user.avatar_url = avatar_url
                if provider_id:
                    user.provider_id = provider_id
                if provider == "google":
                    user.email_verified = True
                user.save()
        else:
            return Response(
                {"error": {"code": "unsupported_provider", "message": f"Unsupported identity provider: {provider}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "message": f"Successfully registered via {user.get_auth_provider_display()}.",
                "token": token.key,
                "user": serialize_user_profile(user),
            },
            status=status.HTTP_201_CREATED,
        )


class GoogleAuthView(APIView):
    """POST Google Identity Services ID token / credential -> Verify & Authenticate."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        token_str = (
            request.data.get("credential")
            or request.data.get("id_token")
            or request.data.get("token")
            or ""
        ).strip()

        if not token_str:
            return Response(
                {"error": {"code": "missing_token", "message": "Google credential / ID token is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        payload = None

        # 1. Attempt official Google cryptographic ID token verification
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token

            req = google_requests.Request()
            if client_id:
                payload = google_id_token.verify_oauth2_token(token_str, req, audience=client_id)
            else:
                payload = google_id_token.verify_oauth2_token(token_str, req)

            if payload.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
                return Response(
                    {"error": {"code": "invalid_issuer", "message": "Google ID token has an untrusted issuer."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            # 2. Check for simulation / dev tokens (useful for testing or offline dev)
            if (settings.DEBUG or not client_id) and token_str.startswith("test_google_token:"):
                parts = token_str.split(":")
                payload = {
                    "sub": parts[3] if len(parts) > 3 else f"google_test_sub_{abs(hash(token_str))}",
                    "email": parts[1] if len(parts) > 1 else "google_tester@example.com",
                    "name": parts[2] if len(parts) > 2 else "Google Operator",
                    "picture": "https://lh3.googleusercontent.com/a/default-avatar",
                    "email_verified": True,
                }
            else:
                logger.warning("Google ID token verification failed: %s", e)
                return Response(
                    {"error": {"code": "google_auth_failed", "message": f"Google authentication failed: {str(e)}"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        sub = payload.get("sub")
        email = payload.get("email", "").strip().lower()
        name = payload.get("name", "").strip()
        picture = payload.get("picture", "")
        email_verified = bool(payload.get("email_verified", True))

        if not email or not sub:
            return Response(
                {"error": {"code": "invalid_payload", "message": "Google profile missing essential identity fields (sub/email)."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Locate or create account
        user = User.objects.filter(provider_id=sub, auth_provider="google").first()
        if not user:
            user = User.objects.filter(email__iexact=email).first()

        if user:
            # Safe account linking
            if not user.provider_id or user.auth_provider != "google":
                user.provider_id = sub
                user.auth_provider = "google"
            if picture and not user.avatar_url:
                user.avatar_url = picture
            if email_verified:
                user.email_verified = True
            user.last_login = timezone.now()
            user.save()
        else:
            # Automatic account provisioning
            base_username = (name or email.split("@")[0]).lower().replace(" ", "_")
            candidate_username = base_username
            counter = 1
            while User.objects.filter(username__iexact=candidate_username).exists():
                candidate_username = f"{base_username}_{counter}"
                counter += 1

            is_super = candidate_username in ["ujwalsingh12", "ujwalsingh123", "admin"]
            user = User.objects.create_user(
                username=candidate_username,
                email=email,
                auth_provider="google",
                provider_id=sub,
                avatar_url=picture,
                first_name=name or candidate_username,
                is_superuser=is_super,
                is_staff=is_super,
            )
            user.set_unusable_password()
            user.email_verified = email_verified
            user.last_login = timezone.now()
            user.save()

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": f"Successfully authenticated via Google Identity Services ({user.email}).",
                "token": token.key,
                "user": serialize_user_profile(user),
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """POST -> Revoke current auth token and clear session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if hasattr(request, "auth") and isinstance(request.auth, Token):
            request.auth.delete()

        # Also purge any active Django session cookies if present
        from django.contrib.auth import logout as django_logout
        django_logout(request)

        return Response({"message": "Successfully signed out of Aegis Command Center."})


class PasswordResetRequestView(APIView):
    """POST email -> Generate cryptographically secure token & send reset instructions."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"error": {"code": "missing_email", "message": "Email address is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        token_str = None

        if user:
            token_obj = PasswordResetToken.create_for_user(user, expires_in_minutes=30)
            token_str = token_obj.token

            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
            reset_link = f"{frontend_url}/?reset_token={token_str}#reset-password"

            subject = "Aegis Command Center: Password Reset Authorization"
            body = (
                f"Operator {user.full_name},\n\n"
                "A password reset request was initiated for your Aegis Command Center account.\n\n"
                f"Reset Token: {token_str}\n"
                f"Reset Link: {reset_link}\n\n"
                "This authorization token is valid for 30 minutes.\n"
                "If you did not request this authorization, please ignore this transmission."
            )
            try:
                send_mail(
                    subject,
                    body,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error("Failed to send password reset email: %s", e)

        # Constant generic response to prevent user enumeration
        res_data = {
            "message": "If an account with that email exists, password reset instructions have been dispatched.",
        }
        if settings.DEBUG and token_str:
            res_data["debug_token"] = token_str

        return Response(res_data, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """POST token + new_password -> Validate token and update credentials."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        token_str = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not token_str or not new_password:
            return Response(
                {"error": {"code": "missing_fields", "message": "Reset token and new password are required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if confirm_password and new_password != confirm_password:
            return Response(
                {"error": {"code": "password_mismatch", "message": "Passwords do not match."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"error": {"code": "password_too_short", "message": "Password must be at least 8 characters long."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_obj = PasswordResetToken.objects.filter(token=token_str).first()
        if not token_obj or not token_obj.is_valid():
            return Response(
                {"error": {"code": "invalid_token", "message": "Password reset token is invalid or has expired."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.set_password(new_password)
        user.save()

        # Mark token as consumed
        token_obj.used = True
        token_obj.save()

        # Revoke all prior DRF tokens for security
        Token.objects.filter(user=user).delete()
        new_token = Token.objects.create(user=user)

        return Response(
            {
                "message": "Password has been successfully updated.",
                "token": new_token.key,
                "user": serialize_user_profile(user),
            },
            status=status.HTTP_200_OK,
        )


class EmailVerificationSendView(APIView):
    """POST -> Send email verification link/token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.email:
            return Response(
                {"error": {"code": "no_email", "message": "User account does not have an email address configured."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_obj = EmailVerificationToken.create_for_user(user, expires_in_hours=24)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        verify_link = f"{frontend_url}/?verify_token={token_obj.token}#verify-email"

        subject = "Aegis Command Center: Verify Your Email Address"
        body = (
            f"Operator {user.full_name},\n\n"
            "Please verify your email address to confirm your Aegis Command Center identity.\n\n"
            f"Verification Token: {token_obj.token}\n"
            f"Verification Link: {verify_link}\n\n"
            "This link will expire in 24 hours."
        )
        try:
            send_mail(
                subject,
                body,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        except Exception as e:
            logger.error("Failed to send verification email: %s", e)

        res_data = {"message": "Verification email has been sent."}
        if settings.DEBUG:
            res_data["debug_token"] = token_obj.token
        return Response(res_data, status=status.HTTP_200_OK)


class EmailVerificationConfirmView(APIView):
    """POST token -> Verify user's email address."""
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get("token", "").strip()
        if not token_str:
            return Response(
                {"error": {"code": "missing_token", "message": "Verification token is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_obj = EmailVerificationToken.objects.filter(token=token_str).first()
        if not token_obj or not token_obj.is_valid():
            return Response(
                {"error": {"code": "invalid_token", "message": "Email verification token is invalid or has expired."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.email_verified = True
        user.save(update_fields=["email_verified"])

        token_obj.used = True
        token_obj.save(update_fields=["used"])

        return Response(
            {
                "message": "Email address has been successfully verified.",
                "email_verified": True,
                "user": serialize_user_profile(user),
            },
            status=status.HTTP_200_OK,
        )


class UserPreferencesView(APIView):
    """PATCH -> Update stored user preferences (theme, audio, shortcuts, etc.)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        prefs = request.data.get("preferences", {})
        if not isinstance(prefs, dict):
            return Response(
                {"error": {"code": "invalid_preferences", "message": "Preferences must be a JSON object."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current = getattr(request.user, "preferences", {}) or {}
        current.update(prefs)
        request.user.preferences = current
        request.user.save(update_fields=["preferences"])

        return Response({"preferences": request.user.preferences}, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    """GET current user profile and role details."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(serialize_user_profile(request.user))


class AdminUserDirectoryView(APIView):
    """Exclusively accessible by Superusers (ujwalsingh12, ujwalsingh123, admin).
    Returns complete platform identity directory of all dynamically registered persons."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin_superuser():
            return Response(
                {"error": "Access Denied: Only platform superusers have visibility into all platform users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.all().order_by("-date_joined")
        data = []
        for u in users:
            data.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email or "N/A",
                    "full_name": u.full_name,
                    "auth_provider": u.auth_provider,
                    "provider_display": u.get_auth_provider_display(),
                    "role": u.role_label,
                    "is_superuser": u.is_admin_superuser(),
                    "is_active": u.is_active,
                    "email_verified": getattr(u, "email_verified", False),
                    "date_joined": u.date_joined.isoformat() if u.date_joined else None,
                    "last_login": u.last_login.isoformat() if u.last_login else None,
                }
            )

        return Response(
            {
                "total_users": len(data),
                "superusers_count": sum(1 for u in data if u["is_superuser"]),
                "standard_users_count": sum(1 for u in data if not u["is_superuser"]),
                "providers_breakdown": {
                    "local": sum(1 for u in data if u["auth_provider"] == "local"),
                    "email": sum(1 for u in data if u["auth_provider"] == "email"),
                    "google": sum(1 for u in data if u["auth_provider"] == "google"),
                    "apple": sum(1 for u in data if u["auth_provider"] == "apple"),
                },
                "users": data,
            }
        )
