# 🍽️ AI Restaurant Intelligence Platform

A full-stack AI-powered restaurant operations and inventory management system built with **React**, **FastAPI**, **PostgreSQL**, and **Claude AI**.

![Platform Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-blue)
![Claude AI](https://img.shields.io/badge/Claude-AI%20Powered-orange)

---

## 🚀 Features

| Module | Description |
|--------|-------------|
| 🔐 **Authentication** | JWT-based login & register with role selection |
| 📊 **Live Dashboard** | Real-time revenue, orders, stock alerts — auto-refreshes every 60s |
| 🍛 **Menu Management** | Full CRUD with profit margin calculator and recipe builder |
| 📦 **Inventory** | Auto stock deduction on orders, expiry alerts, one-click restock |
| 🛒 **Orders** | POS-style order builder → kitchen flow → served |
| 📈 **Sales Analytics** | Revenue, profit, hourly trends, dish performance from real DB |
| 🧠 **AI Forecast** | Demand prediction from 30 days of real sales history |
| ⭐ **Review Sentiment** | Claude AI detects sentiment, topics, and generates business summary |
| 💰 **Dynamic Pricing** | Claude AI suggests optimal prices — saves directly to database |
| 🔔 **Alerts Center** | Real-time low stock + expiry alerts from PostgreSQL |
| 🔍 **Global Search** | Search across menu, inventory and orders from the topbar |
| 👥 **Role-Based Access** | Owner / Manager / Staff / Kitchen — each sees only what they need |
| ⚙️ **Settings** | Profile saved to DB, preferences persisted locally, user management |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** — dark theme UI
- **Recharts** — data visualization
- **React Router DOM** — client-side routing
- **Axios** — API communication
- **Lucide React** — icons

### Backend
- **FastAPI** — REST API
- **PostgreSQL** — primary database
- **SQLAlchemy** — ORM
- **JWT (python-jose)** — authentication
- **bcrypt / passlib** — password hashing
- **Uvicorn** — ASGI server

### AI / ML
- **Claude AI (claude-sonnet)** — review sentiment analysis & dynamic pricing
- **Statistical forecasting** — weighted averages + weekend pattern detection
- **Recipe-aware reorder** — ingredient-level stock prediction

---

## 👥 Role-Based Access Control

| Role | Access |
|------|--------|
| **Owner** | Full access to all pages + User Management |
| **Manager** | All pages except Settings |
| **Staff** | Orders + Menu (view only) |
| **Kitchen** | Orders page only |

---

## 📁 Project Structure

```
restaurant-ai-platform/
│
├── restaurant-ai/              # React Frontend
│   ├── src/
│   │   ├── pages/              # Dashboard, Menu, Inventory, Orders...
│   │   ├── components/         # Sidebar, Topbar
│   │   ├── permissions.js      # Role-based access config
│   │   ├── SettingsContext.jsx # Global settings state
│   │   └── api.js              # Axios API layer
│   └── package.json
│
└── backend/                    # FastAPI Backend
    ├── app/
    │   ├── models/             # SQLAlchemy DB models
    │   ├── routers/            # API route handlers
    │   ├── schemas/            # Pydantic schemas
    │   ├── database.py         # DB connection
    │   ├── config.py           # Environment settings
    │   └── main.py             # FastAPI app entry
    ├── seed.py                 # Seeds 30 days of realistic order history
    └── .env                    # Environment variables (not committed)
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Restaurant owners and staff with roles |
| `restaurants` | Restaurant profiles |
| `menu_items` | Dishes with price, cost, prep time |
| `ingredients` | Inventory with stock levels, expiry, supplier |
| `recipes` | Dish → ingredient mapping with quantities |
| `orders` | Customer orders with table, status, total |
| `order_items` | Individual dishes inside each order |
| `reviews` | Customer reviews with AI sentiment |

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 18

### 1. Clone the repository
```bash
git clone https://github.com/HARSHITASINHA1124/restaurant-ai.git
cd restaurant-ai
```

### 2. Frontend setup
```bash
cd restaurant-ai
npm install
npm run dev
# Runs on http://localhost:5173
```

### 3. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic \
  python-jose passlib bcrypt python-multipart pydantic-settings python-dotenv
```

### 4. Configure environment
Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/restaurant_ai
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 5. Create database & seed
```bash
psql -U postgres -c "CREATE DATABASE restaurant_ai;"
python seed.py
# Seeds 30 days of realistic order history → 300+ orders
```

### 6. Run backend
```bash
uvicorn app.main:app --reload
# Runs on http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

---

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account with role |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me/{id}` | Get user profile |
| PATCH | `/auth/me/{id}` | Update profile |
| GET | `/auth/users` | List all users (owner only) |
| PATCH | `/auth/users/{id}/role` | Update user role |

### Menu
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/menu/` | Get all dishes |
| POST | `/menu/` | Add new dish |
| PUT | `/menu/{id}` | Update dish |
| DELETE | `/menu/{id}` | Delete dish |
| PATCH | `/menu/{id}/toggle` | Toggle availability |
| PATCH | `/menu/{id}/price` | Update price (AI pricing) |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory/` | Get all ingredients |
| POST | `/inventory/` | Add ingredient |
| PUT | `/inventory/{id}` | Update ingredient |
| DELETE | `/inventory/{id}` | Delete ingredient |
| PATCH | `/inventory/{id}/restock` | Restock to safe level |
| GET | `/inventory/alerts` | Get low stock + expiry alerts |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/` | Get all orders |
| POST | `/orders/` | Place order (auto-deducts inventory) |
| PATCH | `/orders/{id}/status` | Update order status |
| GET | `/orders/stats` | Summary stats |
| DELETE | `/orders/reset` | Clear all orders |

### Sales & Forecast
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sales/dashboard` | Real-time dashboard stats |
| GET | `/sales/weekly` | 7-day revenue breakdown |
| GET | `/sales/top-dishes` | Best performing dishes |
| GET | `/sales/hourly` | Today's hourly order volume |
| GET | `/sales/category-revenue` | Revenue by category |
| GET | `/sales/forecast` | Per-dish demand predictions |
| GET | `/sales/forecast/chart` | Actual vs forecast chart data |
| GET | `/sales/reorder` | Smart reorder recommendations |
| GET | `/sales/export` | Export all data as JSON |

### Recipes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/recipes/{menu_item_id}` | Get recipe for a dish |
| POST | `/recipes/` | Save recipe (links dish → ingredients) |
| DELETE | `/recipes/{menu_item_id}` | Delete recipe |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviews/` | Get all reviews |
| POST | `/reviews/` | Add review with AI sentiment |
| DELETE | `/reviews/{id}` | Delete review |
| GET | `/reviews/stats` | Sentiment statistics |

---

## 🧠 AI Features

### 1. Review Sentiment Analysis (Claude AI)
- Add a customer review → Claude detects **positive / negative / neutral**
- Extracts topics: taste, service, price, hygiene, portion, freshness, wait time
- **AI Summary** → Claude reads all reviews and generates business strengths, weaknesses & urgent action
- Results saved to PostgreSQL

### 2. Dynamic Pricing Engine (Claude AI)
- Claude considers: demand level, customer sentiment, ingredient cost changes, profit margin
- Returns suggested price + 2-sentence reasoning + confidence score + strategy
- **Apply** button saves new price directly to PostgreSQL
- Price instantly reflects in Menu and Orders

### 3. Demand Forecasting (Statistical ML)
- Uses last 30 days of real PostgreSQL order data
- Weekend boost factor (1.35×) applied automatically
- Per-dish daily predictions with confidence scores
- Recipe-aware reorder recommendations with cost estimates

---

## 🏗️ Architecture Highlights

### Auto Inventory Deduction
```
Order placed
→ Backend fetches recipes for each dish
→ Deducts ingredient quantities × order quantity
→ Stock updates in real-time
→ Low stock alerts trigger automatically
```

### Recipe Builder
```
Menu item "Hot Chocolate"
→ Link: Milk (0.25L) + Coffee Powder (0.01kg)
→ Order 10 Hot Chocolates
→ Milk: -2.5L, Coffee Powder: -0.1kg ✅
```

### Multi-Tenancy Ready
```
Architecture supports multiple restaurants:
Each restaurant gets isolated data via restaurant_id
Owner manages their own team with role-based access
```

---

## 📸 Pages Overview

- **Login** — Role-based registration with visual role selector
- **Dashboard** — Live stats, revenue chart, category pie, stock alerts (auto-refreshes)
- **Menu** — Dish cards with margin badges, recipe builder, availability toggle
- **Inventory** — Stock progress bars, expiry countdown, category filters
- **Orders** — POS order builder, kitchen live view, order history
- **Sales** — Area charts, hourly heatmap, dish performance table, AI insights
- **AI Forecast** — Actual vs predicted line chart, weekly dish forecast, reorder table
- **Reviews** — Sentiment analysis, topic extraction, AI business summary
- **Pricing** — AI price suggestions with reasoning panel, revenue impact calculator
- **Alerts** — Color-coded alerts by severity, real-time from DB
- **Settings** — Profile (DB), preferences (local), user management, export & reset

---

## 💡 Resume Bullet Point

> Built a full-stack AI-powered restaurant intelligence platform using **React, FastAPI, PostgreSQL and Claude AI** — featuring role-based access control (4 roles), recipe-linked inventory auto-deduction, 30-day demand forecasting from live sales data, Claude-powered review sentiment analysis and dynamic menu pricing that persists to database, JWT authentication, global search, and real-time notifications.

---

## 👩‍💻 Author

**Harshita Sinha**
Student at Thapar Institute of Engineering & Technology
Intern at EazeWork Technologies

**Stack:** React · FastAPI · PostgreSQL · SQLAlchemy · Claude AI · Tailwind CSS · Recharts · JWT

---

## 📄 License

MIT License — feel free to use this project as a reference or template.