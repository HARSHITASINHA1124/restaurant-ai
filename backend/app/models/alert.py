from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id         = Column(Integer, primary_key=True, index=True)
    type       = Column(String, nullable=False)
    category   = Column(String, nullable=False)
    title      = Column(String, nullable=False)
    desc       = Column(String, nullable=False)
    read       = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())