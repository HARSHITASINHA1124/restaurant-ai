import sys, os, random
from datetime import date, datetime, timedelta
from sqlalchemy import func
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.menu import MenuItem
from app.models.ingredient import Ingredient
from app.models.recipe import Recipe
from app.models.order import Order, OrderItem

db = SessionLocal()

# ── Clear in correct order ──
db.query(Recipe).delete()
db.query(OrderItem).delete()
db.query(Order).delete()
db.query(MenuItem).delete()
db.query(Ingredient).delete()
db.commit()

# ── Seed menu items ──
menu_items = [
    MenuItem(name="Paneer Butter Masala", category="Main Course", price=220, cost=95,  prep_time=20, available=True),
    MenuItem(name="Veg Burger",           category="Snacks",      price=120, cost=55,  prep_time=10, available=True),
    MenuItem(name="Cold Coffee",          category="Beverages",   price=100, cost=40,  prep_time=5,  available=True),
    MenuItem(name="Pasta Arrabbiata",     category="Main Course", price=180, cost=90,  prep_time=25, available=True),
    MenuItem(name="Margherita Pizza",     category="Snacks",      price=299, cost=130, prep_time=30, available=False),
    MenuItem(name="Gulab Jamun",          category="Desserts",    price=80,  cost=30,  prep_time=5,  available=True),
    MenuItem(name="Masala Chai",          category="Beverages",   price=40,  cost=12,  prep_time=5,  available=True),
    MenuItem(name="Veg Biryani",          category="Main Course", price=200, cost=85,  prep_time=35, available=True),
]
db.add_all(menu_items)
db.commit()

# ── Seed ingredients ──
ingredients = [
    Ingredient(name="Paneer",        category="Dairy",      current_stock=3,   unit="kg",  min_stock=5,   cost_per_unit=280, supplier="Fresh Dairy Co.",  expiry_date=date(2026, 6, 28)),
    Ingredient(name="Tomato",        category="Vegetables", current_stock=12,  unit="kg",  min_stock=6,   cost_per_unit=30,  supplier="Green Farms",       expiry_date=date(2026, 6, 27)),
    Ingredient(name="Cheese",        category="Dairy",      current_stock=1,   unit="kg",  min_stock=3,   cost_per_unit=350, supplier="Fresh Dairy Co.",  expiry_date=date(2026, 7, 10)),
    Ingredient(name="Cream",         category="Dairy",      current_stock=2.5, unit="L",   min_stock=4,   cost_per_unit=120, supplier="Fresh Dairy Co.",  expiry_date=date(2026, 6, 29)),
    Ingredient(name="Flour",         category="Grains",     current_stock=20,  unit="kg",  min_stock=10,  cost_per_unit=45,  supplier="Grain Masters",     expiry_date=date(2026, 8, 1)),
    Ingredient(name="Rice",          category="Grains",     current_stock=15,  unit="kg",  min_stock=8,   cost_per_unit=60,  supplier="Grain Masters",     expiry_date=date(2026, 9, 1)),
    Ingredient(name="Milk",          category="Dairy",      current_stock=10,  unit="L",   min_stock=8,   cost_per_unit=55,  supplier="Fresh Dairy Co.",  expiry_date=date(2026, 6, 26)),
    Ingredient(name="Coffee Powder", category="Beverages",  current_stock=2,   unit="kg",  min_stock=1,   cost_per_unit=400, supplier="Brew Supplies",     expiry_date=date(2026, 12, 1)),
    Ingredient(name="Butter",        category="Dairy",      current_stock=4,   unit="kg",  min_stock=3,   cost_per_unit=450, supplier="Fresh Dairy Co.",  expiry_date=date(2026, 7, 15)),
    Ingredient(name="Burger Buns",   category="Grains",     current_stock=12,  unit="pcs", min_stock=30,  cost_per_unit=8,   supplier="Bakery Direct",     expiry_date=date(2026, 6, 27)),
    Ingredient(name="Cumin",         category="Spices",     current_stock=0.5, unit="kg",  min_stock=0.3, cost_per_unit=200, supplier="Spice World",       expiry_date=date(2026, 12, 1)),
    Ingredient(name="Pasta",         category="Grains",     current_stock=8,   unit="kg",  min_stock=5,   cost_per_unit=90,  supplier="Grain Masters",     expiry_date=date(2026, 10, 1)),
]
db.add_all(ingredients)
db.commit()

# ── Fetch IDs ──
def m(name): return db.query(MenuItem).filter(MenuItem.name == name).first()
def i(name): return db.query(Ingredient).filter(Ingredient.name == name).first()

# ── Seed recipes ──
recipes = [
    Recipe(menu_item_id=m("Paneer Butter Masala").id, ingredient_id=i("Paneer").id,        quantity=0.2),
    Recipe(menu_item_id=m("Paneer Butter Masala").id, ingredient_id=i("Tomato").id,        quantity=0.1),
    Recipe(menu_item_id=m("Paneer Butter Masala").id, ingredient_id=i("Cream").id,         quantity=0.05),
    Recipe(menu_item_id=m("Paneer Butter Masala").id, ingredient_id=i("Butter").id,        quantity=0.02),
    Recipe(menu_item_id=m("Veg Burger").id,           ingredient_id=i("Burger Buns").id,   quantity=1),
    Recipe(menu_item_id=m("Veg Burger").id,           ingredient_id=i("Cheese").id,        quantity=0.05),
    Recipe(menu_item_id=m("Cold Coffee").id,           ingredient_id=i("Milk").id,          quantity=0.25),
    Recipe(menu_item_id=m("Cold Coffee").id,           ingredient_id=i("Coffee Powder").id, quantity=0.02),
    Recipe(menu_item_id=m("Pasta Arrabbiata").id,      ingredient_id=i("Pasta").id,         quantity=0.15),
    Recipe(menu_item_id=m("Pasta Arrabbiata").id,      ingredient_id=i("Tomato").id,        quantity=0.1),
    Recipe(menu_item_id=m("Margherita Pizza").id,      ingredient_id=i("Flour").id,         quantity=0.15),
    Recipe(menu_item_id=m("Margherita Pizza").id,      ingredient_id=i("Cheese").id,        quantity=0.1),
    Recipe(menu_item_id=m("Veg Biryani").id,           ingredient_id=i("Rice").id,          quantity=0.25),
    Recipe(menu_item_id=m("Masala Chai").id,           ingredient_id=i("Milk").id,          quantity=0.15),
]
db.add_all(recipes)
db.commit()

# ── Seed 30 days of realistic orders ──
all_menu = db.query(MenuItem).all()
today    = date.today()

# Realistic demand per dish per day
BASE_DEMAND = {
    "Paneer Butter Masala": 18,
    "Veg Burger":           15,
    "Cold Coffee":          28,
    "Pasta Arrabbiata":     12,
    "Margherita Pizza":     10,
    "Gulab Jamun":          10,
    "Masala Chai":          35,
    "Veg Biryani":          16,
}

TABLES = [f"Table {i}" for i in range(1, 11)]
STATUSES_HISTORICAL = ["Served"]

print("Seeding 30 days of orders...")

for day_offset in range(29, -1, -1):
    day = today - timedelta(days=day_offset)

    # Weekend boost
    is_weekend  = day.weekday() >= 4
    day_mult    = round(random.uniform(1.3, 1.6), 2) if is_weekend else round(random.uniform(0.8, 1.1), 2)

    # Generate 8-15 orders per day
    num_orders = random.randint(8, 15)

    for _ in range(num_orders):
        # Random time during restaurant hours 9am-10pm
        hour   = random.randint(9, 22)
        minute = random.randint(0, 59)
        order_time = datetime(day.year, day.month, day.day, hour, minute)

        # Pick 1-4 dishes per order
        num_dishes = random.randint(1, 4)
        chosen     = random.sample(all_menu, min(num_dishes, len(all_menu)))

        items     = []
        order_total = 0

        for dish in chosen:
            base_qty = BASE_DEMAND.get(dish.name, 10)
            qty      = max(1, round(random.gauss(base_qty / num_orders * day_mult, 1)))
            qty      = min(qty, 5)
            subtotal = dish.price * qty
            order_total += subtotal
            items.append(OrderItem(
                menu_item_id = dish.id,
                quantity     = qty,
                unit_price   = dish.price,
            ))

        order = Order(
            table_no   = random.choice(TABLES),
            status     = "Served",
            total      = order_total,
            created_at = order_time,
        )
        db.add(order)
        db.flush()

        for item in items:
            item.order_id = order.id
            db.add(item)

db.commit()

total_orders = db.query(Order).count()
total_revenue = db.query(func.sum(Order.total)).filter(Order.status == "Served").scalar()
print(f"✅ Seeded successfully!")
print(f"   Orders: {total_orders}")
print(f"   Total Revenue: ₹{round(total_revenue or 0):,}")
db.close()