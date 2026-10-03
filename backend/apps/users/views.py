from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.throttling import ScopedRateThrottle


class LoginView(ObtainAuthToken):
    """POST username+password -> token.
    DRF's default view has NO throttling, so we add one (brute-force protection)."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
