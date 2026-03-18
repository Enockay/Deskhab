"""add paystack_reference to payments

Revision ID: 20260318_0002
Revises: 20260318_0001
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260318_0002"
down_revision = "20260318_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("paystack_reference", sa.String(length=64), nullable=True))
    op.create_index("ix_payments_paystack_reference", "payments", ["paystack_reference"])
    op.create_unique_constraint("uq_payments_paystack_reference", "payments", ["paystack_reference"])


def downgrade() -> None:
    op.drop_constraint("uq_payments_paystack_reference", "payments", type_="unique")
    op.drop_index("ix_payments_paystack_reference", table_name="payments")
    op.drop_column("payments", "paystack_reference")

