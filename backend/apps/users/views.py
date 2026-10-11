from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

User = get_user_model()


class LoginView(ObtainAuthToken):
    """POST username+password -> token + user profile.
    Throttled to prevent brute-force attacks."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_superuser": user.is_admin_superuser(),
                    "role": user.role_label,
                    "auth_provider": user.auth_provider,
                    "avatar_url": user.avatar_url,
                },
            }
        )


class RegisterView(APIView):
    """Dynamically register or sign in users via Email, Google OAuth, or Apple ID.
    Superusers (ujwalsingh12, ujwalsingh123, admin) maintain administrative oversight."""
    permission_classes = [AllowAny]

    def post(self, request):
        provider = request.data.get("provider", "email").lower()
        email = request.data.get("email", "").strip()
        username = request.data.get("username", "").strip()
        name = request.data.get("name", "").strip()
        avatar_url = request.data.get("avatar_url", "")
        provider_id = request.data.get("provider_id", "")
        password = request.data.get("password", "")

        if provider == "email":
            if not email or not password:
                return Response(
                    {"error": "Email and password are required for email registration."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not username:
                username = email.split("@")[0]

            # Check if user already exists
            if User.objects.filter(username=username).exists():
                return Response(
                    {"error": f"Username '{username}' is already registered. Please choose another or log in."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if User.objects.filter(email=email).exists():
                return Response(
                    {"error": f"Email '{email}' is already registered. Please log in."},
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

        elif provider in ["google", "apple"]:
            if not email:
                return Response(
                    {"error": f"{provider.capitalize()} registration requires an email address."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Find existing user by email or provider_id
            user = User.objects.filter(email=email).first()
            if not user and provider_id:
                user = User.objects.filter(provider_id=provider_id).first()

            if not user:
                # Create dynamic new standard user
                base_username = (name or email.split("@")[0]).lower().replace(" ", "_")
                candidate_username = base_username
                counter = 1
                while User.objects.filter(username=candidate_username).exists():
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
                user.save()
            else:
                # Update provider metadata
                if not user.auth_provider or user.auth_provider == "local":
                    user.auth_provider = provider
                if avatar_url:
                    user.avatar_url = avatar_url
                if provider_id:
                    user.provider_id = provider_id
                user.save()
        else:
            return Response(
                {"error": f"Unsupported identity provider: {provider}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "message": f"Successfully registered via {user.get_auth_provider_display()}.",
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_superuser": user.is_admin_superuser(),
                    "role": user.role_label,
                    "auth_provider": user.auth_provider,
                    "avatar_url": user.avatar_url,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class UserProfileView(APIView):
    """GET current user profile and role details."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_superuser": user.is_admin_superuser(),
                "role": user.role_label,
                "auth_provider": user.auth_provider,
                "provider_label": user.get_auth_provider_display(),
                "avatar_url": user.avatar_url,
                "date_joined": user.date_joined.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
            }
        )


class AdminUserDirectoryView(APIView):
    """Exclusively accessible by Superusers (ujwalsingh12, ujwalsingh123, admin).
    Returns complete platform identity directory of all dynamically registered persons."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin_superuser():
            return Response(
                {
                    "error": "Access Denied: Only platform superusers have visibility into all platform users."
                },
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
                    "full_name": f"{u.first_name} {u.last_name}".strip() or u.username,
                    "auth_provider": u.auth_provider,
                    "provider_display": u.get_auth_provider_display(),
                    "role": u.role_label,
                    "is_superuser": u.is_admin_superuser(),
                    "is_active": u.is_active,
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
