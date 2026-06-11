from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


# --- Users ---
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    logo_url: Optional[str] = None
    logo_size: Optional[int] = Field(default=180, ge=80, le=320)
    pdf_font_size: Optional[int] = Field(default=13, ge=10, le=18)
    pdf_description_font_size: Optional[int] = Field(default=14, ge=11, le=22)


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    is_active: bool
    role: Optional[str] = "operador"
    membership_expires_at: Optional[datetime] = None
    created_at: datetime

    # === Branding ===
    company_name: Optional[str] = None
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email_contact: Optional[str] = None
    payment_terms: Optional[str] = None

    class Config:
        from_attributes = True


# --- Company Settings ---
class CompanySettingsBase(BaseModel):
    """Campos editables de branding para la empresa del usuario."""
    name: Optional[str] = None
    logo_size: Optional[int] = Field(default=None, ge=80, le=320)
    pdf_font_size: Optional[int] = Field(default=None, ge=10, le=18)
    pdf_description_font_size: Optional[int] = Field(default=None, ge=11, le=22)
    company_name: Optional[str] = None
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email_contact: Optional[str] = None
    payment_terms: Optional[str] = None


class CompanySettingsResponse(CompanySettingsBase):
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


# --- Clients ---
class ClientBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    tipo_inmueble: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    name: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Budget Items ---
class BudgetItemBase(BaseModel):
    description: str
    amount: float = 0.0
    order_index: int = 0
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    is_excluded: bool = False


class BudgetItemCreate(BudgetItemBase):
    pass


class BudgetItemResponse(BudgetItemBase):
    id: int
    budget_db_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Budgets ---
class BudgetBase(BaseModel):
    client: str
    validity: Optional[str] = "15 días"
    accent_color: Optional[str] = "#2563eb"
    is_manual_total: int = 0
    total: Optional[float] = None


class BudgetCreate(BudgetBase):
    date: Optional[datetime] = None
    items: List[BudgetItemCreate] = []


class BudgetUpdate(BaseModel):
    client: Optional[str] = None
    date: Optional[datetime] = None
    validity: Optional[str] = None
    accent_color: Optional[str] = None
    status: Optional[str] = None
    total: Optional[float] = None
    is_manual_total: Optional[int] = None
    items: Optional[List[BudgetItemCreate]] = None


class BudgetResponse(BudgetBase):
    id: int
    budget_id: str
    date: datetime
    status: str
    total: float
    created_at: datetime
    updated_at: datetime
    items: List[BudgetItemResponse] = []

    @field_validator('validity', mode='before')
    @classmethod
    def coerce_validity(cls, v):
        return v if v is not None else ''

    @field_validator('accent_color', mode='before')
    @classmethod
    def coerce_accent_color(cls, v):
        return v if v is not None else '#2563eb'

    class Config:
        from_attributes = True


class BudgetListResponse(BaseModel):
    id: int
    budget_id: str
    client: str
    date: datetime
    status: str
    total: float

    class Config:
        from_attributes = True
