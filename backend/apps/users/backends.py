from django.contrib.auth.backends import ModelBackend
from .models import User

class CaseInsensitiveModelBackend(ModelBackend):
    """
    Custom authentication backend for case-insensitive username lookup.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Case-insensitive username lookup
            user = User.objects.get(username__iexact=username)
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
        return None