from pydantic import BaseModel
from typing import Optional

class MenuItemCreate(BaseModel):
    name: str
    category: str
    price: float
    cost: float
    prep_time: Optional[int] = 10
    available: Optional[bool] = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    prep_time: Optional[int] = None
    available: Optional[bool] = None

class MenuItemOut(BaseModel):
    id: int
    name: str
    category: str
    price: float
    cost: float
    prep_time: int
    available: bool

    class Config:
        from_attributes = True