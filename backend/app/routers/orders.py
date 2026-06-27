from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.order import Order, OrderItem
from ..models.ingredient import Ingredient
from ..models.recipe import Recipe
from ..schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from ..models.menu import MenuItem
from pydantic import BaseModel

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("/", response_model=List[OrderOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()

@router.post("/", response_model=OrderOut)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    total = sum(i.unit_price * i.quantity for i in order.items)
    new_order = Order(table_no=order.table_no, total=total)
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for item in order.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item with ID {item.menu_item_id} not found")

        order_item = OrderItem(
            order_id     = new_order.id,
            menu_item_id = item.menu_item_id,
            quantity     = item.quantity,
            unit_price   = item.unit_price,
        )
        db.add(order_item)

        # Auto deduct inventory
        recipes = db.query(Recipe).filter(Recipe.menu_item_id == item.menu_item_id).all()
        for recipe in recipes:
            ingredient = db.query(Ingredient).filter(Ingredient.id == recipe.ingredient_id).first()
            if ingredient:
                ingredient.current_stock = max(0, ingredient.current_stock - (recipe.quantity * item.quantity))

    db.commit()
    db.refresh(new_order)
    return new_order

class StatusUpdate(BaseModel):
    status: str

@router.patch("/{id}/status")
def update_status(id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = body.status
    db.commit()
    return {"status": order.status}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    orders = db.query(Order).all()
    served = [o for o in orders if o.status == "Served"]
    return {
        "total_orders":   len(orders),
        "served_orders":  len(served),
        "total_revenue":  sum(o.total for o in served),
        "active_orders":  len([o for o in orders if o.status not in ["Served", "Cancelled"]]),
    }

@router.delete("/reset")
def reset_orders(db: Session = Depends(get_db)):
    db.query(OrderItem).delete()
    db.query(Order).delete()
    db.commit()
    return {"message": "All orders cleared"}