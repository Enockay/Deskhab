"""
Create or update an AdminUser in the database.

Usage (from desktophab-backend/):
  source venv/bin/activate
  python scripts/create_admin.py --email admin@desktohab.com --password 'admin@2026!' --role admin --name "Enockay"

Notes:
  - Reads DATABASE_URL_SYNC from your .env via app.core.config.settings
  - Upserts by email (case-insensitive)
"""

from __future__ import annotations

import os
import sys

# Ensure backend root is on PYTHONPATH so `import app...` works when run as a script
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import argparse

from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import AdminRole, AdminUser


ROLE_MAP = {
    "support": AdminRole.support,
    "manager": AdminRole.manager,
    "admin": AdminRole.admin,
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Create or update an admin user.")
    p.add_argument("--email", required=True, help="Admin email")
    p.add_argument("--password", required=True, help="Admin password (will be hashed)")
    p.add_argument("--name", default="Admin", help="Display name")
    p.add_argument("--role", default="admin", choices=list(ROLE_MAP.keys()), help="Admin role")
    p.add_argument("--disable", action="store_true", help="Disable the admin user")
    p.add_argument("--enable", action="store_true", help="Enable the admin user")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    email = args.email.strip().lower()
    role = ROLE_MAP[args.role]

    engine = create_engine(settings.DATABASE_URL_SYNC, echo=False, pool_pre_ping=True)

    with Session(engine) as db:
        existing = db.execute(select(AdminUser).where(func.lower(AdminUser.email) == email)).scalar_one_or_none()

        if existing:
            existing.hashed_password = hash_password(args.password)
            existing.name = args.name or existing.name
            existing.role = role
            if args.disable:
                existing.is_active = False
            if args.enable:
                existing.is_active = True
            if role == AdminRole.admin:
                existing.is_superadmin = True
            db.commit()
            print(f"Updated admin user: {existing.email} (role={existing.role.value}, active={existing.is_active})")
            return

        admin = AdminUser(
            email=email,
            hashed_password=hash_password(args.password),
            name=args.name,
            role=role,
            is_active=(not args.disable),
            is_superadmin=(role == AdminRole.admin),
        )
        db.add(admin)
        db.commit()
        print(f"Created admin user: {admin.email} (role={admin.role.value}, active={admin.is_active})")


if __name__ == "__main__":
    main()

