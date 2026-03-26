"""
감사 로그 헬퍼.

민감 데이터(PHI) 접근 시 audit_logs 테이블에 기록한다.
비동기 non-blocking으로 실행되므로 API 응답 속도에 영향을 주지 않는다.
"""
import uuid
import asyncio
import structlog

logger = structlog.get_logger(__name__)


async def _write_log(
    user_id: str,
    user_role: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
) -> None:
    try:
        from ..core.database import AsyncSessionFactory
        from ..models.audit_log import AuditLog

        async with AsyncSessionFactory() as db:
            entry = AuditLog(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id),
                user_role=user_role,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                detail=detail,
                ip_address=ip_address,
            )
            db.add(entry)
            await db.commit()

        logger.info("audit_log", action=action, resource_type=resource_type, user_id=user_id)

    except Exception as e:
        logger.error("audit_log_error", action=action, error=str(e))


def log_access(
    user_id: str,
    user_role: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
) -> None:
    """
    감사 로그를 비동기 백그라운드 태스크로 기록한다.
    API 핸들러에서 await 없이 호출 가능.
    """
    asyncio.create_task(
        _write_log(
            user_id=user_id,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            detail=detail,
            ip_address=ip_address,
        )
    )
