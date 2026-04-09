# St Thomas App Setup Guide

## Prerequisites

- PostgreSQL 12+ (running)
- pgAdmin 5+ (or pgAdmin 4)
- Python 3.13+
- Node.js 18+

---

## 1. Create Database in pgAdmin

1. Open pgAdmin and connect to your PostgreSQL server.
2. Right-click Databases -> Create -> Database.
3. Name: ecclesia
4. Save.

Enable trigram extension (required for fuzzy search):

1. Select database ecclesia.
2. Open Query Tool.
3. Run:

CREATE EXTENSION IF NOT EXISTS pg_trgm;

---

## 2. Configure Backend Without Hardcoded DB Values

1. Go to backend folder.
2. Copy backend/.env.example to backend/.env
3. Update values in backend/.env:

- DJANGO_SECRET_KEY
- POSTGRES_DB
- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_HOST
- POSTGRES_PORT

In PowerShell, load env vars for current session:

$env:DJANGO_SECRET_KEY="replace-with-random-secret"
$env:DJANGO_DEBUG="True"
$env:DJANGO_ALLOWED_HOSTS="127.0.0.1,localhost"
$env:POSTGRES_DB="ecclesia"
$env:POSTGRES_USER="postgres"
$env:POSTGRES_PASSWORD="your_password"
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_PORT="5432"

---

## 3. Install Dependencies

Backend:

cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt

Frontend:

cd ..\frontend
npm install

---

## 4. Run Migrations

cd ..\backend
..\.venv\Scripts\python.exe manage.py migrate

---

## 5. Create Admin User

..\.venv\Scripts\python.exe manage.py createsuperuser

Important:
- Login field is phone_number (not username).

---

## 6. Add Data Using pgAdmin GUI (No Hardcoded Seed Required)

You can insert records directly with pgAdmin:

1. In pgAdmin, expand:
   - Databases -> ecclesia -> Schemas -> public -> Tables
2. Open data grid with View/Edit Data for these tables in order:
   - directory_ward
   - directory_unit
   - directory_family
   - accounts_user
3. Insert records in this hierarchy:
   - Ward -> Unit -> Family -> User

Notes:
- accounts_user.family_id must reference directory_family.id
- accounts_user.phone_number must be unique
- Password must be Django-hashed if entered directly in pgAdmin

Recommended for user creation:
- Create users from Django admin at /admin instead of entering raw password in pgAdmin.

---

## 7. Optional Demo Data Script

If you want quick sample data:

$env:SEED_DEFAULT_PASSWORD="testpass123"
..\.venv\Scripts\python.exe seed_data.py

This creates:
- 2 wards
- 2 units
- 2 families
- 2 users with phone login

---

## 8. Run Backend

cd backend
..\.venv\Scripts\python.exe manage.py runserver 8000

Backend URLs:
- http://127.0.0.1:8000/
- http://127.0.0.1:8000/admin/

---

## 9. Run Frontend

cd frontend
npm run dev

Frontend URL:
- http://localhost:5173

---

## 10. API Endpoints

Authentication:
- POST /api/auth/login/
- POST /api/auth/refresh/
- GET /api/auth/me/
- POST /api/auth/first-login-password/

Directory hierarchy:
- /api/wards/
- /api/units/
- /api/families/
- /api/members/

Certificates:
- /api/certificates/

---

## Troubleshooting

If login fails but user exists:
- Ensure frontend is running with proxy config and restart npm run dev.
- Ensure backend is running on 127.0.0.1:8000.
- Verify user has valid hashed password (create/reset from Django admin).

If migration fails on pg_trgm:
- Open pgAdmin Query Tool and run:
  CREATE EXTENSION IF NOT EXISTS pg_trgm;


For backend:  ..\ .venv\Scripts\python.exe manage.py runserver 8000
For fronted: npm run dev