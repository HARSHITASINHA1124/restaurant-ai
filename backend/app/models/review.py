from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base

class Review(Base):
    __tablename__ = "reviews"

    id         = Column(Integer, primary_key=True, index=True)
    author     = Column(String, nullable=False)
    dish       = Column(String, nullable=True)
    rating     = Column(Integer, nullable=False)
    text       = Column(Text, nullable=False)
    sentiment  = Column(String, nullable=True)
    topics     = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())