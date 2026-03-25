from fastapi import APIRouter
from .auth import router as auth_router
from .sessions import router as sessions_router
from .expert import router as expert_router
from .assessment import router as assessment_router
from .doctor import router as doctor_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(sessions_router)
api_router.include_router(assessment_router)
api_router.include_router(expert_router)
api_router.include_router(doctor_router)
