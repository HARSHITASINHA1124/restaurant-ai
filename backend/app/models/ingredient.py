from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from sqlalchemy.sql import func
from ..database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    category      = Column(String, nullable=False)
    current_stock = Column(Float, nullable=False)
    unit          = Column(String, nullable=False)
    min_stock     = Column(Float, nullable=False)
    cost_per_unit = Column(Float, nullable=False)
    supplier      = Column(String, nullable=True)
    expiry_date   = Column(Date, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())