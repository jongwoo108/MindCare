"""
LLM 기반 세션 요약 생성기.

세션이 끝나거나 충분한 메시지가 쌓였을 때 호출하여
ChromaDB에 저장할 간결한 요약을 생성한다.

요약 포함 내용:
  - 주요 호소 문제 (Presenting Issue)
  - 감정 상태
  - 위험도 수준
  - 사용된 치료 접근 방식
  - 다음 세션을 위한 핵심 참고 사항
"""
import structlog
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

from ..config import get_settings

logger = structlog.get_logger(__name__)

_SUMMARIZER_PROMPT = """\
당신은 정신건강 상담 기록을 정리하는 전문 임상 보조 AI입니다.
아래 대화 내용을 바탕으로 **다음 상담 세션에서 치료사(AI)가 참고할 수 있는 간결한 요약**을 작성하세요.

요약 형식 (3-5문장):
1. 주요 호소 문제와 감정 상태
2. 세션에서 다룬 핵심 주제
3. 위험 요인 (해당 시)
4. 치료적 개입 방향 및 진전
5. 다음 세션을 위한 참고 사항

주의:
- 개인 식별 정보를 최소화하세요.
- 임상적으로 중요한 내용을 우선시하세요.
- 한국어로 작성하세요.
"""


class SessionSummarizer:
    def __init__(self) -> None:
        settings = get_settings()
        # 요약은 비용보다 품질 우선 → 프로덕션 모델 고정
        self._llm = ChatOpenAI(model=settings.openai_model_dev, temperature=0)

    async def summarize(
        self,
        messages: list[dict],
        risk_level: int = 0,
        therapeutic_approach: str = "supportive",
    ) -> str:
        """
        messages: [{"role": "user"|"assistant", "content": str}, ...]
        반환값: 요약 텍스트 (실패 시 빈 문자열)
        """
        if len(messages) < 4:
            # 메시지가 너무 적으면 요약 생략
            return ""

        # 대화를 하나의 텍스트 블록으로 변환
        transcript_lines = []
        for m in messages:
            role = "사용자" if m.get("role") == "user" else "상담사"
            transcript_lines.append(f"{role}: {m.get('content', '')}")
        transcript = "\n".join(transcript_lines)

        context_note = (
            f"\n\n[메타 정보]\n"
            f"- 최고 위험도: {risk_level}/10\n"
            f"- 치료 접근: {therapeutic_approach}"
        )

        try:
            response = await self._llm.ainvoke([
                SystemMessage(content=_SUMMARIZER_PROMPT),
                HumanMessage(content=f"[대화 기록]\n{transcript}{context_note}"),
            ])
            summary = response.content.strip()
            logger.info("session_summarized", chars=len(summary), risk_level=risk_level)
            return summary

        except Exception as e:
            logger.error("summarize_error", error=str(e))
            return ""
