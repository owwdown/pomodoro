from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re

from models import User
from auth.dependencies import create_access_token
from auth.code_service import CodeService

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_email(self, email: str) -> bool:
        """Валидация email с помощью регулярного выражения"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    async def register_user(self, email: str, name: str) -> dict:
        """Регистрация нового пользователя - отправка кода подтверждения"""
        email = email.lower().strip()
        name = name.strip()

        # Валидация email
        if not self._validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат email"
            )

        # Проверка имени
        if len(name) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Имя должно содержать минимум 2 символа"
            )
        
        if len(name) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Имя не должно превышать 50 символов"
            )

        # Проверка, что пользователь с таким email еще не зарегистрирован
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        # Отправляем код подтверждения
        code_service = CodeService(self.db)
        result = await code_service.send_code_for_registration(email)
        
        return {
            "success": True,
            "message": result["message"],
            "email": email,
            "requires_code_verification": True
        }

   