"""
SQLAlchemy ORM models for DesktopHab.

Tables:
  users              - registered accounts (desktop app users + admins)
  subscriptions      - one subscription row per user per app
  payments           - payment history / invoices
  refresh_tokens     - opaque refresh token store
  admin_users        - separate admin credentials table
  apps               - product catalogue (SmartCalender, future apps)
  audit_logs         - admin action audit trail
"""

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    Numeric, String, Text, Enum, JSON, UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ─── Enums ────────────────────────────────────────────────────────────────────

class SubscriptionTier(str, PyEnum):
    free = "free"
    basic = "basic"
    premium = "premium"
    enterprise = "enterprise"


class SubscriptionStatus(str, PyEnum):
    trial = "trial"
    active = "active"
    cancelled = "cancelled"
    expired = "expired"


class UserRole(str, PyEnum):
    user = "user"
    manager = "manager"
    admin = "admin"


class PaymentStatus(str, PyEnum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


# ─── Apps catalogue ───────────────────────────────────────────────────────────

class App(Base):
    __tablename__ = "apps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(64), unique=True, nullable=False)     # "smartcalender"
    name = Column(String(128), nullable=False)                 # "SmartCalender"
    description = Column(Text)
    stripe_price_id = Column(String(128))                      # Stripe price ID
    monthly_price_usd = Column(Numeric(10, 2), default=1.00)
    trial_days = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subscriptions = relationship("Subscription", back_populates="app")


# ─── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(128))
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)

    # Profile
    timezone = Column(String(64), default="UTC")
    language = Column(String(8), default="en")
    avatar_url = Column(String(512))

    # Organisation (optional)
    organization_id = Column(String(64))
    organization_name = Column(String(128))

    # Stripe
    stripe_customer_id = Column(String(64), unique=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))

    # Relationships
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user")

    def __repr__(self) -> str:
        return f"<User {self.email}>"


# ─── Subscriptions ────────────────────────────────────────────────────────────

class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        UniqueConstraint("user_id", "app_id", name="uq_user_app_subscription"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=False)

    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.free, nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.trial, nullable=False)
    features = Column(JSON, default=list)          # ["calendar_sync", "advanced_reminders"]

    # Dates
    trial_ends_at = Column(DateTime(timezone=True))
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))       # = expires_at
    cancelled_at = Column(DateTime(timezone=True))

    # Stripe
    stripe_subscription_id = Column(String(64), unique=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    app = relationship("App", back_populates="subscriptions")

    @property
    def expires_at(self) -> datetime | None:
        """Alias used by the desktop app contract."""
        return self.current_period_end

    def __repr__(self) -> str:
        return f"<Subscription user={self.user_id} app={self.app_id} status={self.status}>"


# ─── Payments ─────────────────────────────────────────────────────────────────

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    app_id = Column(UUID(as_uuid=True), ForeignKey("apps.id"), nullable=True)

    amount_usd = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(8), default="usd")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    description = Column(String(255))

    # Stripe
    stripe_payment_intent_id = Column(String(64), unique=True, index=True)
    stripe_invoice_id = Column(String(64))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="payments")


# ─── Refresh tokens ───────────────────────────────────────────────────────────

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)  # SHA-256 of raw token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")

    __table_args__ = (
        Index("ix_refresh_tokens_hash_revoked", "token_hash", "revoked"),
    )


# ─── Email verification codes ──────────────────────────────────────────────────

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    code_hash = Column(String(128), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Admin users ──────────────────────────────────────────────────────────────

class AdminUser(Base):
    """Separate table so admin creds never touch the main users table auth flow."""
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(128))
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True))

    audit_logs = relationship("AuditLog", back_populates="admin")


# ─── Audit logs ───────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(Integer, ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(128), nullable=False)           # "subscription.update", "user.ban"
    target_type = Column(String(64))                       # "user", "subscription"
    target_id = Column(String(64))
    detail = Column(JSON)                                  # before/after snapshot
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    admin = relationship("AdminUser", back_populates="audit_logs")