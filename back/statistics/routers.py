from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional

from db import get_session
from auth.dependencies import get_current_user
from .service import StatisticsService

router = APIRouter()

@router.get("/statistics")
async def get_statistics(
    date_from: Optional[str] = Query(None, description="Начальная дата (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Конечная дата (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение статистики пользователя"""
    try:
        from_date = None
        to_date = None
        
        if date_from:
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
        if date_to:
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
        
        statistics_service = StatisticsService(db)
        statistics = await statistics_service.get_user_statistics(
            user_id=current_user["user_id"],
            date_from=from_date,
            date_to=to_date
        )
        
        return {
            "statistics": statistics
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail="Неверный формат даты. Используйте YYYY-MM-DD"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )
    
@router.get("/statistics/summary")
async def get_statistics_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение сводной статистики пользователя"""
    try:
        statistics_service = StatisticsService(db)
        summary = await statistics_service.get_statistics_summary(current_user["user_id"])
        
        return {
            "success": True,
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при получении сводной статистики: {str(e)}"
        )