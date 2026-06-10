# EduStream — Learning Platform

A learning management and content sharing platform with **Super Admin**, **Organization Admin**, and **User** dashboards.

See [Learning_Platform_UserFlow.md](./Learning_Platform_UserFlow.md) for product flows, roles, and modules.

## Project structure

```text
project-root/
├── frontend/          # React + Vite + TanStack Router (UI)
├── backend/           # FastAPI API
├── Learning_Platform_UserFlow.md
└── README.md
```

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173` (or the port Vite assigns).

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` for API calls.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

Copy `backend/.env.example` to `backend/.env` and fill in database and auth placeholders when ready.

## Architecture

```text
React Frontend  →  FastAPI Backend  →  PostgreSQL
                         ↓
                  Cloud file storage
```

Frontend and backend are decoupled; the frontend reads `VITE_API_URL` for future API integration.
