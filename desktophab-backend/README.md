# DesktopHab Backend API

FastAPI backend for DesktopHab — serving authentication, subscriptions, billing, and admin for SmartCalender and future desktop apps.

## Stack
- **Python 3.11+** / FastAPI
- **PostgreSQL** (primary DB) + **Redis** (token cache / rate limiting)
- **SQLAlchemy 2.0** async ORM
- **Alembic** migrations
- **Stripe** for billing
- **JWT** (access tokens) + opaque refresh tokens
- **Sqladmin** for admin panel

## Local Development (without Docker)

### Prerequisites
- Python 3.11+
- PostgreSQL 16+ (running locally or via Docker)
- Redis 7+ (running locally or via Docker)

### Setup

1. **Create `.env` file** (copy from `.env.example` and adjust):
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

2. **Start PostgreSQL and Redis** (using Docker for services only):
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Create virtual environment and install dependencies**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

5. **Start the development server**:
   ```bash
   uvicorn app.main:app --reload
   ```

### Access
- **API docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Admin panel**: http://localhost:8000/admin
- **Health check**: http://localhost:8000/v1/health

## Docker Deployment (Production)

### Prerequisites
- Docker & Docker Compose installed

### Setup

1. **Create `.env` file** with production values:
   ```bash
   # Set all required environment variables
   # See .env.example for reference
   ```

2. **Build and start all services**:
   ```bash
   docker-compose up -d --build
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f backend
   ```

4. **Stop services**:
   ```bash
   docker-compose down
   ```

### Docker Services
- **PostgreSQL**: Port 5432 (configurable via `POSTGRES_PORT`)
- **Redis**: Port 6379 (configurable via `REDIS_PORT`)
- **Backend API**: Port 8000 (configurable via `BACKEND_PORT`)

The backend service automatically runs migrations on startup.

### Production Notes
- All services run in isolated Docker network
- Data is persisted in Docker volumes (`postgres_data`, `redis_data`)
- Health checks are configured for all services
- Backend runs as non-root user for security
