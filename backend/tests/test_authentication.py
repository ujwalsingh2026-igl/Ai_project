from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.users.models import EmailVerificationToken, PasswordResetToken

User = get_user_model()


class AuthenticationSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "Secur3P@ssw0rd!"
        self.user = User.objects.create_user(
            username="alex_operator",
            email="alex@defense.aegis",
            password=self.password,
            first_name="Alex",
            last_name="Mercer",
            auth_provider="email",
            email_verified=False,
        )

    def test_login_with_username_success(self):
        res = self.client.post(
            "/api/auth/token/",
            {"username": "alex_operator", "password": self.password},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["username"], "alex_operator")
        self.assertEqual(res.data["user"]["email"], "alex@defense.aegis")
        self.assertEqual(res.data["user"]["full_name"], "Alex Mercer")

    def test_login_with_email_success(self):
        res = self.client.post(
            "/api/auth/token/",
            {"username": "alex@defense.aegis", "password": self.password},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["id"], self.user.id)

    def test_login_invalid_password(self):
        res = self.client.post(
            "/api/auth/token/",
            {"username": "alex_operator", "password": "WrongPassword123!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

    def test_login_nonexistent_user(self):
        res = self.client.post(
            "/api/auth/token/",
            {"username": "ghost_user", "password": "AnyPassword123!"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", res.data)

    def test_registration_success(self):
        payload = {
            "name": "Sarah Connor",
            "username": "sarah_c",
            "email": "sarah@defense.aegis",
            "password": "Resistance2026!",
            "confirm_password": "Resistance2026!",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["email"], "sarah@defense.aegis")
        self.assertEqual(res.data["user"]["full_name"], "Sarah Connor")

        created_user = User.objects.get(username="sarah_c")
        self.assertTrue(created_user.check_password("Resistance2026!"))
        self.assertEqual(created_user.auth_provider, "email")
        self.assertTrue(EmailVerificationToken.objects.filter(user=created_user).exists())

    def test_registration_password_mismatch(self):
        payload = {
            "username": "dave",
            "email": "dave@defense.aegis",
            "password": "Password123!",
            "confirm_password": "DifferentPassword123!",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "password_mismatch")

    def test_registration_duplicate_email(self):
        payload = {
            "username": "new_alex",
            "email": "alex@defense.aegis",
            "password": "Password123!",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "email_taken")

    def test_registration_duplicate_username(self):
        payload = {
            "username": "alex_operator",
            "email": "another_alex@defense.aegis",
            "password": "Password123!",
        }
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "username_taken")

    def test_google_auth_new_user_provisioning(self):
        # Simulation token formatted as test_google_token:<email>:<name>:<sub_id>
        test_token = "test_google_token:google_operator@gmail.com:Google Agent:sub_google_987654"
        res = self.client.post("/api/auth/google/", {"credential": test_token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["email"], "google_operator@gmail.com")
        self.assertEqual(res.data["user"]["auth_provider"], "google")
        self.assertTrue(res.data["user"]["email_verified"])

        google_user = User.objects.get(email="google_operator@gmail.com")
        self.assertEqual(google_user.provider_id, "sub_google_987654")
        self.assertFalse(google_user.has_usable_password())

    def test_google_auth_account_linking_existing_email(self):
        # User already exists with email alex@defense.aegis
        test_token = "test_google_token:alex@defense.aegis:Alex Mercer:sub_alex_112233"
        res = self.client.post("/api/auth/google/", {"credential": test_token}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["user"]["id"], self.user.id)

        self.user.refresh_from_db()
        self.assertEqual(self.user.provider_id, "sub_alex_112233")
        self.assertEqual(self.user.auth_provider, "google")
        self.assertTrue(self.user.email_verified)

    def test_google_auth_invalid_token(self):
        res = self.client.post("/api/auth/google/", {"credential": "invalid_garbled_token_xyz"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data["error"]["code"], "google_auth_failed")

    def test_password_reset_flow(self):
        # 1. Request reset
        req_res = self.client.post(
            "/api/auth/password-reset/",
            {"email": "alex@defense.aegis"},
            format="json",
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        token_obj = PasswordResetToken.objects.filter(user=self.user, used=False).first()
        self.assertIsNotNone(token_obj)
        self.assertTrue(token_obj.is_valid())

        # 2. Confirm reset with new password
        confirm_res = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "token": token_obj.token,
                "new_password": "BrandNewPassword2026!",
                "confirm_password": "BrandNewPassword2026!",
            },
            format="json",
        )
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertIn("token", confirm_res.data)

        # 3. Verify user can log in with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPassword2026!"))

        # 4. Token cannot be reused
        token_obj.refresh_from_db()
        self.assertTrue(token_obj.used)
        self.assertFalse(token_obj.is_valid())

        reuse_res = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "token": token_obj.token,
                "new_password": "AnotherPassword2026!",
            },
            format="json",
        )
        self.assertEqual(reuse_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reuse_res.data["error"]["code"], "invalid_token")

    def test_email_verification_flow(self):
        token_obj = EmailVerificationToken.create_for_user(self.user)
        self.assertFalse(self.user.email_verified)

        confirm_res = self.client.post(
            "/api/auth/verify-email/confirm/",
            {"token": token_obj.token},
            format="json",
        )
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertTrue(confirm_res.data["email_verified"])

        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

    def test_user_preferences_update(self):
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        patch_res = self.client.patch(
            "/api/auth/preferences/",
            {"preferences": {"theme": "cyber_dark", "sound_fx": False, "radar_density": "high"}},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["preferences"]["theme"], "cyber_dark")

        # Verify reflected in user profile
        profile_res = self.client.get("/api/auth/profile/")
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data["preferences"]["radar_density"], "high")

    def test_logout_revokes_token(self):
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        logout_res = self.client.post("/api/auth/logout/")
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Token should be deleted
        self.assertFalse(Token.objects.filter(key=token.key).exists())

        # Calling authenticated endpoint with old token now returns 401
        check_res = self.client.get("/api/auth/profile/")
        self.assertEqual(check_res.status_code, status.HTTP_401_UNAUTHORIZED)
