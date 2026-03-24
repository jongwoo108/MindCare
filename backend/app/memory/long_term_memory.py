"""
ChromaDB 기반 장기 메모리 (Long-term Memory).

저장 단위: 세션 요약 (1 세션 = 1 Document)
컬렉션: "session_memories"

메타데이터 스키마:
  user_id            : str   — 사용자 식별자 (where 필터에 사용)
  session_id         : str   — 세션 식별자
  risk_level         : int   — 해당 세션의 최고 위험도
  therapeutic_approach: str  — 사용된 치료 접근 방식
  message_count      : int   — 세션 내 메시지 수
  created_at         : str   — ISO 8601 타임스탬프

검색 방식: 현재 사용자 메시지를 쿼리로 의미 유사도 검색 (same user_id 필터)
"""
import structlog
from datetime import datetime, timezone
from typing import Any

logger = structlog.get_logger(__name__)

_COLLECTION_NAME = "session_memories"
_N_RESULTS = 3  # 한 번에 가져올 과거 세션 수


class LongTermMemory:
    def __init__(self, client: Any) -> None:
        self._client = client
        self._collection = None

    async def _get_collection(self):
        if self._collection is None:
            self._collection = await self._client.get_or_create_collection(
                name=_COLLECTION_NAME,
            )
        return self._collection

    # ── 저장 ──────────────────────────────────────────

    async def store_session_summary(
        self,
        user_id: str,
        session_id: str,
        summary: str,
        risk_level: int = 0,
        therapeutic_approach: str = "supportive",
        message_count: int = 0,
    ) -> None:
        """세션 요약을 ChromaDB에 upsert한다."""
        if not summary.strip():
            return

        col = await self._get_collection()
        await col.upsert(
            ids=[session_id],
            documents=[summary],
            metadatas=[{
                "user_id": user_id,
                "session_id": session_id,
                "risk_level": risk_level,
                "therapeutic_approach": therapeutic_approach,
                "message_count": message_count,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }],
        )
        logger.info(
            "ltm_stored",
            user_id=user_id,
            session_id=session_id,
            risk_level=risk_level,
        )

    # ── 검색 ──────────────────────────────────────────

    async def retrieve_context(self, user_id: str, query: str) -> str:
        """
        현재 메시지(query)와 의미적으로 유사한 과거 세션 요약을 검색한다.
        반환값: 에이전트 system prompt에 직접 삽입할 수 있는 텍스트.
        결과가 없으면 빈 문자열 반환.
        """
        col = await self._get_collection()

        try:
            results = await col.query(
                query_texts=[query],
                n_results=_N_RESULTS,
                where={"user_id": user_id},
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            # 데이터 없을 때 chromadb는 예외 던질 수 있음
            logger.debug("ltm_query_empty", user_id=user_id, error=str(e))
            return ""

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        if not documents:
            return ""

        # 거리 임계값 필터 (cosine distance > 1.5는 너무 관련 없음)
        lines = ["[이전 상담 기록 요약]"]
        for doc, meta, dist in zip(documents, metadatas, distances):
            if dist > 1.5:
                continue
            date_str = meta.get("created_at", "")[:10]  # YYYY-MM-DD
            approach = meta.get("therapeutic_approach", "")
            risk = meta.get("risk_level", 0)
            lines.append(f"• ({date_str} / 위험도 {risk} / {approach})\n  {doc}")

        if len(lines) == 1:
            return ""

        return "\n".join(lines)
