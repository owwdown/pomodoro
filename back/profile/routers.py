from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from auth.dependencies import get_current_user
from profile.service import ProfileService

router = APIRouter()

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError('Имя должно содержать минимум 2 символа')
            if len(v) > 50:
                raise ValueError('Имя не должно превышать 50 символов')
        return v

class DeleteAccountRequest(BaseModel):
    confirm: bool = False

@router.get("/profile")
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение профиля пользователя"""
    profile_service = ProfileService(db)
    profile = await profile_service.get_user_profile(current_user["user_id"])
    return profile

@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Обновление профиля пользователя"""
    profile_service = ProfileService(db)
    result = await profile_service.update_user_profile(
        user_id=current_user["user_id"],
        name=request.name
    )
    return result

@router.delete("/profile")
async def delete_account(
    request: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Удаление аккаунта пользователя"""
    profile_service = ProfileService(db)
    result = await profile_service.delete_user_account(
        user_id=current_user["user_id"],
        confirm=request.confirm
    )
    return result