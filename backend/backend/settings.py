from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'your-default-secret-key-for-dev')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'

# Dynamic ALLOWED_HOSTS for production
ALLOWED_HOSTS = []
if DEBUG:
    ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '192.168.0.20', '100.64.5.109', '10.179.1.154']
else:
    # For production, allow any Render subdomain
    ALLOWED_HOSTS = ['*'] 

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    # Local apps
    'apps.users.apps.UsersConfig',
    'apps.events.apps.EventsConfig',
    'apps.ai_chat',
    'apps.utils',  # Add utils app for Supabase integration
]

AUTH_USER_MODEL = 'users.User'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'postgres',  # Keep as 'postgres' - this is Supabase's default DB name
        'USER': 'postgres.yvmjkcwcagywdwemfcbq',  # Replace with your project reference from Supabase URL
        'PASSWORD': os.environ.get('DB_PASSWORD'),  # This will come from your .env file
        'HOST': 'aws-0-us-east-2.pooler.supabase.com',  # Your Supabase host region
        'PORT': '6543',  # Standard Supabase port
        'OPTIONS': {
            'sslmode': 'require'
        },
        'CONN_MAX_AGE': 0  # Don't reuse connections for long requests
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # 'apps.utils.supabase_auth.SupabaseAuthentication',  # Keep disabled - not needed
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # Use DJANGO'S simple JWT auth over Supabase
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # Secure by default
    ],
}

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Only include frontend dist directory if it exists and we're not in debug mode
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / 'frontend'
FRONTEND_DIST = FRONTEND_DIR / 'dist'
FRONTEND_ASSETS = FRONTEND_DIST / 'assets'

STATICFILES_DIRS = []
if not DEBUG:  # Only include frontend files in production
    if FRONTEND_DIST.exists():
        STATICFILES_DIRS.append(str(FRONTEND_DIST))
    if FRONTEND_ASSETS.exists():
        STATICFILES_DIRS.append(str(FRONTEND_ASSETS))

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only allow all origins in development
CORS_ALLOW_CREDENTIALS = True

# Dynamic CORS origins based on environment
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://192.168.0.20:5173",
        "http://100.64.5.109:5173",
        "http://10.179.1.154:5173",
    ]
else:
    # For production, add your frontend URL here
    CORS_ALLOWED_ORIGINS = [
        "https://hangout-2jy4.onrender.com",  # Update this with your actual frontend URL
    ]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Supabase Settings
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

# Maximum upload size for images (5MB)
MAX_UPLOAD_SIZE = 5 * 1024 * 1024

# AI Model Timeout Settings for Production
# Increase timeouts for AI model processing
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Extended timeout settings for AI model processing (20 minutes)
# These settings help Django handle very long-running AI requests
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
DATA_UPLOAD_MAX_NUMBER_FILES = 100

# Session timeout settings
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps.events': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'apps.ai_chat': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

AUTHENTICATION_BACKENDS = [
    'apps.users.backends.CaseInsensitiveModelBackend',
    'django.contrib.auth.backends.ModelBackend',  # Keep the default as fallback
]