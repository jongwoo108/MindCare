"""
LLM 기반 SOAP 형식 임상 노트 자동 생성기.

SOAP 구조:
  S (Subjective)  — 내담자가 직접 호소한 내용 (주관적 증상, 감정 상태, 주요 발언)
  O (Objective)   — 관찰 가능한 데이터 (위험도 수치, 에이전트 개입 유형, 메시지 수)
  A (Assessment)  — 임상적 평가 (위험 수준 해석, 현재 기능 수준, 치료 반응)
  P (Plan)        — 다음 세션 방향 (치료 목표, 권장 접근법, 후속 주의사항)

세션 종료(WebSocket disconnect) 시 chat.py에서 비동기로 호출된다.
"""
import json
import structlog
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

from ..config import get_settings

logger = structlog.get_logger(__name__)

_SOAP_SYSTEM_PROMPT = """\
당신은 정신건강 임상 기록 전문가입니다.
아래 상담 대화와 메타 정보를 분석하여 **SOAP 형식의 임상 노트**를 JSON으로 작성하세요.

출력 형식 (반드시 이 JSON 구조만 반환):
{
  "subjective": "내담자가 직접 호소한 내용. 주요 증상, 감정 상태, 핵심 발언을 2-4문장으로 기술.",
  "objective": "관찰 가능한 데이터. 위험도 수치, 에이전트 개입 유형, 대화 패턴을 2-3문장으로 기술.",
  "assessment": "임상적 평가. 위험 수준 해석, 치료 반응, 현재 기능 수준을 2-4문장으로 기술.",
  "plan": "다음 세션 방향. 치료 목표, 권장 접근법, 후속 주의사항을 2-4문장으로 기술."
}

작성 지침:
- 모든 섹션을 한국어로 작성하세요.
- 개인 식별 정보(이름, 연락처 등)를 포함하지 마세요.
- 임상적으로 중립적이고 객관적인 언어를 사용하세요.
- 진단명을 단정하지 말고 "~양상을 보임", "~가능성" 등 완화 표현을 사용하세요.
"""


class SOAPResult:
    def __init__(self, subjective: str, objective: str, assessment: str, plan: str):
        self.subjective = subjective
        self.objective = objective
        self.assessment = assessment
        self.plan = plan


class SOAPGenerator:
    def __init__(self) -> None:
        settings = get_settings()
        self._llm = ChatOpenAI(
            model=settings.openai_model_dev,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

    async def generate(
        self,
        messages: list[dict],
        risk_level: int = 0,
        therapeutic_approach: str = "supportive",
        message_count: int = 0,
    ) -> SOAPResult | None:
        """
        messages: [{"role": "user"|"assistant", "content": str}, ...]
        반환값: SOAPResult | None (메시지 부족 또는 에러 시 None)
        """
        if len(messages) < 4:
            return None

        # 대화 기록 텍스트 변환 (최근 30개로 제한하여 토큰 절약)
        recent = messages[-30:]
        lines = []
        for m in recent:
            role = "내담자" if m.get("role") == "user" else "상담사(AI)"
            lines.append(f"[{role}] {m.get('content', '')}")
        transcript = "\n".join(lines)

        meta = (
            f"\n\n[세션 메타 정보]\n"
            f"- 최고 위험도: {risk_level}/10\n"
            f"- 치료 접근 방식: {therapeutic_approach}\n"
            f"- 총 메시지 수: {message_count}"
        )

        try:
            response = await self._llm.ainvoke([
                SystemMessage(content=_SOAP_SYSTEM_PROMPT),
                HumanMessage(content=f"[상담 대화]\n{transcript}{meta}"),
            ])
            data = json.loads(response.content)

            result = SOAPResult(
                subjective=data.get("subjective", ""),
                objective=data.get("objective", ""),
                assessment=data.get("assessment", ""),
                plan=data.get("plan", ""),
            )
            logger.info("soap_generated", risk_level=risk_level, approach=therapeutic_approach)
            return result

        except (json.JSONDecodeError, KeyError) as e:
            logger.error("soap_parse_error", error=str(e))
            return None
        except Exception as e:
            logger.error("soap_generation_error", error=str(e))
            return None
