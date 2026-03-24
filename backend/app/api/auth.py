import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from ..models.user import User
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")

    user = User(
        id=uuid.uuid4(),
        email=req.email,
        hashed_password=hash_password(req.password),
        name=req.name,
        role=req.role,
    )
    db.add(user)
    await db.flush()
    logger.info("user_registered", user_id=str(user.id))

    return UserResponse(id=str(user.id), email=user.email, name=user.name, role=user.role)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정입니다.")

    from ..config import get_settings
    settings = get_settings()

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id), user.role),
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest):
    try:
        payload = verify_token(req.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 리프레시 토큰입니다.")

    from ..config import get_settings
    settings = get_settings()

    return TokenResponse(
        access_token=create_access_token(payload.sub, payload.role),
        refresh_token=create_refresh_token(payload.sub, payload.role),
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )
