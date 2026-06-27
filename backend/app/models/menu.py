from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class MenuItem(Base):
    __tablename__ = "menu_items"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String, nullable=False)
    category     = Column(String, nullable=False)
    price        = Column(Float, nullable=False)
    cost         = Column(Float, nullable=False)
    prep_time    = Column(Integer, default=10)
    available    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())