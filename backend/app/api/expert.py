import uuid
import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import verify_token
from ..core.audit import log_access
from ..models.expert_review import ExpertReview
from ..schemas.expert import (
    ExpertQueueItem,
    ExpertQueueResponse,
    FeedbackRequest,
    FeedbackResponse,
)
from .expert_ws_manager import expert_ws_manager

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/expert", tags=["expert"])


def _require_expert(token: str = Query(...)):
    """counselor 또는 admin 역할만 허용."""
    try:
        payload = verify_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    if payload.role not in ("counselor", "admin"):
        raise HTTPException(status_code=403, detail="전문가 권한이 필요합니다.")
    return payload


# ── REST ──────────────────────────────────────────────────

@router.get("/queue", response_model=ExpertQueueResponse)
async def get_review_queue(
    db: AsyncSession = Depends(get_db),
    token: str = Query(...),
):
    """pending 상태인 전문가 리뷰 대기열 조회."""
    payload = _require_expert(token)
    log_access(
        user_id=payload.sub,
        user_role=payload.role,
        action="view_expert_queue",
        resource_type="expert_review",
    )

    result = await db.execute(
        select(ExpertReview)
        .where(ExpertReview.status == "pending")
        .order_by(ExpertReview.risk_level.desc(), ExpertReview.created_at.asc())
    )
    reviews = result.scalars().all()

    items = [
        ExpertQueueItem(
            id=str(r.id),
            session_id=str(r.session_id),
            user_id=str(r.user_id),
            risk_level=r.risk_level,
            risk_factors=r.risk_factors or [],
            ai_response=r.ai_response,
            context_summary=r.context_summary,
            status=r.status,
            created_at=r.created_at,
        )
        for r in reviews
    ]

    return ExpertQueueResponse(items=items, total=len(items))


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    req: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    token: str = Query(...),
):
    """전문가 피드백 제출 (approve / modify)."""
    payload = _require_expert(token)

    result = await db.execute(
        select(ExpertReview).where(ExpertReview.id == uuid.UUID(req.pending_response_id))
    )
    review = result.scalar_one_or_none()

    if not review:
        raise HTTPException(status_code=404, detail="리뷰 항목을 찾을 수 없습니다.")
    if review.status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 항목입니다.")

    if req.action not in ("approve", "modify"):
        raise HTTPException(status_code=400, detail="action은 'approve' 또는 'modify'이어야 합니다.")
    if req.action == "modify" and not req.modified_content:
        raise HTTPException(status_code=400, detail="action이 'modify'인 경우 modified_content가 필요합니다.")

    now = datetime.now(timezone.utc)
    review.status = req.action if req.action == "approved" else req.action  # "approved"|"modified"
    review.status = "approved" if req.action == "approve" else "modified"
    review.reviewer_id = uuid.UUID(payload.sub)
    review.modified_content = req.modified_content
    review.feedback_category = req.feedback_category
    review.feedback_note = req.feedback_note
    review.reviewed_at = now

    await db.commit()
    await db.refresh(review)

    logger.info(
        "expert_review_submitted",
        review_id=str(review.id),
        action=req.action,
        reviewer=payload.sub,
    )

    return FeedbackResponse(
        id=str(review.id),
        status=review.status,
        reviewed_at=now,
    )


# ── WebSocket ─────────────────────────────────────────────

@router.websocket("/ws/expert")
async def expert_websocket(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    전문가 실시간 모니터링 WebSocket.
    연결 즉시 pending 대기열 개수를 전송하고,
    이후 고위험 세션 발생 시 실시간 알림을 수신한다.
    """
    try:
        payload = verify_token(token)
    except ValueError:
        await websocket.close(code=4001)
        return

    if payload.role not in ("counselor", "admin"):
        await websocket.close(code=4003)
        return

    await expert_ws_manager.connect(payload.sub, websocket)

    try:
        # 연결 직후 현재 pending 개수 전송
        from ..core.database import AsyncSessionFactory
        async with AsyncSessionFactory() as db:
            count_result = await db.execute(
                select(func.count()).select_from(ExpertReview).where(ExpertReview.status == "pending")
            )
            pending_count = count_result.scalar() or 0

        await websocket.send_json({
            "type": "connected",
            "pending_count": pending_count,
        })

        # 클라이언트 메시지 대기 (ping/pong 유지)
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        expert_ws_manager.disconnect(payload.sub)
    except Exception as e:
        logger.error("expert_ws_error", user_id=payload.sub, error=str(e))
        expert_ws_manager.disconnect(payload.sub)
