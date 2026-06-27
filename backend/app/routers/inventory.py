from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.ingredient import Ingredient
from ..schemas.ingredient import IngredientCreate, IngredientUpdate, IngredientOut
from datetime import date

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/", response_model=List[IngredientOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Ingredient).all()

@router.post("/", response_model=IngredientOut)
def create(item: IngredientCreate, db: Session = Depends(get_db)):
    new_item = Ingredient(**item.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{id}", response_model=IngredientOut)
def update(id: int, item: IngredientUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Ingredient).filter(Ingredient.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    for key, val in item.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    db_item = db.query(Ingredient).filter(Ingredient.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    # Delete recipes that use this ingredient first
    from ..models.recipe import Recipe
    db.query(Recipe).filter(Recipe.ingredient_id == id).delete()
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted successfully"}

@router.patch("/{id}/restock")
def restock(id: int, db: Session = Depends(get_db)):
    db_item = db.query(Ingredient).filter(Ingredient.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db_item.current_stock = db_item.min_stock * 2
    db.commit()
    return {"current_stock": db_item.current_stock}

@router.get("/alerts")
def get_low_stock_alerts(db: Session = Depends(get_db)):
    items = db.query(Ingredient).all()
    alerts = []
    today = date.today()
    for item in items:
        if item.current_stock < item.min_stock:
            alerts.append({
                "id": item.id,
                "name": item.name,
                "current_stock": item.current_stock,
                "min_stock": item.min_stock,
                "unit": item.unit,
                "status": "critical" if item.current_stock < item.min_stock / 2 else "low"
            })
        if item.expiry_date:
            days = (item.expiry_date - today).days
            if days < 0:
                status = "expired"
            elif days <= 2:
                status = "expiring"
            else:
                status = None
            if status:
                alerts.append({
                    "id": item.id,
                    "name": item.name,
                    "expiry_date": str(item.expiry_date),
                    "days_left": days,
                    "status": status
                })
    return alerts