from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.recipe import Recipe
from ..models.ingredient import Ingredient
from ..models.menu import MenuItem
from pydantic import BaseModel

router = APIRouter(prefix="/recipes", tags=["Recipes"])

class RecipeItemCreate(BaseModel):
    ingredient_id: int
    quantity:      float

class RecipeCreate(BaseModel):
    menu_item_id: int
    ingredients:  List[RecipeItemCreate]

@router.get("/{menu_item_id}")
def get_recipe(menu_item_id: int, db: Session = Depends(get_db)):
    recipes = db.query(Recipe).filter(Recipe.menu_item_id == menu_item_id).all()
    result  = []
    for r in recipes:
        ing = db.query(Ingredient).filter(Ingredient.id == r.ingredient_id).first()
        if ing:
            result.append({
                "id":            r.id,
                "ingredient_id": r.ingredient_id,
                "name":          ing.name,
                "quantity":      r.quantity,
                "unit":          ing.unit,
            })
    return result

@router.post("/")
def save_recipe(data: RecipeCreate, db: Session = Depends(get_db)):
    # Delete existing recipes for this dish first
    db.query(Recipe).filter(Recipe.menu_item_id == data.menu_item_id).delete()
    db.commit()

    # Add new ones
    for item in data.ingredients:
        recipe = Recipe(
            menu_item_id  = data.menu_item_id,
            ingredient_id = item.ingredient_id,
            quantity      = item.quantity,
        )
        db.add(recipe)
    db.commit()
    return {"message": "Recipe saved", "count": len(data.ingredients)}

@router.delete("/{menu_item_id}")
def delete_recipe(menu_item_id: int, db: Session = Depends(get_db)):
    db.query(Recipe).filter(Recipe.menu_item_id == menu_item_id).delete()
    db.commit()
    return {"message": "Recipe deleted"}