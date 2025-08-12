# Hangout

<img width="1200" height="415" alt="HANGOUT LOGO" src="https://github.com/user-attachments/assets/24f3c05e-49b7-4486-b098-0182e39de148" />

React / Django Web Application that uses RESTful APIs. Was made during Fall 2024 and Spring 2025 for my CSCE 490/492 Capstone Computing Project Class at the University of South Carolina. Was made with a team of 5 people in total, enacting in the Software Development process.

## App Overview

This project is a web application catered towards discovering and broadcasting to your local community activities that you can do with other people, like: House Parties, Soccer Games, Videogame meetups, Educational Study Groups, Cooking Classes, or even an Architectural/ Musical digest. The possiblilites are endless here. You can create an event for people to "hangout" at in regard to any of the categories that fall within life. There is also a Calendar feature, as well as an AI Suggester feature, that can suggest to you two things: "Possible Things To talk About?" or "Possible Things To Do?" with other people.

## Functionality

### Find and View Events


### Search through Life Categories


### View Events in Calendar


### Ask AI for Suggestions


## Changes Since The Class Has Ended

I personally have made signifigant improvements to the app since the class has finished. 

These things include:
- Big improvements to the app's overall color pallete. It before had this ugly coral/ peach color that was very draining on the eyes. :) It now has a focus on warm colors, off white, green, and blue, the colors of earth.
- HUGE UI/UX improvements. Things in regard to how the app pages flow, the sizing and positioning of buttons, color contrast, use cases, etc.
- Re-designed search bar. Instead of just searching with a location parameter to find events, it has these search parameters instead: "Dates Available", "Location", "Search Categories For Events". In other words, you can type "Running", hit search, and find running events, whereas before you could only type your location in hopes of finding a "Running" event.
- Fixed the SQL database 16 RLS (Row Level Security) issues that were present.
- Mobile web browser support, as well as PWA support
- Rearchitected the backend and frontend relationship. Before, the app was storing the massive Life Category and Sugggestion prompt datasets in PostgreSQL. I later realized that this data load can actually be moved to the frontend with JSON files, which are one of the fastest possible files out there. And, in doing this, I don't use slow SQL database operations. I only need SQL operations for when the data changes, not STATIC/ unchanging data, the frontend is a STATIC website, and plus I leave more room for backend compute in general, which is what my AI model needs. It works beautifully.
- Big improvements in regard to the AI chatbot model in use, due to this new re-architected backend.
- The app now uses the Gemma 3 1B Parameter 8-Bit Quantized Model instead of the bad tiny llama 1B Parameter 2-Bit Quantized Model that was in use.
- The app now has a GUEST MODE. The user doesn't need to log in to create an account anymore to just view and get an idea of the app. 
- The AI chat bot message history in guest mode is temporarily stored in the frontend browser's session storage. In other words, the guest mode AI chat history is not permanently stored in the app's database.

# Build Instructions

## External Requirements

In order to build this project you first have to install:

-   [Python](https://www.python.org/downloads/)
-   [Node.js](https://nodejs.org/en/)

## Setup

### Setting Up The Backend:

**1.) Navigate to the backend directory.**

    cd backend


**2.) Set up the backend's python virtual environment:**

Create and Activate a virtual enviornment in the backend directory of the app.

**Windows:**

    python -m venv env
    .\env\Scripts\Activate

**Mac:**

    python3 -m venv env
    source env/bin/activate

**3.) Next, Install Postgre-SQL on your Computer:**

**Windows:**

- Download the PostgreSQL 14 using https://www.postgresql.org/download/windows/
- Run the execution file to use the Setup Wizard
- When reaching the "Select Components" page, keep all selected that the wizard assigns
- Continue using the "Next" button until you reach the stack builder page
- Verify that you will be using "Postgre SQL 14 (windows size, ie x64) on port 5432"
- Continue Setup respectively by following Setup Wizard Instructions

**Mac (through homebrew):**

Install the PostgreSQL 14 using Homebrew

    brew install postgresql@14

Start the PostgreSQL service:

    brew services start postgresql@14
   
Add PostgreSQL binaries to your PATH

    echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc

Source your .zshrc file to apply the changes immediately:

    source ~/.zshrc

Verify that PostgreSQL is properly installed and accessible:

    which pg_config/opt/homebrew/opt/postgresql@14/bin/pg_config

**-> Once PostgreSQL is successfully installed, THEN ->**

**4.) Install the Backend Dependencies.**

    pip install -r requirements.txt

**Apply Migrations.**

    python manage.py makemigrations
    python manage.py migrate

- Run **makemigrations** when you have made changes to your Django models (e.g., adding a new field, modifying an existing one, or creating a new model).
- Run **migrate** after **makemigrations** to apply those changes to the database.

**5.) To reenter/exit in the virtual environment.**

    source env/bin/activate

    deactivate

Make sure that you are in the same folder/directory the virtual environment was created in whenever you are activating or deactivating.

### Setting Up The Frontend:

**Naviagate to frontend and install dependenices.**

    cd frontend
    
**Install npm.**

    npm install
    
**Install Vite locally into the project.**

    npm install vite --save-dev


## Running
For just the backend, make sure that your virtual environment (env) is activated!!

### Running The Backend:

Navigate to the backend directory.

    cd backend

Then, run this command:

    python manage.py runserver

Then, in a separate terminal, do this:

### Running The Frontend:

Navigate to the frontend directory.

    cd frontend

Then, run this command:

    npm run dev

## Running Locally For Development
Make sure to have your .env file, placed in the main backend directory, filled out with your correlated information, accordingly.

**.env file structure example:**

    # Django Settings
    DJANGO_SECRET_KEY='your-django-secret-key-here'

    # Supabase Connection Settings
    SUPABASE_URL='https://your-project-id.supabase.co'

    # Supabase API key aka ANON Public Key
    SUPABASE_ANON_KEY='your-supabase-anon-key-here'

    SUPABASE_SERVICE_KEY='your-supabase-service-key-here'

    # Database Password
    DB_PASSWORD='your-database-password-here'

**If running locally, change this code found in settings.py in the backend/backend directory to TRUE**

    # SECURITY WARNING: don't run with debug turned on in production!
    DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'

**For production, change this code found in settings.py in the backend/backend directory to FALSE**

    # SECURITY WARNING: don't run with debug turned on in production!
    DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() == 'true'

**For Local Network Mobile Phone Development, Run this command for the backend:**

    python manage.py runserver 0.0.0.0:8000

**Also, change the ALLOWED_HOSTS information found in the backend/backend/settings.py file to match your local network link accordingly.**

**Example of what a Local Network Link looks like:**

    Network: http://100.64.14.100:5173/

# Testing
**First, make sure you have all requirements from requirements.txt installed.** It is recommended to use a virtual enviornment during this.

    pip install -r requirements.txt

**Move to the backend directory**

    cd backend
    
**Unit Testing**

    python manage.py test tests.unit --keepdb

**Behavioral Testing**

    python manage.py test tests.behavioral --keepdb

**If on Mac and using Chrome**

    BROWSER=chrome python manage.py test tests.unit --keepdb

    BROWSER=chrome python manage.py test tests.behavioral --keepdb

**Directory where tests are located**

    backend\tests
    
