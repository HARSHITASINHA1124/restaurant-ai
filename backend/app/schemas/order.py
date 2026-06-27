from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int
    unit_price: float

class OrderCreate(BaseModel):
    table_no: str
    items: List[OrderItemCreate]

class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    table_no: str
    status: str
    total: float
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: Literal["Pending", "Preparing", "Served"]