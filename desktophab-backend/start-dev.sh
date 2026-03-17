#!/usr/bin/env bash

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

if [ ! -d "venv" ]; then
  echo ">>> Python venv not found. Creating virtual environment..."
  python3 -m venv venv
fi

echo ">>> Activating virtual environment..."
source venv/bin/activate

echo ">>> Installing Python dependencies..."
pip install -r requirements.txt

if [ -f ".env.example" ] && [ ! -f ".env" ]; then
  echo ">>> .env not found. Creating from .env.example..."
  cp .env.example .env
fi

echo ">>> Running database migrations..."
alembic upgrade head

echo ">>> Starting FastAPI dev server on http://localhost:8000 ..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

