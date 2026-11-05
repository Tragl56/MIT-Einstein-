"""Persistência transacional da demonstração mobile completa."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "mobile_snapshot_1"
down_revision = "51ca7e13050e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "oncoflow_demo_snapshot",
        sa.Column("id", sa.String(40), primary_key=True),
        sa.Column("snapshot", postgresql.JSONB(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("ALTER TABLE oncoflow_demo_snapshot ENABLE ROW LEVEL SECURITY")


def downgrade():
    op.drop_table("oncoflow_demo_snapshot")
