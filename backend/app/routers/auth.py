from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserOut, Token
from passlib.context import CryptContext
from jose import jwt
from ..config import settings
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)

def create_token(data: dict):
    to_encode = data.copy()
    expire    = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

class UserRegister(BaseModel):
    name:     str
    email:    str
    password: str
    role:     Optional[str] = "owner"

class ProfileUpdate(BaseModel):
    name:            Optional[str] = None
    restaurant_name: Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None
    gst:             Optional[str] = None

@router.post("/register", response_model=Token)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    valid_roles = ["owner", "manager", "staff", "kitchen"]
    role = user.role if user.role in valid_roles else "owner"

    new_user = User(
        name     = user.name,
        email    = user.email,
        password = hash_password(user.password),
        role     = role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_token({"sub": str(new_user.id), "email": new_user.email})
    return {"access_token": token, "token_type": "bearer", "user": new_user}

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"sub": str(user.id), "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me/{id}")
def get_profile(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id":              user.id,
        "name":            user.name,
        "email":           user.email,
        "role":            user.role,
        "restaurant_name": user.restaurant_name or "",
        "phone":           user.phone           or "",
        "address":         user.address         or "",
        "gst":             user.gst             or "",
    }

@router.patch("/me/{id}")
def update_profile(id: int, body: ProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name            is not None: user.name            = body.name
    if body.restaurant_name is not None: user.restaurant_name = body.restaurant_name
    if body.phone           is not None: user.phone           = body.phone
    if body.address         is not None: user.address         = body.address
    if body.gst             is not None: user.gst             = body.gst
    db.commit()
    db.refresh(user)
    return {
        "id":              user.id,
        "name":            user.name,
        "email":           user.email,
        "role":            user.role,
        "restaurant_name": user.restaurant_name or "",
        "phone":           user.phone           or "",
        "address":         user.address         or "",
        "gst":             user.gst             or "",
    }

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "is_active": u.is_active} for u in users]

@router.patch("/users/{id}/role")
def update_role(id: int, body: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    valid_roles = ["owner", "manager", "staff", "kitchen"]
    if body.get("role") not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = body["role"]
    db.commit()
    return {"id": user.id, "name": user.name, "role": user.role}

@router.patch("/users/{id}/toggle")
def toggle_active(id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}