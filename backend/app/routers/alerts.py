from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.ingredient import Ingredient
from datetime import date

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/")
def get_all_alerts(db: Session = Depends(get_db)):
    items    = db.query(Ingredient).all()
    alerts   = []
    today    = date.today()
    alert_id = 1

    for item in items:
        days_to_exp = (item.expiry_date - today).days if item.expiry_date else 999

        # Critical stock
        if item.current_stock <= 0:
            alerts.append({
                "id":       alert_id,
                "type":     "critical",
                "category": "stock",
                "title":    f"{item.name} is out of stock",
                "desc":     f"Current: 0 {item.unit} · Minimum required: {item.min_stock} {item.unit} · Cannot fulfill orders.",
                "read":     False,
                "time":     "Just now",
            })
            alert_id += 1

        elif item.current_stock < item.min_stock / 2:
            alerts.append({
                "id":       alert_id,
                "type":     "critical",
                "category": "stock",
                "title":    f"{item.name} critically low",
                "desc":     f"Current: {item.current_stock} {item.unit} · Minimum: {item.min_stock} {item.unit} · Reorder immediately.",
                "read":     False,
                "time":     "Just now",
            })
            alert_id += 1

        elif item.current_stock < item.min_stock:
            alerts.append({
                "id":       alert_id,
                "type":     "high",
                "category": "stock",
                "title":    f"{item.name} stock low",
                "desc":     f"Current: {item.current_stock} {item.unit} · Minimum: {item.min_stock} {item.unit} · Reorder recommended.",
                "read":     True,
                "time":     "1 hr ago",
            })
            alert_id += 1

        # Expiry alerts
        if item.expiry_date:
            if days_to_exp <= 0:
                alerts.append({
                    "id":       alert_id,
                    "type":     "critical",
                    "category": "expiry",
                    "title":    f"{item.name} has expired",
                    "desc":     f"Expired on {item.expiry_date}. Remove from inventory immediately.",
                    "read":     False,
                    "time":     "Just now",
                })
                alert_id += 1
            elif days_to_exp <= 2:
                alerts.append({
                    "id":       alert_id,
                    "type":     "high",
                    "category": "expiry",
                    "title":    f"{item.name} expiring in {days_to_exp} day(s)",
                    "desc":     f"{item.name} ({item.current_stock} {item.unit}) expires on {item.expiry_date}. Use immediately.",
                    "read":     False,
                    "time":     "Today",
                })
                alert_id += 1
            elif days_to_exp <= 5:
                alerts.append({
                    "id":       alert_id,
                    "type":     "medium",
                    "category": "expiry",
                    "title":    f"{item.name} expiring soon",
                    "desc":     f"{item.name} expires in {days_to_exp} days on {item.expiry_date}. Plan usage.",
                    "read":     True,
                    "time":     f"{days_to_exp} days",
                })
                alert_id += 1

    # Sort: critical first
    priority = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda a: priority.get(a["type"], 4))
    return alerts