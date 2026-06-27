from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .models import user, menu, ingredient, recipe, order, review, alert
from .routers import auth, menu as menu_router, inventory, orders, alerts, sales, reviews, recipes

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Restaurant AI API",
    description="Backend for AI Restaurant Intelligence Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(menu_router.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(alerts.router)
app.include_router(sales.router)
app.include_router(reviews.router)
app.include_router(recipes.router)

@app.get("/")
def root():
    return {"message": "Restaurant AI API is running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}