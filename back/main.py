import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.routers import router as auth_router
from statistics.routers import router as statistics_router
from timer.routers import router as timer_router

app = FastAPI(title="Pomodoro Timer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["Authentication"])
app.include_router(statistics_router, prefix="/api", tags=["Statistics"])
app.include_router(timer_router, prefix="/api", tags=["Timer"])


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)