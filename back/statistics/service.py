from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

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
        
        if not date_from:
            date_from = datetime.now() - timedelta(days=30)
        if not date_to:
            date_to = datetime.now()
        
        try:
            stmt = select(Statistic).where(
                and_(
                    Statistic.user_id == user_id,
                    Statistic.date >= date_from,
                    Statistic.date <= date_to
                )
            ).order_by(Statistic.date.asc())
            
            result = await self.db.execute(stmt)
            statistics = result.scalars().all()
            
            if not statistics:
                return await self._generate_statistics_from_data(user_id, date_from, date_to)
            
            return [
                {
                    "date": stat.date.strftime("%Y-%m-%d") if hasattr(stat, 'date') else stat.get('date'),
                    "completedPomodoros": stat.tomatoes if hasattr(stat, 'tomatoes') else stat.get('completedPomodoros', 0),
                    "totalFocusTime": stat.total_focus_time if hasattr(stat, 'total_focus_time') else stat.get('totalFocusTime', 0)
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
            daily_stats = {}
            
            current_date = date_from.date()
            end_date = date_to.date()
            
            while current_date <= end_date:
                date_key = current_date.strftime("%Y-%m-%d")
                daily_stats[date_key] = {
                    "completedPomodoros": 0,
                    "totalFocusTime": 0
                }
                current_date += timedelta(days=1)
            
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
            
            for timer in completed_timers:
                date_key = timer.created_at.strftime("%Y-%m-%d")
                if date_key in daily_stats:
                    daily_stats[date_key]["totalFocusTime"] += timer.work_time or 0
            
            for tomato in completed_tomatoes:
                date_key = tomato.start_time.strftime("%Y-%m-%d")
                if date_key in daily_stats:
                    daily_stats[date_key]["completedPomodoros"] += 1
            
            statistics_list = [
                {
                    "date": date_str,
                    "completedPomodoros": stats["completedPomodoros"],
                    "totalFocusTime": stats["totalFocusTime"]
                }
                for date_str, stats in daily_stats.items()
            ]
            
            statistics_list.sort(key=lambda x: x["date"])
            
            return statistics_list

    async def create_daily_statistic(self, user_id: int, date: datetime) -> Statistic:
        """Создание дневной статистики"""
        completed_tomatoes = await self._get_completed_tomatoes_count(user_id, date)
        total_focus_time = await self._get_total_focus_time(user_id, date)
        
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
        target_date = func.date(date)
        stmt = select(func.sum(Timer.work_time)).where(
            and_(
                Timer.user_id == user_id,
                func.date(Timer.created_at.op("AT TIME ZONE")("UTC+0")) == func.date(date),
                Timer.is_completed == True,
                Timer.type == "work"
            )
        )
        result = await self.db.execute(stmt)
        total_time = result.scalar() or 0
        return total_time
    
    async def get_statistics_summary(self, user_id: int) -> Dict:
            """Получение сводной статистики пользователя"""
            try:
                today = datetime.now().date()
                today_minutes = await self._get_focus_time_for_date(user_id, today)
                total_minutes = await self._get_total_focus_time_all(user_id)
                streak = await self._get_current_streak(user_id)
                today_pomodoros = await self._get_tomatoes_for_date(user_id, today)
                total_pomodoros = await self._get_total_tomatoes(user_id)
                
                return {
                    "today_minutes": today_minutes,
                    "total_minutes": total_minutes,
                    "current_streak_days": streak,
                    "today_pomodoros": today_pomodoros,
                    "total_pomodoros": total_pomodoros,
                    "today": today.strftime("%Y-%m-%d")
                }
                
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Ошибка при получении сводной статистики: {str(e)}"
                )
            
    async def _get_focus_time_for_date(self, user_id: int, target_date: date) -> int:
            """Получение минут фокуса за конкретную дату"""
            stmt = select(Statistic).where(
                and_(
                    Statistic.user_id == user_id,
                    func.date(Statistic.date) == target_date
                )
            )
            
            result = await self.db.execute(stmt)
            stat = result.scalar_one_or_none()
            
            if stat and stat.total_focus_time:
                return stat.total_focus_time
            
            start_of_day = datetime.combine(target_date, datetime.min.time())
            end_of_day = datetime.combine(target_date, datetime.max.time())
            
            stmt_timers = select(func.sum(Timer.work_time)).where(
                and_(
                    Timer.user_id == user_id,
                    Timer.created_at >= start_of_day,
                    Timer.created_at <= end_of_day,
                    Timer.is_completed == True,
                    Timer.type == "work"
                )
            )
            
            result_timers = await self.db.execute(stmt_timers)
            time_from_timers = result_timers.scalar() or 0
            
            return time_from_timers
        
    async def _get_total_focus_time_all(self, user_id: int) -> int:
            """Получение общего времени фокуса за все время"""
            stmt_stats = select(func.sum(Statistic.total_focus_time)).where(
                Statistic.user_id == user_id
            )
            
            result_stats = await self.db.execute(stmt_stats)
            total_from_stats = result_stats.scalar() or 0
            
            if total_from_stats > 0:
                return total_from_stats
            
            stmt_timers = select(func.sum(Timer.work_time)).where(
                and_(
                    Timer.user_id == user_id,
                    Timer.is_completed == True,
                    Timer.type == "work"
                )
            )
            
            result_timers = await self.db.execute(stmt_timers)
            total_from_timers = result_timers.scalar() or 0
            
            return total_from_timers
        
    async def _get_current_streak(self, user_id: int) -> int:
        """Получение текущей серии дней с выполнением помидоров"""
        streak = 0
        current_date = datetime.now().date()
        
        for days_ago in range(0, 30): 
            check_date = current_date - timedelta(days=days_ago)
            tomatoes_today = await self._get_tomatoes_for_date(user_id, check_date)
            
            if tomatoes_today > 0:
                streak += 1
            else:
                break
        
        return streak

    async def _get_tomatoes_for_date(self, user_id: int, target_date: date) -> int:
        """Получение количества помидоров за конкретную дату"""
        stmt = select(Statistic).where(
            and_(
                Statistic.user_id == user_id,
                func.date(Statistic.date) == target_date
            )
        )
        
        result = await self.db.execute(stmt)
        stat = result.scalar_one_or_none()
        
        if stat and stat.tomatoes:
            return stat.tomatoes
        
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        
        stmt_tomatoes = select(func.count(Tomato.id)).where(
            and_(
                Tomato.user_id == user_id,
                Tomato.start_time >= start_of_day,
                Tomato.start_time <= end_of_day,
                Tomato.was_successful == True
            )
        )
        
        result_tomatoes = await self.db.execute(stmt_tomatoes)
        return result_tomatoes.scalar() or 0

    async def _get_total_tomatoes(self, user_id: int) -> int:
        """Получение общего количества помидоров"""
        stmt_stats = select(func.sum(Statistic.tomatoes)).where(
            Statistic.user_id == user_id
        )
        
        result_stats = await self.db.execute(stmt_stats)
        total_from_stats = result_stats.scalar() or 0
        
        if total_from_stats > 0:
            return total_from_stats
        
        stmt_tomatoes = select(func.count(Tomato.id)).where(
            and_(
                Tomato.user_id == user_id,
                Tomato.was_successful == True
            )
        )
        
        result_tomatoes = await self.db.execute(stmt_tomatoes)
        return result_tomatoes.scalar() or 0