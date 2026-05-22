from typing import Optional
from pydantic import BaseModel

from pydantic import BaseModel
class UserLogin(BaseModel):
    email: str
    password: str

class LocalItemOut(BaseModel):
    local_item_id: int
    branch_id: int
    name: str
    category_name: str
    weight: int
    selling_price: Optional[float]  # can be None
    production_cost: Optional[float]  # can be None

class LocalItemCreate(BaseModel):
    name: str
    category_name: str
    weight: int
    selling_price: Optional[float] = None  # default None if not provided
    production_cost: Optional[float] = None

class LocalItemUpdate(BaseModel):
    name: Optional[str] = None
    category_name: Optional[str] = None
    weight: Optional[int] = None
    selling_price: Optional[float] = None
    production_cost: Optional[float] = None


class InventoryCreate(BaseModel):
    product_id: Optional[int] = None
    item_name: Optional[str] = None
    quantity: int


class InventoryUpdate(BaseModel):
    product_id: Optional[int] = None
    item_name: Optional[str] = None
    quantity: Optional[int] = None


class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: str
    address: str


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class RequisitionUpdate(BaseModel):
    approved: Optional[bool] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_done: Optional[float] = None


class PricingUpdate(BaseModel):
    selling_price: Optional[float] = None
    production_cost: Optional[float] = None