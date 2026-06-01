from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Try to load from Docker Secret first
if os.path.exists("/run/secrets/backend.env"):
    load_dotenv("/run/secrets/backend.env")
else:
    load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/budgetpro_db"
)


def _build_engine(url: str):
    """Create engine with settings compatible with the configured database."""
    base_options = {
        "pool_pre_ping": True,
    }

    if url.startswith("sqlite"):
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            **base_options,
        )

    return create_engine(
        url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        connect_args={"connect_timeout": 10, "options": "-c timezone=utc"},
        **base_options,
    )


engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_legacy_schema_compatibility():
    """Apply safe additive schema updates required for legacy databases."""
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    if "clients" not in table_names:
        return

    client_columns = {column["name"] for column in inspector.get_columns("clients")}

    if "tipo_inmueble" not in client_columns:
        try:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE clients ADD COLUMN tipo_inmueble VARCHAR")
                )
        except Exception as e:
            print(f"Warning: No se pudo agregar columna tipo_inmueble: {e}")

    if "budgets" in table_names:
        budget_columns = {column["name"] for column in inspector.get_columns("budgets")}
        budget_cols_sql = {
            "accent_color": "ALTER TABLE budgets ADD COLUMN accent_color VARCHAR DEFAULT '#2563eb'",
        }
        for column_name, ddl in budget_cols_sql.items():
            if column_name not in budget_columns:
                try:
                    with engine.begin() as connection:
                        connection.execute(text(ddl))
                    print(f"INFO: Columna budgets.{column_name} agregada automáticamente.")
                except Exception as e:
                    print(f"Warning: No se pudo agregar columna budgets.{column_name}: {e}")

    if "budget_items" in table_names:
        item_columns = {column["name"] for column in inspector.get_columns("budget_items")}
        budget_item_cols_sql = {
            "quantity": "ALTER TABLE budget_items ADD COLUMN quantity FLOAT",
            "unit_price": "ALTER TABLE budget_items ADD COLUMN unit_price FLOAT",
            "is_excluded": "ALTER TABLE budget_items ADD COLUMN is_excluded BOOLEAN DEFAULT FALSE",
        }
        for column_name, ddl in budget_item_cols_sql.items():
            if column_name not in item_columns:
                try:
                    with engine.begin() as connection:
                        connection.execute(text(ddl))
                    print(f"INFO: Columna budget_items.{column_name} agregada automáticamente.")
                except Exception as e:
                    print(f"Warning: No se pudo agregar columna budget_items.{column_name}: {e}")

    # Verificar que las columnas de branding existan (solo informational)
    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        branding_cols = {"company_name", "business_name", "tax_id", "address", "phone", "email_contact", "payment_terms"}
        missing = branding_cols - user_columns
        if missing:
            print(f"INFO: Columnas de branding faltantes en DB: {missing}. Agregar manualmente con usuario postgres.")

        membership_cols_sql = {
            "role": "ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'operador'",
            "membership_expires_at": "ALTER TABLE users ADD COLUMN membership_expires_at TIMESTAMP WITH TIME ZONE",
            "updated_at": "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
        }

        for column_name, ddl in membership_cols_sql.items():
            if column_name not in user_columns:
                try:
                    with engine.begin() as connection:
                        connection.execute(text(ddl))
                    print(f"INFO: Columna users.{column_name} agregada automáticamente.")
                except Exception as e:
                    print(f"Warning: No se pudo agregar columna users.{column_name}: {e}")


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
