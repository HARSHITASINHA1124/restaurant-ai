from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from ..database import get_db
from ..models.order import Order, OrderItem
from ..models.menu import MenuItem
from datetime import date, timedelta

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    today     = date.today()
    week_ago  = today - timedelta(days=7)

    # Today's orders
    today_orders = db.query(Order).filter(
        func.date(Order.created_at) == today,
        Order.status == "Served"
    ).all()

    # This week's orders
    week_orders = db.query(Order).filter(
        func.date(Order.created_at) >= week_ago,
        Order.status == "Served"
    ).all()

    # Last week for comparison
    last_week_start = today - timedelta(days=14)
    last_week_end   = today - timedelta(days=7)
    last_week_orders = db.query(Order).filter(
        func.date(Order.created_at) >= last_week_start,
        func.date(Order.created_at) < last_week_end,
        Order.status == "Served"
    ).all()

    today_revenue    = sum(o.total for o in today_orders)
    week_revenue     = sum(o.total for o in week_orders)
    last_week_rev    = sum(o.total for o in last_week_orders)
    revenue_change   = round(((week_revenue - last_week_rev) / last_week_rev * 100), 1) if last_week_rev else 0

    # Active orders
    active_orders = db.query(Order).filter(
        Order.status.in_(["Pending", "Preparing", "Ready"])
    ).count()

    # Total menu items
    total_menu = db.query(MenuItem).count()

    return {
        "today_revenue":   today_revenue,
        "today_orders":    len(today_orders),
        "week_revenue":    week_revenue,
        "week_orders":     len(week_orders),
        "revenue_change":  revenue_change,
        "active_orders":   active_orders,
        "total_menu":      total_menu,
    }

@router.get("/weekly")
def get_weekly_revenue(db: Session = Depends(get_db)):
    today    = date.today()
    days     = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        orders = db.query(Order).filter(
            func.date(Order.created_at) == day,
            Order.status == "Served"
        ).all()

        revenue = sum(o.total for o in orders)
        profit  = round(revenue * 0.47)  # avg 47% margin

        days.append({
            "day":     day.strftime("%a"),
            "date":    str(day),
            "revenue": revenue,
            "orders":  len(orders),
            "profit":  profit,
        })

    return days

@router.get("/top-dishes")
def get_top_dishes(db: Session = Depends(get_db)):
    results = db.query(
        MenuItem.name,
        MenuItem.price,
        MenuItem.cost,
        func.sum(OrderItem.quantity).label("total_sold"),
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("total_revenue"),
    ).join(OrderItem, OrderItem.menu_item_id == MenuItem.id)\
     .join(Order, Order.id == OrderItem.order_id)\
     .filter(Order.status == "Served")\
     .group_by(MenuItem.id)\
     .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())\
     .limit(8).all()

    dishes = []
    for r in results:
        revenue = float(r.total_revenue or 0)
        cost    = float(r.cost or 0)
        price   = float(r.price or 1)
        margin  = round(((price - cost) / price) * 100)
        profit  = round(revenue * (margin / 100))
        dishes.append({
            "name":    r.name,
            "sales":   int(r.total_sold or 0),
            "revenue": round(revenue),
            "profit":  profit,
            "margin":  margin,
        })

    return dishes

@router.get("/hourly")
def get_hourly_orders(db: Session = Depends(get_db)):
    today   = date.today()
    orders  = db.query(Order).filter(
        func.date(Order.created_at) == today
    ).all()

    hourly = {}
    for hour in range(9, 23):
        hourly[hour] = 0

    for order in orders:
        hour = order.created_at.hour
        if hour in hourly:
            hourly[hour] += 1

    return [
        {"hour": f"{h}{'am' if h < 12 else 'pm'}", "orders": count}
        for h, count in hourly.items()
    ]

@router.get("/category-revenue")
def get_category_revenue(db: Session = Depends(get_db)):
    results = db.query(
        MenuItem.category,
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
    ).join(OrderItem, OrderItem.menu_item_id == MenuItem.id)\
     .join(Order, Order.id == OrderItem.order_id)\
     .filter(Order.status == "Served")\
     .group_by(MenuItem.category).all()

    return [{"name": r.category, "value": round(float(r.revenue or 0))} for r in results]

@router.get("/forecast")
def get_forecast(db: Session = Depends(get_db)):
    today    = date.today()
    all_menu = db.query(MenuItem).all()

    # Get last 30 days of sales per dish
    results = db.query(
        MenuItem.name,
        func.date(Order.created_at).label("sale_date"),
        func.sum(OrderItem.quantity).label("qty")
    ).join(OrderItem, OrderItem.menu_item_id == MenuItem.id)\
     .join(Order, Order.id == OrderItem.order_id)\
     .filter(
         Order.status == "Served",
         func.date(Order.created_at) >= today - timedelta(days=30)
     ).group_by(MenuItem.name, func.date(Order.created_at)).all()

    # Build per-dish history
    from collections import defaultdict
    dish_sales = defaultdict(list)
    for r in results:
        dish_sales[r.name].append(int(r.qty))

    forecast = []
    for dish in all_menu:
        history  = dish_sales.get(dish.name, [])
        avg_day  = round(sum(history) / len(history), 1) if history else 0
        is_weekend = today.weekday() >= 4

        # Simple forecasting logic
        today_pred    = round(avg_day * (1.3 if is_weekend else 1.0))
        tomorrow_pred = round(avg_day * (1.4 if (today + timedelta(days=1)).weekday() >= 4 else 1.05))
        week_pred     = sum([
            round(avg_day * (1.35 if (today + timedelta(days=i)).weekday() >= 4 else 1.0))
            for i in range(7)
        ])

        # Confidence based on data availability
        confidence = min(97, 70 + len(history) * 2) if history else 65

        trend = tomorrow_pred - today_pred

        forecast.append({
            "dish":       dish.name,
            "today":      today_pred,
            "tomorrow":   tomorrow_pred,
            "week":       week_pred,
            "confidence": confidence,
            "trend":      trend,
            "avg_daily":  avg_day,
        })

    forecast.sort(key=lambda x: x["week"], reverse=True)
    return forecast

@router.get("/forecast/chart")
def get_forecast_chart(db: Session = Depends(get_db)):
    today = date.today()

    # Last 7 days actual
    actual_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = db.query(func.sum(OrderItem.quantity))\
            .join(Order, Order.id == OrderItem.order_id)\
            .filter(
                func.date(Order.created_at) == day,
                Order.status == "Served"
            ).scalar() or 0
        actual_data.append({
            "day":      day.strftime("%a"),
            "actual":   int(count),
            "forecast": None,
        })

    # Calculate avg for forecasting
    avg = sum(d["actual"] for d in actual_data) / 7 if actual_data else 50

    # Next 7 days forecast
    for i in range(1, 8):
        future_day = today + timedelta(days=i)
        is_weekend  = future_day.weekday() >= 4
        predicted   = round(avg * (1.35 if is_weekend else 1.05))
        actual_data.append({
            "day":      future_day.strftime("%a") + "+",
            "actual":   None,
            "forecast": predicted,
        })

    return actual_data

@router.get("/reorder")
def get_reorder_recommendations(db: Session = Depends(get_db)):
    today    = date.today()
    all_menu = db.query(MenuItem).all()

    # Get forecast per dish for next 7 days
    results = db.query(
        MenuItem.name,
        func.avg(OrderItem.quantity).label("avg_qty")
    ).join(OrderItem, OrderItem.menu_item_id == MenuItem.id)\
     .join(Order, Order.id == OrderItem.order_id)\
     .filter(
         Order.status == "Served",
         func.date(Order.created_at) >= today - timedelta(days=14)
     ).group_by(MenuItem.name).all()

    avg_sales = {r.name: float(r.avg_qty or 0) for r in results}

    # Get ingredient needs
    from ..models.recipe import Recipe
    from ..models.ingredient import Ingredient

    ingredient_needs = defaultdict(float)
    for dish in all_menu:
        avg    = avg_sales.get(dish.name, 0)
        week   = round(avg * 7 * 1.2)  # 7 days + 20% buffer
        recipes = db.query(Recipe).filter(Recipe.menu_item_id == dish.id).all()
        for r in recipes:
            ingredient_needs[r.ingredient_id] += r.quantity * week

    ingredients  = db.query(Ingredient).all()
    reorder_list = []

    for ing in ingredients:
        needed  = ingredient_needs.get(ing.id, 0)
        current = ing.current_stock
        reorder = max(0, needed - current)

        if reorder > 0:
            urgency = "critical" if current < ing.min_stock / 2 else \
                      "high"     if current < ing.min_stock      else "low"
        else:
            urgency = "none"

        reorder_list.append({
            "ingredient": ing.name,
            "current":    f"{current} {ing.unit}",
            "needed":     f"{round(needed, 1)} {ing.unit}",
            "reorder":    f"{round(reorder, 1)} {ing.unit}",
            "urgency":    urgency,
            "cost":       round(reorder * ing.cost_per_unit),
        })

    reorder_list.sort(key=lambda x: {"critical":0,"high":1,"low":2,"none":3}[x["urgency"]])
    return reorder_list

@router.get("/export")
def export_all_data(db: Session = Depends(get_db)):
    from ..models.ingredient import Ingredient
    from ..models.review import Review

    menu_items  = db.query(MenuItem).all()
    ingredients = db.query(Ingredient).all()
    orders      = db.query(Order).all()
    reviews     = db.query(Review).all()

    return {
        "exported_at": str(date.today()),
        "menu_items": [
            {"id": m.id, "name": m.name, "category": m.category,
             "price": m.price, "cost": m.cost, "available": m.available}
            for m in menu_items
        ],
        "ingredients": [
            {"id": i.id, "name": i.name, "category": i.category,
             "current_stock": i.current_stock, "unit": i.unit,
             "min_stock": i.min_stock, "cost_per_unit": i.cost_per_unit}
            for i in ingredients
        ],
        "orders": [
            {"id": o.id, "table_no": o.table_no, "status": o.status,
             "total": o.total, "created_at": str(o.created_at)}
            for o in orders
        ],
        "reviews": [
            {"id": r.id, "author": r.author, "rating": r.rating,
             "sentiment": r.sentiment, "text": r.text}
            for r in reviews
        ],
        "summary": {
            "total_menu_items":  len(menu_items),
            "total_ingredients": len(ingredients),
            "total_orders":      len(orders),
            "total_revenue":     round(sum(o.total for o in orders if o.status == "Served"), 2),
            "total_reviews":     len(reviews),
        }
    }