"""
Admin panel using sqladmin.
Access at: /admin
Auth: separate AdminUser credentials (not the main users table).
"""

from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.core.security import verify_password
from app.db.models import User, Subscription, Payment, App, AdminUser, AuditLog, RefreshToken


# ─── Auth backend ─────────────────────────────────────────────────────────────

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username")
        password = form.get("password")

        # Avoid circular import — import session factory here
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(AdminUser).where(AdminUser.email == email))
            admin = result.scalar_one_or_none()
            if not admin or not admin.is_active:
                return False
            if not verify_password(password, admin.hashed_password):
                return False

        request.session.update({"admin_email": email})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return "admin_email" in request.session


# ─── Model views ──────────────────────────────────────────────────────────────

class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"

    column_list = [
        User.id, User.email, User.name, User.role,
        User.is_active, User.created_at, User.last_login_at,
    ]
    column_searchable_list = [User.email, User.name]
    column_filters = [User.role, User.is_active]
    column_sortable_list = [User.created_at, User.last_login_at, User.email]

    # Don't expose hashed password in admin
    form_excluded_columns = [
        User.hashed_password, User.refresh_tokens,
        User.stripe_customer_id,
    ]
    can_delete = True
    can_create = False   # Use register flow instead


class SubscriptionAdmin(ModelView, model=Subscription):
    name = "Subscription"
    name_plural = "Subscriptions"
    icon = "fa-solid fa-credit-card"

    column_list = [
        Subscription.id, Subscription.user_id,
        Subscription.tier, Subscription.status,
        Subscription.current_period_end, Subscription.trial_ends_at,
        Subscription.stripe_subscription_id,
    ]
    column_filters = [Subscription.tier, Subscription.status]
    column_sortable_list = [Subscription.current_period_end]
    can_delete = False


class PaymentAdmin(ModelView, model=Payment):
    name = "Payment"
    name_plural = "Payments"
    icon = "fa-solid fa-money-bill"

    column_list = [
        Payment.id, Payment.user_id, Payment.amount_usd,
        Payment.status, Payment.created_at, Payment.stripe_invoice_id,
    ]
    column_filters = [Payment.status]
    column_sortable_list = [Payment.created_at, Payment.amount_usd]
    can_create = False
    can_delete = False


class AppAdmin(ModelView, model=App):
    name = "App"
    name_plural = "Apps"
    icon = "fa-solid fa-box"

    column_list = [
        App.slug, App.name, App.monthly_price_usd,
        App.trial_days, App.is_active,
    ]
    can_delete = False


class AuditLogAdmin(ModelView, model=AuditLog):
    name = "Audit Log"
    name_plural = "Audit Logs"
    icon = "fa-solid fa-clipboard-list"

    column_list = [
        AuditLog.created_at, AuditLog.admin_id,
        AuditLog.action, AuditLog.target_type, AuditLog.target_id,
    ]
    column_sortable_list = [AuditLog.created_at]
    can_create = False
    can_edit = False
    can_delete = False


class AdminUserAdmin(ModelView, model=AdminUser):
    name = "Admin User"
    name_plural = "Admin Users"
    icon = "fa-solid fa-shield"

    column_list = [AdminUser.email, AdminUser.name, AdminUser.is_active, AdminUser.is_superadmin]
    form_excluded_columns = [AdminUser.hashed_password, AdminUser.audit_logs]
    can_delete = False


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_admin(app, engine) -> Admin:
    """Call this in main.py after creating the FastAPI app."""
    authentication_backend = AdminAuth(secret_key=settings.ADMIN_SECRET_KEY)
    admin = Admin(
        app=app,
        engine=engine,
        authentication_backend=authentication_backend,
        title="Deskhab Admin",
        base_url="/admin",
    )
    admin.add_view(UserAdmin)
    admin.add_view(SubscriptionAdmin)
    admin.add_view(PaymentAdmin)
    admin.add_view(AppAdmin)
    admin.add_view(AuditLogAdmin)
    admin.add_view(AdminUserAdmin)
    return admin