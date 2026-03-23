import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import verify_token, TokenPayload
from ..models.session import Session
from ..schemas.session import SessionResponse, SessionListResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/sessions", tags=["sessions"])
bearer = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> TokenPayload:
    try:
        return verify_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    session = Session(
        id=uuid.uuid4(),
        user_id=uuid.UUID(current_user.sub),
        status="active",
    )
    db.add(session)
    await db.flush()
    return SessionResponse.model_validate(session)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    offset = (page - 1) * limit
    user_id = uuid.UUID(current_user.sub)

    total_result = await db.execute(
        select(func.count()).select_from(Session).where(Session.user_id == user_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Session)
        .where(Session.user_id == user_id)
        .order_by(Session.last_activity_at.desc())
        .offset(offset)
        .limit(limit)
    )
    sessions = result.scalars().all()

    return SessionListResponse(
        items=[SessionResponse.model_validate(s) for s in sessions],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    result = await db.execute(
        select(Session).where(
            Session.id == uuid.UUID(session_id),
            Session.user_id == uuid.UUID(current_user.sub),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    return SessionResponse.model_validate(session)
