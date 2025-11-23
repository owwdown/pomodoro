import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.routers import router as auth_router

app = FastAPI(title="Pomodoro Timer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api", tags=["Authentication"])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)