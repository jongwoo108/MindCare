from fastapi import APIRouter
from .auth import router as auth_router
from .sessions import router as sessions_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(sessions_router)
