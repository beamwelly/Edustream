# EduStream Backend

FastAPI service for the learning platform.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Structure

```text
app/
├── routes/       # API route handlers
├── models/       # SQLAlchemy models
├── schemas/      # Pydantic schemas
├── services/     # Business logic
├── auth/         # Authentication
├── database/     # DB session & config
├── middleware/
├── utils/
└── main.py       # App entry + CORS + health
```

## Environment

| Variable                      | Description                |
|-------------------------------|----------------------------|
| `DATABASE_URL`                | PostgreSQL connection URL  |
| `SECRET_KEY`                  | JWT signing secret         |
| `ALGORITHM`                   | JWT algorithm (HS256)      |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime             |
| `FRONTEND_URL`                | CORS allowed origin        |
