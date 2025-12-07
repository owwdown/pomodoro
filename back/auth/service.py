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

        if not self._validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат email"
            )

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

        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        code_service = CodeService(self.db)
        result = await code_service.send_code_for_registration(email)
        
        return {
            "success": True,
            "message": result["message"],
            "email": email,
            "requires_code_verification": True
        }

    async def verify_code_and_register(self, email: str, code: str, name: str) -> dict:
        """Подтверждение кода и завершение регистрации"""
        email = email.lower().strip()
        code = code.strip()
        name = name.strip()

        if not self._validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат email"
            )

        if len(code) != 6 or not code.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Код должен содержать ровно 6 цифр"
            )

        if len(name) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Имя должно содержать минимум 2 символа"
            )

        code_service = CodeService(self.db)
        is_valid = await code_service.verify_code(email, code)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный или просроченный код"
            )

        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        user = User(email=email, name=name)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        access_token = create_access_token(
            data={"user_id": user.user_id, "email": user.email}
        )
        
        return {
            "success": True,
            "message": "Регистрация успешно завершена",
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "access_token": access_token,
            "token_type": "bearer"
        }
    
class LoginService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_email(self, email: str) -> bool:
        """Валидация email с помощью регулярного выражения"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    async def login_user(self, email: str) -> dict:
        """отправка кода подтверждения"""
        email = email.lower().strip()

        if not self._validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат email"
            )
        
        code_service = CodeService(self.db)
        result = await code_service.send_code_for_registration(email)
        
        return {
            "success": True,
            "message": result["message"],
            "email": email,
            "requires_code_verification": True
        }

    async def verify_code_and_login(self, email: str, code: str) -> dict:
        """Подтверждение кода и вход в систему"""
        email = email.lower().strip()
        code = code.strip()

        if not self._validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат email"
            )

        if len(code) != 6 or not code.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Код должен содержать ровно 6 цифр"
            )

        code_service = CodeService(self.db)
        is_valid = await code_service.verify_code(email, code)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный или просроченный код"
            )

        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        access_token = create_access_token(
            data={"user_id": user.user_id, "email": user.email}
        )
        
        return {
            "success": True,
            "message": "Вход выполнен успешно",
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "access_token": access_token,
            "token_type": "bearer"
        }
   