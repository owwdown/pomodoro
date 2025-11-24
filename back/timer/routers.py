from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from db import get_session
from auth.dependencies import get_current_user
from timer.service import TimerService

router = APIRouter()

class StartTimerRequest(BaseModel):
    type: Optional[str] = None

@router.get("/timer/current")
async def get_current_timer(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    timer_service = TimerService(db)
    timer = await timer_service.get_current_timer(current_user["user_id"])
    
    if not timer:
        return {"message": "Нет активного таймера"}
    
    return timer

@router.get("/timer/sequence-info")
async def get_timer_sequence_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    timer_service = TimerService(db)
    info = await timer_service.get_timer_sequence_info(current_user["user_id"])
    return info

@router.post("/timer/complete")
async def complete_timer(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    timer_service = TimerService(db)
    result = await timer_service.complete_timer(current_user["user_id"])
    return result