from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id            = Column(Integer, primary_key=True, index=True)
    menu_item_id  = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity      = Column(Float, nullable=False)

    menu_item  = relationship("MenuItem",    foreign_keys=[menu_item_id])
    ingredient = relationship("Ingredient",  foreign_keys=[ingredient_id])