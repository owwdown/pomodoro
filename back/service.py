from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from typing import Optional

from models import Timer, User, Tomato

class TimerService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_current_timer(self, user_id: int) -> Optional[dict]:
        """Получение текущего активного таймера пользователя"""
        stmt = select(Timer).where(
            and_(
                Timer.user_id == user_id,
                Timer.is_completed == False,
                Timer.is_interrupted == False
            )
        ).order_by(Timer.created_at.desc())
        
        result = await self.db.execute(stmt)
        timer = result.scalar_one_or_none()
        
        if not timer:
            return None
        
        # Рассчитываем оставшееся время
        elapsed = datetime.now() - timer.created_at
        
        if timer.type == "work":
            total_duration = timer.work_time * 60
        elif timer.type == "short_break":
            total_duration = timer.break_time * 60
        else:
            total_duration = timer.break_time * 60
            
        time_left = max(0, total_duration - elapsed.total_seconds())
        
        return {
            "type": timer.type,
            "startTime": timer.created_at.isoformat(),
            "duration": total_duration,
            "timeLeft": time_left,
            "timer_id": timer.timer_id
        }

    async def _get_user_settings(self, user_id: int) -> dict:
        """Получение настроек пользователя"""
        stmt = select(User).where(User.user_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one()
        
        return {
            "short_break_duration": user.short_break_duration,
            "long_break_duration": user.long_break_duration,
            "pomodoros_before_long_break": user.pomodoros_before_long_break,
            "pomodoro_count": user.pomodoro_count
        }

    async def _get_next_timer_type(self, user_id: int) -> str:
        """Определение типа следующего таймера"""
        user_settings = await self._get_user_settings(user_id)
        pomodoro_count = user_settings["pomodoro_count"]
        pomodoros_before_long_break = user_settings["pomodoros_before_long_break"]
        
        stmt = select(Timer).where(
            and_(
                Timer.user_id == user_id,
                Timer.is_completed == True
            )
        ).order_by(Timer.created_at.desc())
        
        result = await self.db.execute(stmt)
        last_timer = result.scalar_one_or_none()
        
        if not last_timer or last_timer.type != "work":
            # Если нет предыдущих таймеров или последний был перерывом - начинаем с работы
            return "work"
        else:
            # Последний был work - определяем тип перерыва
            if (pomodoro_count + 1) % pomodoros_before_long_break == 0:
                return "long_break"
            else:
                return "short_break"

    async def start_timer(self, user_id: int, timer_type: str = None) -> dict:
        """Запуск нового таймера"""
        current_timer = await self.get_current_timer(user_id)
        if current_timer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У вас уже есть активный таймер"
            )
        
        if not timer_type:
            timer_type = await self._get_next_timer_type(user_id)
        
        user_settings = await self._get_user_settings(user_id)
        
        timer = Timer(
            user_id=user_id,
            type=timer_type,
            work_time=25,
        )
        
        # Устанавливаем время перерыва в зависимости от типа
        if timer_type == "short_break":
            timer.break_time = user_settings["short_break_duration"]
        elif timer_type == "long_break":
            timer.break_time = user_settings["long_break_duration"]
        
        self.db.add(timer)
        await self.db.commit()
        await self.db.refresh(timer)
        
        return {
            "timer_id": timer.timer_id,
            "type": timer.type,
            "startTime": timer.created_at.isoformat(),
            "duration": timer.work_time * 60 if timer_type == "work" else timer.break_time * 60,
            "message": f"Таймер {'работы' if timer_type == 'work' else 'перерыва'} успешно запущен"
        }

    
    async def complete_timer(self, user_id: int) -> dict:
        """Завершение таймера (естественное завершение)"""
        stmt = select(Timer).where(
            and_(
                Timer.user_id == user_id,
                Timer.is_completed == False,
                Timer.is_interrupted == False
            )
        )
        
        result = await self.db.execute(stmt)
        timer = result.scalar_one_or_none()
        
        if not timer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Активный таймер не найден"
            )
        
        timer.is_completed = True
        
        user_stmt = select(User).where(User.user_id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one()
        
        if timer.type == "work":
            user.pomodoro_count += 1
            
            # Создаем запись о помидоре
            tomato = Tomato(
                user_id=user_id,
                start_time=timer.created_at,
                end_time=datetime.now(),
                was_successful=True,
                sequence_number=user.pomodoro_count
            )
            self.db.add(tomato)
            
            # Создаем/обновляем статистику
            try:
                from statistics.service import StatisticsService
                statistics_service = StatisticsService(self.db)
                await statistics_service.create_daily_statistic(user_id, datetime.now())
            except Exception as e:
                print(f"Ошибка при создании статистики: {e}")
        
        await self.db.commit()
        
        # Определяем следующий тип таймера
        next_timer_type = await self._get_next_timer_type(user_id)
        
        return {
            "message": "Таймер успешно завершен",
            "timer_id": timer.timer_id,
            "completed_at": datetime.now().isoformat(),
            "next_timer_type": next_timer_type,
            "pomodoro_count": user.pomodoro_count,
            "next_timer_description": self._get_timer_description(next_timer_type)
        }

    def _get_timer_description(self, timer_type: str) -> str:
        """Получение описания типа таймера"""
        descriptions = {
            "work": "Время работать!",
            "short_break": "Короткий перерыв",
            "long_break": "Длинный перерыв - отдохните подольше!"
        }
        return descriptions.get(timer_type, "Неизвестный тип таймера")

    async def get_timer_sequence_info(self, user_id: int) -> dict:
        """Получение информации о текущей последовательности таймеров"""
        user_settings = await self._get_user_settings(user_id)
        next_timer_type = await self._get_next_timer_type(user_id)
        
        return {
            "current_pomodoro_count": user_settings["pomodoro_count"],
            "pomodoros_before_long_break": user_settings["pomodoros_before_long_break"],
            "next_timer_type": next_timer_type,
            "next_timer_description": self._get_timer_description(next_timer_type),
            "sequence_progress": f"{user_settings['pomodoro_count'] % user_settings['pomodoros_before_long_break'] + 1}/{user_settings['pomodoros_before_long_break']}"
        }