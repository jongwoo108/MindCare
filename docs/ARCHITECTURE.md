# MindCare AI — 시스템 아키텍처

## 1. 전체 구조 개요

```
[User Message]
      │
      ▼
┌─────────────────┐
│  Triage Agent   │ ← 위험도 분류 (0-10 스케일)
│  (Risk Scorer)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  LOW/MED    HIGH (≥7)
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│Counsel │ │Crisis Agent  │
│Agent   │ │(Emergency)   │
└────┬───┘ └──────┬───────┘
     │            │
     ▼            ▼
┌────────────────────────────┐
│   Safety Guardrail Layer   │
│   (출력 필터 + 경계 검증)    │
└────────────┬───────────────┘
             │
             ▼
      [AI Response]
```

## 2. 멀티에이전트 오케스트레이션 (LangGraph)

### StateGraph 핵심 상태 스키마

```python
class ConversationState(TypedDict):
    messages: list[BaseMessage]
    risk_level: int                    # 0-10
    risk_factors: list[str]            # 감지된 위험 요인
    therapeutic_approach: str          # "cbt" | "psychodynamic" | "supportive"
    session_context: SessionContext    # 장기 컨텍스트
    clinical_notes: list[ClinicalNote]
    expert_feedback: Optional[ExpertFeedback]
    safety_flags: list[str]
    crisis_escalated: bool
```

### 에이전트별 역할

| 에이전트 | 역할 | 활성화 조건 |
|---------|------|-----------|
| **Triage Agent** | 위험도 분류, 라우팅 결정 | 모든 메시지 |
| **Counseling Agent** | CBT/정신역동/지지적 상담 | risk_level < 7 |
| **Crisis Intervention Agent** | 위기 개입, 안전 프로토콜 | risk_level ≥ 7 |

#### Triage Agent
- 입력 메시지에서 자살/자해/타해 관련 키워드 및 맥락 분석
- PHQ-9, GAD-7 기반 위험도 스코어링 (0-10)
- 이전 세션 컨텍스트를 참조한 변화 추이 감지
- 위험 수준에 따른 라우팅 결정

#### Counseling Agent
- **CBT 기반**: 인지 왜곡 식별, 행동 활성화 제안
- **정신역동적 접근**: 감정 반영, 패턴 탐색, 전이 관리
- **지지적 상담**: 공감적 경청, 감정 명명, 안전한 공간 유지
- 세션 흐름에 따른 동적 접근 방식 전환

#### Crisis Intervention Agent
- 고위험(≥7) 상황 즉시 활성화
- 안전 프로토콜 실행 (안전 계획, 도움 요청 안내)
- 외부 기관 연계 API 시뮬레이션 (119, 자살예방상담전화 1393)
- 에스컬레이션 로그 기록 + 전문가 즉시 알림

## 3. 메모리 아키텍처

```
┌─────────────────────────────────────────┐
│           Memory Architecture           │
├─────────────┬─────────────┬─────────────┤
│ Working     │ Session     │ Long-term   │
│ Memory      │ Memory      │ Memory      │
│ (Redis)     │ (PostgreSQL)│ (Vector DB) │
│             │             │             │
│ • 현재 대화  │ • 세션 요약  │ • 핵심 이슈  │
│ • 감정 상태  │ • 임상 노트  │ • 치료 이력  │
│ • 위험 플래그 │ • 목표/과제  │ • 패턴/인사이트│
└─────────────┴─────────────┴─────────────┘
```

| 레이어 | 저장소 | 내용 | TTL |
|-------|-------|------|-----|
| Working Memory | Redis | 현재 대화 슬라이딩 윈도우, 실시간 감정 상태, 에이전트 체크포인트 | 세션 종료 시 |
| Session Memory | PostgreSQL | 세션 요약, SOAP 형식 임상 노트, 치료 목표/과제 | 영구 |
| Long-term Memory | ChromaDB | 핵심 이슈 임베딩, 치료 이력 패턴, 감정/상태 변화 추이 | 영구 |

## 4. Safety Guardrail 시스템

```python
class SafetyGuardrail:
    # Layer 1: 입력 필터링
    async def filter_input(self, message: str) -> SafetyCheck:
        """유해 콘텐츠, 프롬프트 인젝션, 경계 위반 탐지"""

    # Layer 2: 출력 검증
    async def validate_output(self, response: str, context: ConversationState) -> SafetyCheck:
        """임상적 부적절 응답, 유해 조언, 경계 이탈 검증"""

    # Layer 3: 세션 모니터링
    async def monitor_session(self, state: ConversationState) -> SafetyAlert:
        """위험 수준 급변, 반복적 위기 패턴, 에스컬레이션 임계값 감시"""
```

| 레이어 | 기능 |
|-------|------|
| 입력 필터링 | 프롬프트 인젝션 방어, 부적절 요청 차단 |
| 출력 검증 | 임상적으로 부적절한 조언 차단 (약물 권고, 진단 금지), 경계 유지 |
| 세션 모니터링 | 위험 수준 추이 감시, 에스컬레이션 자동 트리거 |
| 감사 로그 | 모든 안전 이벤트 기록 (불변 로그) |

## 5. Expert-in-the-Loop 파이프라인

```
[AI 응답 생성] → [Safety Check] → [임시 응답]
                                       │
                                  ┌────┴────┐
                                  │         │
                              일반 세션   고위험 세션
                                  │         │
                                  ▼         ▼
                             자동 전송    전문가 대기열
                                         │
                                    전문가 리뷰
                                    │        │
                                 승인      수정
                                    │        │
                                    ▼        ▼
                                  전송    수정 후 전송
                                         │
                                    피드백 → 에이전트 학습
```

- WebSocket 기반 실시간 전문가 대시보드
- 고위험 세션 자동 플래깅 → 전문가 리뷰 대기열
- 전문가 피드백이 에이전트 프롬프트에 실시간 주입
- 피드백 데이터 축적 → 주기적 프롬프트 최적화

## 6. 기술 스택

| 영역 | 기술 |
|-----|------|
| LLM | OpenAI GPT-4o (gpt-4o-2024-08-06) |
| 에이전트 오케스트레이션 | LangGraph (StateGraph 기반) |
| 백엔드 프레임워크 | FastAPI (Python 3.12) |
| 실시간 통신 | WebSocket (FastAPI WebSocket) |
| 비동기 태스크 | Celery + Redis |
| 관계형 DB | PostgreSQL 16 |
| 캐시/상태 | Redis 7 |
| 벡터 DB | ChromaDB |
| ORM | SQLAlchemy 2.0 + Alembic |
| 프론트엔드 | React 18 + TypeScript + Tailwind CSS |
| 상태 관리 | Zustand |
| 컨테이너 | Docker + Docker Compose |
| 클라우드 | AWS ECS Fargate |
| CI/CD | GitHub Actions |
| 모니터링 | structlog + Prometheus |
