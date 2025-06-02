# Environment Setup

## Backend Environment Variables

This project requires environment variables to be configured before running the backend server.

### Setup Steps

1. Navigate to the `backend` directory
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file and replace the placeholder values with your actual credentials:
   - `DJANGO_SECRET_KEY`: Generate a new Django secret key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase public anon key
   - `SUPABASE_SERVICE_KEY`: Your Supabase service role key
   - `DB_PASSWORD`: Your database password

### Security Note

⚠️ **NEVER commit your actual `.env` file to version control!** 

The `.env` file contains sensitive credentials and is included in `.gitignore` to prevent accidental commits. Only the `.env.example` template should be committed to the repository.

### Generating a Django Secret Key

You can generate a new Django secret key using:
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
``` 