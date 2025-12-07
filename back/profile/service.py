from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import re

from models import User, Timer

class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _validate_email(self, email: str) -> bool:
        """Валидация email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    async def get_user_profile(self, user_id: int) -> dict:
        """Получение профиля пользователя"""
        stmt = select(User).where(User.user_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        timer_stmt = (
            select(Timer)
            .where(Timer.user_id == user_id)
            .order_by(Timer.created_at.desc())
            .limit(1)
        )
        timer_result = await self.db.execute(timer_stmt)
        last_timer = timer_result.scalar_one_or_none()
        
        return {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name,
            "sub_status": user.sub_status,
            "pomodoro_count": user.pomodoro_count,
            "settings": {
                "work_time": last_timer.work_time if last_timer else 25,
                "break_time": last_timer.break_time if last_timer else 5,
                "short_break_duration": 5,
                "long_break_duration": 15,
                "pomodoros_before_long_break": 4 
            }
        }

    async def update_user_profile(
        self, 
        user_id: int, 
        name: Optional[str] = None
    ) -> dict:
        """Обновление профиля пользователя"""
        stmt = select(User).where(User.user_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        updates = {}
        
        if name is not None:
            name = name.strip()
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
            user.name = name
            updates["name"] = name
        
        if updates:
            await self.db.commit()
            await self.db.refresh(user)
        
        return {
            "success": True,
            "message": "Профиль успешно обновлен",
            "updates": updates
        }
