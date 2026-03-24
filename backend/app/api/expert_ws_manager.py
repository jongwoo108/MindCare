"""
전문가 WebSocket 연결 관리자.

연결된 모든 counselor/admin에게 고위험 알림을 브로드캐스트한다.
앱 수명 동안 싱글톤으로 사용한다.
"""
import structlog
from fastapi import WebSocket

logger = structlog.get_logger(__name__)


class ExpertConnectionManager:
    def __init__(self):
        # user_id → WebSocket 매핑 (전문가당 1 연결)
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[user_id] = ws
        logger.info("expert_ws_connected", user_id=user_id, total=len(self._connections))

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)
        logger.info("expert_ws_disconnected", user_id=user_id, total=len(self._connections))

    async def broadcast_high_risk(self, payload: dict) -> None:
        """연결된 모든 전문가에게 고위험 알림을 전송한다."""
        if not self._connections:
            return

        disconnected = []
        for uid, ws in self._connections.items():
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.append(uid)

        for uid in disconnected:
            self.disconnect(uid)

        logger.info(
            "expert_alert_broadcast",
            recipients=len(self._connections),
            session_id=payload.get("session_id"),
        )


# 앱 전체 싱글톤
expert_ws_manager = ExpertConnectionManager()
