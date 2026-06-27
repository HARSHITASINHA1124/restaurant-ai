from pydantic import BaseModel
from typing import Optional
from datetime import date

class IngredientCreate(BaseModel):
    name: str
    category: str
    current_stock: float
    unit: str
    min_stock: float
    cost_per_unit: float
    supplier: Optional[str] = None
    expiry_date: Optional[date] = None

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    current_stock: Optional[float] = None
    unit: Optional[str] = None
    min_stock: Optional[float] = None
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None
    expiry_date: Optional[date] = None

class IngredientOut(BaseModel):
    id: int
    name: str
    category: str
    current_stock: float
    unit: str
    min_stock: float
    cost_per_unit: float
    supplier: Optional[str]
    expiry_date: Optional[date]

    class Config:
        from_attributes = True