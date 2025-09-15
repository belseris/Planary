from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=100)
    gender: str
    age: int = Field(..., ge=1, le=120)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class RegisterResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    gender: str
    age: int
    avatar_url: str | None = None

    class Config:
        from_attributes = True
