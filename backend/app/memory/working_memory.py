import json
import structlog
import redis.asyncio as aioredis

logger = structlog.get_logger(__name__)

_SESSION_TTL = 86400  # 24시간
_MESSAGE_WINDOW = 20  # 슬라이딩 윈도우 크기
_RISK_WINDOW = 10     # 위험도 추이 보존 개수


class WorkingMemory:
    """
    Redis 기반 Working Memory.

    키 네이밍:
      session:{session_id}:state    → ConversationState 직렬화 (JSON)
      session:{session_id}:messages → 최근 N개 메시지 (Redis List)
      session:{session_id}:risk     → 위험도 추이 (Redis List)
    """

    def __init__(self, redis: aioredis.Redis) -> None:
        self.redis = redis

    # ── State ─────────────────────────────

    async def save_state(self, session_id: str, state: dict) -> None:
        key = f"session:{session_id}:state"
        await self.redis.set(key, json.dumps(state, default=str), ex=_SESSION_TTL)

    async def load_state(self, session_id: str) -> dict | None:
        key = f"session:{session_id}:state"
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    # ── Messages ──────────────────────────

    async def append_message(self, session_id: str, message: dict) -> None:
        """메시지를 리스트 앞에 추가하고 윈도우를 초과하는 오래된 항목을 제거한다."""
        key = f"session:{session_id}:messages"
        await self.redis.lpush(key, json.dumps(message, default=str))
        await self.redis.ltrim(key, 0, _MESSAGE_WINDOW - 1)
        await self.redis.expire(key, _SESSION_TTL)

    async def get_messages(self, session_id: str) -> list[dict]:
        """시간 오름차순(오래된 것 먼저)으로 메시지를 반환한다."""
        key = f"session:{session_id}:messages"
        items = await self.redis.lrange(key, 0, -1)
        # lpush로 저장했으므로 reversed로 시간순 정렬
        return [json.loads(i) for i in reversed(items)]

    # ── Risk Tracking ─────────────────────

    async def track_risk(self, session_id: str, risk_level: int) -> None:
        """최근 위험도를 기록한다. 최근 N개만 유지."""
        key = f"session:{session_id}:risk"
        await self.redis.lpush(key, str(risk_level))
        await self.redis.ltrim(key, 0, _RISK_WINDOW - 1)
        await self.redis.expire(key, _SESSION_TTL)

    async def get_risk_history(self, session_id: str) -> list[int]:
        """최근 위험도 추이를 시간 오름차순으로 반환한다."""
        key = f"session:{session_id}:risk"
        items = await self.redis.lrange(key, 0, -1)
        return [int(i) for i in reversed(items)]

    # ── Cleanup ───────────────────────────

    async def clear_session(self, session_id: str) -> None:
        keys = [
            f"session:{session_id}:state",
            f"session:{session_id}:messages",
            f"session:{session_id}:risk",
        ]
        await self.redis.delete(*keys)
        logger.info("session_cleared", session_id=session_id)
