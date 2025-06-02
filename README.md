# Hangout Web App

React / Django Web Application that uses Restful API's. Was made during Fall 2024 and Spring 2025 for my CSCE 490/492 Capstone Computing Project Class at the University of South Carolina. Was made with a team of 5 people in total, enacting in the Software Development process.

## Project Overview

This project is a web application catered towards discovering and broadcasting to your local community activities that you can do with other people, like: House Parties, Soccer Games, Videogame meetups, Educational Study Groups, Cooking Classes, or even an Architectural/ Musical digest. The possiblilites are endless here. You can create an event for people to "hangout" at in regard to any of the categories that fall within life. There is also a Calendar feature, as well as an AI Suggester feature, that can suggest to you two things: "Possible Things To talk About?" or "Possible Things To Do?" with other people.

## External Requirements

In order to build this project you first have to install:

-   [Python](https://www.python.org/downloads/)
-   [Node.js](https://nodejs.org/en/)

## Setup

**Setting Up The Backend:**  
Create and activate a virtual enviornment.

**Windows:**

    python -m venv env
    .\env\Scripts\Activate

**Mac:**

    python3 -m venv env
    source env/bin/activate

**Navigate to the backend directory.**

    cd backend

**Install Postgre-SQL:**

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

**Install Dependencies.**

    pip install -r requirements.txt

**Apply Migrations.**

    python manage.py makemigrations
    python manage.py migrate

- Run **makemigrations** when you have made changes to your Django models (e.g., adding a new field, modifying an existing one, or creating a new model).
- Run **migrate** after **makemigrations** to apply those changes to the database.

**To reenter/exit in the virtual environment.**

    source env/bin/activate

    deactivate

Make sure you are in the main app folder, which has the directories and files:
backend, env, frontend, packag-lock.json, and README.md
whenever running the enter the virtual environment command.

**Setting Up The Frontend:**

**Naviagate to frontend and install dependenices.**

    cd frontend
    
**Install npm.**

    npm install
    
**Install Vite locally into the project.**

    npm install vite --save-dev


## Running
**Running The Backend:**

**Navigate to the backend directory.**

    cd backend

**Then Run this command:**

    python manage.py runserver

Then, in a separate terminal, do this:

**Running The Frontend:**

**Navigate to the frontend directory.**

    cd frontend

**Then Run this command:**

    npm run dev

# Deployment
If you would like to visit the Deployment of our Web Application, it can be accessed at:

https://standinonbusiness-1.onrender.com


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

# Authors

- Troy Grogan [tgrogan2021@gmail.com, trgrogan@email.sc.edu]
- Rene Olea [reneolea11@gmail.com, rolea@email.sc.edu]
- Olivia Falcione [livie.falcione@gmail.com, falcione@email.sc.edu]
- Kara Wacenske [wacenske@email.sc.edu]
- Alexis Hill [aah6@email.sc.edu]
