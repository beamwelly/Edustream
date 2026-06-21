# ──────────────────────────────────────────────
# Masterclass Backend — FastAPI
# ──────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2 / Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# (requirements.txt only — no .env file is copied)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/

EXPOSE 8000

# All env vars (DATABASE_URL, SECRET_KEY, etc.) are injected
# at runtime via docker-compose — nothing is baked into this image.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
