from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, and_
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel, validator

from models import Timer, User, Tomato, Statistic 

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
        
        # Используем start_time, если есть, иначе created_at
        start_time = timer.start_time if timer.start_time else timer.created_at
        
        # Рассчитываем оставшееся время
        elapsed = datetime.now() - start_time
        
        if timer.type == "work":
            total_duration = timer.work_time * 60
        elif timer.type == "short_break":
            total_duration = timer.break_time * 60
        else:  # long_break
            total_duration = timer.break_time * 60
            
        time_left = max(0, total_duration - elapsed.total_seconds())
        
        return {
            "timer_id": timer.timer_id,
            "type": timer.type,
            "work_time": timer.work_time,
            "break_time": timer.break_time,
            "startTime": start_time.isoformat(),
            "duration": total_duration,
            "timeLeft": time_left,
            "is_completed": timer.is_completed,
            "is_interrupted": timer.is_interrupted
        }

    async def _get_user_settings(self, user_id: int) -> dict:
        """Получение настроек пользователя из последнего таймера"""
        # Получаем последний таймер пользователя
        stmt = select(Timer).where(
            Timer.user_id == user_id
        ).order_by(Timer.created_at.desc())
        
        result = await self.db.execute(stmt)
        last_timer = result.first()
        
        # Получаем пользователя для счетчика помидоров
        user_stmt = select(User).where(User.user_id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one()
        
        # Если есть последний таймер, используем его настройки
        if last_timer:
            last_timer = last_timer[0]
            work_time = last_timer.work_time
            break_time = last_timer.break_time
        else:
            work_time = 25
            break_time = 5
        
        return {
            "work_time": work_time,
            "break_time": break_time,
            "pomodoro_count": user.pomodoro_count,
            "short_break_duration": 5,  
            "long_break_duration": 15,
            "pomodoros_before_long_break": 4
        }

    async def _get_next_timer_type(self, user_id: int) -> str:
        """Определение типа следующего таймера"""
        user_settings = await self._get_user_settings(user_id)
        pomodoro_count = user_settings["pomodoro_count"]
        
        # Получаем последний завершенный таймер
        stmt = select(Timer).where(
            and_(
                Timer.user_id == user_id,
                Timer.is_completed == True
            )
        ).order_by(Timer.created_at.desc())
        
        result = await self.db.execute(stmt)
        last_timer_result = result.first()
        
        if not last_timer_result or last_timer_result[0].type != "work":
            return "work"
        else:
            if (pomodoro_count + 1) % user_settings["pomodoros_before_long_break"] == 0:
                return "long_break"
            else:
                return "short_break"

    async def start_timer(self, user_id: int, timer_type: str = None) -> dict:
        """Запуск нового таймера"""
        if timer_type and timer_type not in ["work", "short_break", "long_break"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Недопустимый тип таймера. Допустимые значения: work, short_break, long_break"
            )
        
        current_timer = await self.get_current_timer(user_id)
        if current_timer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У вас уже есть активный таймер"
            )
        
        if not timer_type:
            timer_type = await self._get_next_timer_type(user_id)
        
        user_settings = await self._get_user_settings(user_id)

        timer_stmt = select(Timer).where(Timer.user_id == user_id).order_by(Timer.created_at.desc())
        timer_result = await self.db.execute(timer_stmt)
        last_timer_result = timer_result.first()
        
        if last_timer_result:
            last_timer = last_timer_result[0]
            work_time = last_timer.work_time
            break_time = last_timer.break_time
        else:
            work_time = user_settings["work_time"]
            break_time = user_settings["break_time"]
        
        timer = Timer(
            user_id=user_id,
            type=timer_type,
            work_time=work_time,
            break_time=break_time,
            start_time=datetime.now()
        )
        
        if timer_type == "short_break":
            timer.break_time = user_settings["short_break_duration"]
        elif timer_type == "long_break":
            timer.break_time = user_settings["long_break_duration"]
        
        self.db.add(timer)
        await self.db.commit()
        await self.db.refresh(timer)
        
        duration = timer.work_time * 60 if timer_type == "work" else timer.break_time * 60
        
        return {
            "success": True,
            "timer_id": timer.timer_id,
            "type": timer.type,
            "work_time": timer.work_time,
            "break_time": timer.break_time,
            "startTime": timer.start_time.isoformat() if timer.start_time else timer.created_at.isoformat(),
            "duration": duration,
            "message": f"Таймер {'работы' if timer_type == 'work' else 'перерыва'} успешно запущен"
        }

    async def stop_timer(self, user_id: int) -> dict:
        """Остановка активного таймера"""
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
        
        # Помечаем таймер как прерванный
        timer.is_interrupted = True
        timer.end_time = datetime.now()
        
        await self.db.commit()
        
        if timer.type == "work":
            await self._update_statistics(user_id, timer)
        
        return {
            "success": True,
            "message": "Таймер успешно остановлен",
            "timer_id": timer.timer_id,
            "type": timer.type,
            "interrupted_at": datetime.now().isoformat()
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
        
        timer.end_time = datetime.now()
        timer.is_completed = True
        
        user_stmt = select(User).where(User.user_id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one()
        
        if timer.type == "work":
            user.pomodoro_count += 1
            
            tomato = Tomato(
                user_id=user_id,
                start_time=timer.start_time,
                end_time=datetime.now(),
                was_successful=True,
                sequence_number=user.pomodoro_count
            )
            self.db.add(tomato)
            
            await self._update_statistics(user_id, timer)
        
        await self.db.commit()
        
        next_timer_type = await self._get_next_timer_type(user_id)
        
        return {
            "success": True,
            "message": "Таймер успешно завершен",
            "timer_id": timer.timer_id,
            "type": timer.type,
            "completed_at": datetime.now().isoformat(),
            "next_timer_type": next_timer_type,
            "pomodoro_count": user.pomodoro_count,
            "next_timer_description": self._get_timer_description(next_timer_type)
        }

    async def _update_statistics(self, user_id: int, timer: Timer):
        """Обновление статистики для завершенного рабочего таймера"""
        try:
            timer_date = timer.start_time.date()
            
            stmt = select(Statistic).where(
                and_(
                    Statistic.user_id == user_id,
                    func.date(Statistic.date) == timer_date
                )
            )
            result = await self.db.execute(stmt)
            existing_stat = result.scalar_one_or_none()
            
            if existing_stat:
                if timer.is_completed and not timer.is_interrupted:
                    existing_stat.tomatoes += 1
                
                existing_stat.completed_timers += 1
                
                if timer.type == "work" and timer.work_time:
                    existing_stat.total_focus_time += timer.work_time
            else:
                stat = Statistic(
                    user_id=user_id,
                    date=timer.start_time,
                    tomatoes=1 if (timer.is_completed and not timer.is_interrupted) else 0,
                    completed_timers=1,
                    total_focus_time=timer.work_time if timer.type == "work" else 0
                )
                self.db.add(stat)
            
            await self.db.commit()
        
        except Exception as e:
            await self.db.rollback()
            print(f"Ошибка при обновлении статистики: {e}")
        
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
        
        pomodoros_before_long_break = user_settings["pomodoros_before_long_break"]
        pomodoro_count = user_settings["pomodoro_count"]
        
        current_in_session = pomodoro_count % pomodoros_before_long_break
        if current_in_session == 0 and pomodoro_count > 0:
            current_in_session = pomodoros_before_long_break
        elif current_in_session == 0:
            current_in_session = 1
        
        return {
            "current_pomodoro_count": pomodoro_count,
            "pomodoros_before_long_break": pomodoros_before_long_break,
            "next_timer_type": next_timer_type,
            "next_timer_description": self._get_timer_description(next_timer_type),
            "sequence_progress": f"{current_in_session}/{pomodoros_before_long_break}",
            "progress_percentage": int((current_in_session / pomodoros_before_long_break) * 100) if pomodoros_before_long_break > 0 else 0
        }
    
    async def reset_pomodoro_counter(self, user_id: int) -> dict:
        """Сброс счетчика помидоров"""
        stmt = select(User).where(User.user_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        user.pomodoro_count = 0
        await self.db.commit()
        
        return {
            "success": True,
            "message": "Счетчик помидоров сброшен",
            "pomodoro_count": 0
        }
    
class TimerSettingsUpdate(BaseModel):
    work_time: Optional[int] = None
    break_time: Optional[int] = None
    long_break_duration: Optional[int] = None
    
    @validator('work_time')
    def validate_work_time(cls, v):
        if v is not None and (v < 1 or v > 90):
            raise ValueError('Длительность работы должна быть от 1 до 90 минут')
        return v
    
    @validator('break_time')
    def validate_break_time(cls, v):
        if v is not None and (v < 1 or v > 30):
            raise ValueError('Короткий перерыв должен быть от 1 до 30 минут')
        return v
    
    @validator('long_break_duration')
    def validate_long_break(cls, v):
        if v is not None and (v < 1 or v > 60):
            raise ValueError('Длинный перерыв должен быть от 1 до 60 минут')
        return v


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_timer_settings(self, user_id: int) -> dict:
        """Получение настроек таймера пользователя"""
        stmt = select(User).where(User.user_id == user_id)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        timer_stmt = select(Timer).where(
            Timer.user_id == user_id
        ).order_by(Timer.created_at.desc())
        timer_result = await self.db.execute(timer_stmt)
        last_timer_result = timer_result.first()
        
        if last_timer_result:
            last_timer = last_timer_result[0]
            default_work_time = last_timer.work_time
            default_break_time = last_timer.break_time
        else:
            default_work_time = 25
            default_break_time = 5
        
        return {
            "work_time": default_work_time,
            "break_time": default_break_time,
            "long_break_duration": 15, 
            "pomodoros_before_long_break": 4,
            "current_pomodoro_count": user.pomodoro_count
        }

    async def update_timer_settings(
        self, 
        user_id: int, 
        settings_update: TimerSettingsUpdate
    ) -> dict:
        """Обновление настроек таймера"""
        timer = Timer(
            user_id=user_id,
            type="settings",
            work_time=settings_update.work_time if settings_update.work_time is not None else 25,
            break_time=settings_update.break_time if settings_update.break_time is not None else 5,
            is_completed=True,
            is_interrupted=False
        )
        
        self.db.add(timer)
        await self.db.commit()
        await self.db.refresh(timer)
        
        updates = {}
        if settings_update.work_time is not None:
            updates["work_time"] = settings_update.work_time
        if settings_update.break_time is not None:
            updates["break_time"] = settings_update.break_time
        
        return {
            "success": True,
            "message": "Настройки успешно обновлены",
            "updates": updates,
            "timer_id": timer.timer_id
        }

    async def get_user_default_settings(self, user_id: int) -> dict:
        """Получение дефолтных настроек пользователя"""
        timer_stmt = select(Timer).where(
            Timer.user_id == user_id
        ).order_by(Timer.created_at.desc())
        timer_result = await self.db.execute(timer_stmt)
        last_timer_result = timer_result.first()
        
        if last_timer_result:
            last_timer = last_timer_result[0]
            work_time = last_timer.work_time
            break_time = last_timer.break_time
        else:
            work_time = 25
            break_time = 5
        
        return {
            "work_time": work_time,
            "break_time": break_time,
            "long_break_duration": 15,
            "short_break_duration": 5,
            "pomodoros_before_long_break": 4
        }