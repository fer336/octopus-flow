from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum


class BudgetStatus(enum.Enum):
    PENDIENTE = "Pendiente"
    ACEPTADO = "Aceptado"
    RECHAZADO = "Rechazado"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    name = Column(String)
    picture = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    logo_size = Column(Integer, nullable=True, default=180)
    pdf_font_size = Column(Integer, nullable=True, default=13)
    pdf_description_font_size = Column(Integer, nullable=True, default=14)
    is_active = Column(Boolean, default=True)
    role = Column(String(50), default="operador")
    membership_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # === Branding / Empresa ===
    company_name = Column(String, nullable=True)
    business_name = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email_contact = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)

    # Relationships
    clients = relationship("Client", back_populates="user")
    budgets = relationship("Budget", back_populates="user")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, index=True, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    tipo_inmueble = Column(String, nullable=True)
    address = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)  # CUIT/RUT/NIF
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="clients")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    budget_id = Column(
        String, index=True
    )  # PR-001, PR-002 (Unique constraint is handled at DB level: user_id + budget_id)
    client = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    validity = Column(String, nullable=True, default="15 días")
    accent_color = Column(String, nullable=True, default="#2563eb")
    status = Column(SQLEnum(BudgetStatus), default=BudgetStatus.PENDIENTE)
    total = Column(Float, default=0.0)
    is_manual_total = Column(Integer, default=0)  # 0 = automatic, 1 = manual
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="budgets")
    items = relationship(
        "BudgetItem", back_populates="budget", cascade="all, delete-orphan"
    )

    # Enforce uniqueness of budget_id per user
    __table_args__ = (
        UniqueConstraint("user_id", "budget_id", name="ix_budgets_user_id_budget_id"),
    )


class BudgetItem(Base):
    __tablename__ = "budget_items"

    id = Column(Integer, primary_key=True, index=True)
    budget_db_id = Column(Integer, ForeignKey("budgets.id", ondelete="CASCADE"))
    description = Column(String, nullable=False)
    amount = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    quantity = Column(Float, nullable=True)
    unit_price = Column(Float, nullable=True)
    is_excluded = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    budget = relationship("Budget", back_populates="items")
