# Logistics Transportation System

Full end-to-end logistics platform: orders, fleet management, dispatch, and shipment tracking.

```
logistics-transportation-system/
├── backend/    Django + DRF API
└── frontend/   React + Vite dashboard ("Waybill")
```

## Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
API runs at `http://127.0.0.1:8000/api/`. Admin at `http://127.0.0.1:8000/admin/`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```
Dashboard runs at `http://localhost:5173`. Copy `.env.example` to `.env` if your API isn't on the default `http://127.0.0.1:8000/api`.

## First login

Register a user via `POST /api/auth/register/` (or create one in `/admin/`), then sign in on the dashboard's login page.

## Notes

- Backend currently on Django 6.0.7, which needs Python 3.12+. If deploying to shared/cPanel hosting with an older Python selector, downgrade to Django 4.2/5.x LTS first.
- Role-based view restrictions and a live vehicle-tracking map aren't built yet.
# logistics-transport-system
