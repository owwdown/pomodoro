from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, Literal

from db import get_session
from auth.dependencies import get_current_user
from timer.service import TimerService, SettingsService, TimerSettingsUpdate

router = APIRouter()

class StartTimerRequest(BaseModel):
    type: Optional[Literal["work", "short_break", "long_break"]] = Field(
        None,
        description="Тип таймера. Если не указан, определяется автоматически"
    )

class ResetCounterRequest(BaseModel):
    confirm: bool = Field(
        True,
        description="Подтверждение сброса счетчика"
    )

@router.get("/timer/current", summary="Получить текущий активный таймер")
async def get_current_timer(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение текущего активного таймера пользователя"""
    timer_service = TimerService(db)
    timer = await timer_service.get_current_timer(current_user["user_id"])
    
    if not timer:
        return {"message": "Нет активного таймера"}
    
    return timer

@router.post("/timer/start", summary="Запустить новый таймер")
async def start_timer(
    request: StartTimerRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Запуск нового таймера"""
    timer_service = TimerService(db)
    result = await timer_service.start_timer(current_user["user_id"], request.type)
    return result

@router.post("/timer/stop", summary="Остановить активный таймер")
async def stop_timer(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Остановка активного таймера (прерывание)"""
    timer_service = TimerService(db)
    result = await timer_service.stop_timer(current_user["user_id"])
    return result


@router.get("/settings", summary="Получить текущие настройки таймера")
async def get_timer_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение текущих настроек таймера"""
    settings_service = SettingsService(db)
    settings = await settings_service.get_timer_settings(current_user["user_id"])
    return settings

@router.get("/settings/defaults", summary="Получить дефолтные настройки")
async def get_default_timer_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение дефолтных настроек для новых таймеров"""
    settings_service = SettingsService(db)
    settings = await settings_service.get_user_default_settings(current_user["user_id"])
    return settings

@router.put("/settings", summary="Обновить настройки таймера")
async def update_timer_settings(
    settings_update: TimerSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Обновление настроек таймера"""
    settings_service = SettingsService(db)
    result = await settings_service.update_timer_settings(
        user_id=current_user["user_id"],
        settings_update=settings_update
    )
    return result

@router.post("/timer/complete", summary="Завершить активный таймер")
async def complete_timer(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Завершение активного таймера (естественное завершение)"""
    timer_service = TimerService(db)
    result = await timer_service.complete_timer(current_user["user_id"])
    return result

@router.get("/timer/sequence-info", summary="Получить информацию о последовательности таймеров")
async def get_sequence_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Получение информации о текущей последовательности таймеров"""
    timer_service = TimerService(db)
    result = await timer_service.get_timer_sequence_info(current_user["user_id"])
    return result

class ResetCounterRequest(BaseModel):
    confirm: bool = Field(
        True,
        description="Подтверждение сброса счетчика"
    )

@router.post("/timer/reset-counter", summary="Сбросить счетчик помидоров")
async def reset_counter(
    request: ResetCounterRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Сброс счетчика помидоров"""
    timer_service = TimerService(db)
    result = await timer_service.reset_pomodoro_counter(current_user["user_id"])
    return result