from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    name:     str
    email:    str
    password: str

class UserLogin(BaseModel):
    email:    str
    password: str

class UserOut(BaseModel):
    id:              int
    name:            str
    email:           str
    role:            str
    restaurant_name: Optional[str] = None
    phone:           Optional[str] = None
    address:         Optional[str] = None
    gst:             Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         UserOut