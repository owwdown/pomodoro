from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import List, Optional

from models import Statistic, Timer, Tomato

class StatisticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_statistics(
        self, 
        user_id: int, 
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[dict]:
        """Получение статистики пользователя за период"""
        
        # Если даты не указаны, берем последнюю неделю
        if not date_from:
            date_from = datetime.now() - timedelta(days=7)
        if not date_to:
            date_to = datetime.now()
        
        try:
            # Получаем статистику из таблицы статистики
            stmt = select(Statistic).where(
                and_(
                    Statistic.user_id == user_id,
                    Statistic.date >= date_from,
                    Statistic.date <= date_to
                )
            ).order_by(Statistic.date.desc())
            
            result = await self.db.execute(stmt)
            statistics = result.scalars().all()
            
            # Если статистики нет, генерируем ее из таймеров и помидоров
            if not statistics:
                return await self._generate_statistics_from_data(user_id, date_from, date_to)
            
            return [
                {
                    "date": stat.date.strftime("%Y-%m-%d"),
                    "completedPomodoros": stat.tomatoes or 0,
                    "totalFocusTime": stat.total_focus_time or 0
                }
                for stat in statistics
            ]
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при получении статистики: {str(e)}"
            )

    async def _generate_statistics_from_data(
        self, 
        user_id: int, 
        date_from: datetime, 
        date_to: datetime
    ) -> List[dict]:
        """Генерация статистики из данных таймеров и помидоров"""
        # Получаем завершенные рабочие таймеры
        stmt_timers = select(Timer).where(
            and_(
                Timer.user_id == user_id,
                Timer.created_at >= date_from,
                Timer.created_at <= date_to,
                Timer.is_completed == True,
                Timer.type == "work"
            )
        )
        
        result_timers = await self.db.execute(stmt_timers)
        completed_timers = result_timers.scalars().all()
        
        # Получаем успешные помидоры
        stmt_tomatoes = select(Tomato).where(
            and_(
                Tomato.user_id == user_id,
                Tomato.start_time >= date_from,
                Tomato.start_time <= date_to,
                Tomato.was_successful == True
            )
        )
        
        result_tomatoes = await self.db.execute(stmt_tomatoes)
        completed_tomatoes = result_tomatoes.scalars().all()
        
        # Группируем по дням
        daily_stats = {}
        
        # Обрабатываем таймеры
        for timer in completed_timers:
            date_key = timer.created_at.strftime("%Y-%m-%d")
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    "completedPomodoros": 0,
                    "totalFocusTime": 0
                }
            
            daily_stats[date_key]["totalFocusTime"] += timer.work_time
        
        # Обрабатываем помидоры
        for tomato in completed_tomatoes:
            date_key = tomato.start_time.strftime("%Y-%m-%d")
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    "completedPomodoros": 0,
                    "totalFocusTime": 0
                }
            
            daily_stats[date_key]["completedPomodoros"] += 1
        
        # Преобразуем в список и сортируем по дате
        statistics_list = [
            {
                "date": date,
                "completedPomodoros": stats["completedPomodoros"],
                "totalFocusTime": stats["totalFocusTime"]
            }
            for date, stats in daily_stats.items()
        ]
        
        # Сортируем по дате (от новых к старым)
        statistics_list.sort(key=lambda x: x["date"], reverse=True)
        
        return statistics_list

    async def create_daily_statistic(self, user_id: int, date: datetime) -> Statistic:
        """Создание дневной статистики"""
        # Подсчет данных за день
        completed_tomatoes = await self._get_completed_tomatoes_count(user_id, date)
        total_focus_time = await self._get_total_focus_time(user_id, date)
        
        # Создаем или обновляем статистику
        stmt = select(Statistic).where(
            and_(
                Statistic.user_id == user_id,
                func.date(Statistic.date) == func.date(date)
            )
        )
        result = await self.db.execute(stmt)
        existing_stat = result.scalar_one_or_none()
        
        if existing_stat:
            existing_stat.tomatoes = completed_tomatoes
            existing_stat.total_focus_time = total_focus_time
            statistic = existing_stat
        else:
            statistic = Statistic(
                user_id=user_id,
                date=date,
                tomatoes=completed_tomatoes,
                total_focus_time=total_focus_time
            )
            self.db.add(statistic)
        
        await self.db.commit()
        await self.db.refresh(statistic)
        return statistic

    async def _get_completed_tomatoes_count(self, user_id: int, date: datetime) -> int:
        """Получение количества завершенных помидоров за день"""
        stmt = select(func.count(Tomato.id)).where(
            and_(
                Tomato.user_id == user_id,
                func.date(Tomato.start_time) == func.date(date),
                Tomato.was_successful == True
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _get_total_focus_time(self, user_id: int, date: datetime) -> int:
        """Получение общего времени фокусировки за день (в минутах)"""
        stmt = select(func.sum(Timer.work_time)).where(
            and_(
                Timer.user_id == user_id,
                func.date(Timer.created_at) == func.date(date),
                Timer.is_completed == True,
                Timer.type == "work"
            )
        )
        result = await self.db.execute(stmt)
        total_time = result.scalar() or 0
        return total_time