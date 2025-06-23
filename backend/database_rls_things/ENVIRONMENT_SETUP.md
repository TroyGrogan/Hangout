# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```bash
# Django Settings
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True

# Database Configuration
# Replace [YOUR-PASSWORD] with your actual Supabase database password
DB_PASSWORD=[YOUR-PASSWORD]

# Supabase Configuration
SUPABASE_URL=https://~~~~put_your_url_here~~~.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

## Getting Your Supabase Password

1. Go to your Supabase dashboard
2. Navigate to Settings > Database
3. Copy the password from the connection string or reset it if needed
4. Replace `[YOUR-PASSWORD]` in the `.env` file with this password

## Running the Database Setup

Once your `.env` file is configured, run:

```bash
cd backend
cd database_rls_things
python run_database_setup.py
```

This script will:
1. Test your database connection
2. Run Django migrations
3. Execute any SQL setup files (like `supabase_sql_setup.sql`)

## Troubleshooting

- If you get connection errors, double-check your password in the `.env` file
- Make sure you're in the `backend` directory when running the script
- Ensure all required packages are installed: `pip install -r requirements.txt` 