from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from auth.service import AuthService

router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Имя должно содержать минимум 2 символа')
        if len(v.strip()) > 50:
            raise ValueError('Имя не должно превышать 50 символов')
        return v.strip()

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    name: str
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not v or len(v.strip()) != 6:
            raise ValueError('Код должен содержать 6 цифр')
        if not v.isdigit():
            raise ValueError('Код должен содержать только цифры')
        return v.strip()
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Имя должно содержать минимум 2 символа')
        if len(v.strip()) > 50:
            raise ValueError('Имя не должно превышать 50 символов')
        return v.strip()

class AuthResponse(BaseModel):
    success: bool
    message: str
    user_id: int = None
    name: str = None
    email: str = None
    access_token: str = None
    token_type: str = None
    requires_code_verification: bool = False

@router.post("/auth/register", response_model=AuthResponse)
async def register_user(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_session)
):
    """Регистрация пользователя - отправка кода подтверждения"""
    auth_service = AuthService(db)
    result = await auth_service.register_user(request.email, request.name)
    return AuthResponse(**result)
