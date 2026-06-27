from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, index=True, nullable=False)
    password        = Column(String, nullable=False)
    role            = Column(String, default="owner")
    is_active       = Column(Boolean, default=True)
    restaurant_name = Column(String, nullable=True)
    phone           = Column(String, nullable=True)
    address         = Column(String, nullable=True)
    gst             = Column(String, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())