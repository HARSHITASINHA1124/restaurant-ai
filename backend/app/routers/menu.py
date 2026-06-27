from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.menu import MenuItem
from ..schemas.menu import MenuItemCreate, MenuItemUpdate, MenuItemOut

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.get("/", response_model=List[MenuItemOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(MenuItem).all()

@router.post("/", response_model=MenuItemOut)
def create(item: MenuItemCreate, db: Session = Depends(get_db)):
    new_item = MenuItem(**item.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{id}", response_model=MenuItemOut)
def update(id: int, item: MenuItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(MenuItem).filter(MenuItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, val in item.model_dump(exclude_unset=True).items():
        setattr(db_item, key, val)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{id}")
def delete(id: int, db: Session = Depends(get_db)):
    db_item = db.query(MenuItem).filter(MenuItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Delete in correct order to avoid FK violations
    from ..models.recipe import Recipe
    from ..models.order import OrderItem
    db.query(Recipe).filter(Recipe.menu_item_id == id).delete()
    db.query(OrderItem).filter(OrderItem.menu_item_id == id).delete()

    db.delete(db_item)
    db.commit()
    return {"message": "Deleted successfully"}

@router.patch("/{id}/toggle")
def toggle_availability(id: int, db: Session = Depends(get_db)):
    db_item = db.query(MenuItem).filter(MenuItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.available = not db_item.available
    db.commit()
    return {"available": db_item.available}


@router.patch("/{id}/price")
def update_price(id: int, body: dict, db: Session = Depends(get_db)):
    db_item = db.query(MenuItem).filter(MenuItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db_item.price = body["price"]
    db.commit()
    db.refresh(db_item)
    return {
        "id":       db_item.id,
        "name":     db_item.name,
        "price":    db_item.price,
        "cost":     db_item.cost,
        "margin":   round(((db_item.price - db_item.cost) / db_item.price) * 100)
    }