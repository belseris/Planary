from pydantic import BaseModel, EmailStr, Field
from uuid import UUID

class ProfileMe(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    gender: str
    age: int
    avatar_url: str | None = None

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=100)
    gender: str
    age: int = Field(..., ge=1, le=120)

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)
