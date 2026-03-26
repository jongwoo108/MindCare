# MindCare AI — 시스템 아키텍처

## 1. 전체 구조 개요

```
[User Message] ──WebSocket──► FastAPI Backend
                                    │
                              LangGraph StateGraph
                                    │
                        ┌───────────▼────────────┐
                        │    memory_loader_node   │ ← ChromaDB 이전 세션 검색
                        └───────────┬────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │    input_filter_node    │ ← Safety Layer 1 (입력 필터)
                        └───────────┬────────────┘
                                    │ blocked → END
                        ┌───────────▼────────────┐
                        │      triage_node        │ ← 위험도 분류 (0-10)
                        └──────┬─────────┬────────┘
                               │         │
                           risk < 7   risk ≥ 7
                               │         │
                   ┌───────────▼─┐    ┌──▼──────────────┐
                   │  counseling │    │   crisis_node    │
                   │    _node    │    │ (위기 개입)        │
                   └───────┬─────┘    └──────┬───────────┘
                           │                 │
                        ┌──▼─────────────────▼──┐
                        │   output_validator    │ ← Safety Layer 2 (출력 검증)
                        └──────────┬────────────┘
                                   │
                            [AI Response]
                                   │
                    risk ≥ 6? ─────┤
                       │           │
                    expert_reviews  │
                    (pending)      │
                       │           │
                    WS broadcast   │
                    → /ws/expert   │
                                   ▼
                              [WebSocket → User]
```

## 2. LangGraph StateGraph

### ConversationState 스키마

```python
class ConversationState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]  # append-only
    risk_level: int                  # 0-10 (SAFETY_PROTOCOL.md 기준)
    risk_factors: list[str]          # 감지된 위험 요인
    therapeutic_approach: str        # "cbt" | "supportive" | "crisis"
    active_agent: str                # "triage" | "counseling" | "crisis"
    session_context: SessionContext  # session_id, user_id, message_count
    safety_flags: list[str]
    crisis_escalated: bool
    input_blocked: bool
    final_response: Optional[str]
    long_term_context: Optional[str] # ChromaDB 검색 결과 (이전 세션 요약)
```

### 노드별 역할

| 노드 | 역할 | 활성화 조건 |
|------|------|-----------|
| `memory_loader_node` | ChromaDB에서 의미 유사 과거 세션 검색 → `long_term_context` 설정 | 모든 메시지 (첫 번째 노드) |
| `input_filter_node` | 입력 안전성 검사, 프롬프트 인젝션 차단 | 모든 메시지 |
| `triage_node` | 위험도(0-10) + 치료 접근 방식 결정 | 필터 통과 시 |
| `counseling_node` | CBT/지지적 상담 응답 생성, long_term_context 주입 | risk_level < 7 |
| `crisis_node` | 즉각 위기 개입 응답 + 안전 자원 안내 | risk_level ≥ 7 |
| `output_validator_node` | 출력 안전성 검증, 임상적 부적절 표현 필터 | 모든 응답 |

## 3. 메모리 3계층 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   Memory Architecture                    │
├──────────────────┬──────────────────┬───────────────────┤
│  Working Memory  │  Session Memory  │  Long-term Memory │
│    (Redis)       │  (PostgreSQL)    │   (ChromaDB)      │
│                  │                  │                   │
│ • 현재 대화       │ • 메시지 영속화   │ • 세션 요약 벡터   │
│   슬라이딩 윈도우  │ • 세션 메타데이터 │ • 의미 유사도 검색 │
│   (최근 20개)     │ • expert_reviews │ • user_id 필터링  │
│ • 위험도 추이     │                  │                   │
│   (최근 10개)     │                  │                   │
│ TTL: 24시간      │ TTL: 영구         │ TTL: 영구          │
└──────────────────┴──────────────────┴───────────────────┘
```

### 장기 메모리 흐름

```
세션 종료 (WebSocket disconnect) 또는 10쌍 메시지 도달
  → SessionSummarizer.summarize() — LLM이 3-5문장 임상 요약 생성
  → LongTermMemory.store_session_summary() — ChromaDB upsert
      metadata: { user_id, session_id, risk_level, therapeutic_approach }

새 세션 첫 메시지
  → memory_loader_node: ChromaDB.query(current_message, where={user_id})
  → cosine 유사도 top-3 검색 (distance ≤ 1.5 필터)
  → 결과를 long_term_context로 state에 저장
  → counseling/crisis 에이전트 system prompt 앞에 주입
```

## 4. Safety Guardrail 시스템

| 레이어 | 구현 위치 | 기능 |
|-------|----------|------|
| Layer 1: 입력 필터 | `input_filter_node` | 프롬프트 인젝션 방어, 부적절 요청 차단 → `input_blocked=True` |
| Layer 2: 출력 검증 | `output_validator_node` | 임상적 부적절 조언 차단 (약물 권고, 진단 금지), 경계 유지 |
| Layer 3: 세션 모니터링 | `triage_node` + `previous_risk_levels` | 위험 수준 추이 감시, 에스컬레이션 자동 트리거 |

## 5. Expert-in-the-Loop 파이프라인

```
[AI 응답 생성] → [output_validator]
                        │
                   risk_level?
                   │         │
                < 6         ≥ 6
                   │         │
              자동 전송   expert_reviews (pending 생성)
                             │
                        WS broadcast
                        → /ws/expert
                             │
                        전문가 대시보드
                        (/expert 페이지)
                        │           │
                     approve      modify
                        │           │
                   status=approved  status=modified
                   reviewed_at,     modified_content,
                   reviewer_id      feedback_category
```

### 전문가 WebSocket (`/ws/expert`)

- `ExpertConnectionManager`: 연결된 counselor/admin 전원에게 브로드캐스트
- 연결 즉시: `{"type": "connected", "pending_count": N}` 전송
- 고위험 발생 시: `{"type": "high_risk_alert", "review_id": ..., "risk_level": ..., ...}`
- 클라이언트 → 서버: ping/pong 유지

### API 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|-------|------|------|------|
| `GET` | `/api/v1/expert/queue?token=` | pending 리뷰 목록 (위험도 내림차순) | counselor/admin |
| `POST` | `/api/v1/expert/feedback?token=` | approve / modify 결정 제출 | counselor/admin |
| `WS` | `/ws/expert?token=` | 실시간 알림 수신 | counselor/admin |
| `WS` | `/ws/chat/{session_id}?token=` | 사용자 채팅 | user |

## 6. 데이터베이스 스키마

```
users
  id (UUID PK) | email | hashed_password | name
  role (user/counselor/admin/doctor) | is_active
  created_at | updated_at

sessions
  id (UUID PK) | user_id (FK) | status (active/completed/crisis)
  therapeutic_approach | risk_level | message_count | last_activity_at
  created_at | updated_at

messages                                  ← Fernet 암호화
  id (UUID PK) | session_id (FK) | role (user/assistant/system)
  content [ENCRYPTED] | agent_type | risk_level | metadata_json
  created_at | updated_at

clinical_notes                            ← Fernet 암호화
  id (UUID PK) | session_id (FK) | user_id (FK)
  subjective [ENCRYPTED] | objective [ENCRYPTED]
  assessment [ENCRYPTED] | plan [ENCRYPTED]
  risk_level | therapeutic_approach | message_count
  created_at | updated_at

assessment_results
  id (UUID PK) | session_id (FK) | user_id (FK)
  phq_score | gad_score | suicide_flag | initial_risk_level
  chief_complaint | created_at | updated_at

expert_reviews
  id (UUID PK) | session_id (FK) | user_id (FK)
  ai_response | risk_level | risk_factors (JSON) | context_summary
  status (pending/approved/modified)
  reviewer_id | modified_content | feedback_category | feedback_note
  reviewed_at | created_at | updated_at

doctor_profiles
  id (UUID PK) | user_id (FK) | license_number | hospital | department
  specialties (JSON) | bio | max_patients
  is_verified | is_accepting
  created_at | updated_at

patient_cases
  id (UUID PK) | session_id (FK) | user_id (FK)
  summary | keywords (JSON) | risk_label | risk_level
  recommended_specialties (JSON) | is_matched | is_visible
  created_at | updated_at

doctor_patient_matches
  id (UUID PK) | doctor_id (FK → doctor_profiles) | patient_case_id (FK)
  user_id (FK) | status (pending/accepted/rejected/cancelled)
  doctor_message | patient_message
  created_at | updated_at

audit_logs                                ← PHI 접근 감사 기록
  id (UUID PK) | user_id | user_role
  action | resource_type | resource_id | detail
  ip_address | created_at
```

## 7. 기술 스택

| 영역 | 기술 | 버전 |
|-----|------|------|
| LLM | OpenAI GPT-4o | gpt-4o-2024-08-06 |
| 에이전트 오케스트레이션 | LangGraph (StateGraph) | 0.2.60 |
| 백엔드 프레임워크 | FastAPI | 0.115.6 |
| 실시간 통신 | WebSocket (FastAPI) | — |
| 관계형 DB | PostgreSQL | 16 |
| 캐시/Working Memory | Redis | 7 |
| 벡터 DB / Long-term Memory | ChromaDB | 0.6.3 |
| ORM | SQLAlchemy 2.0 + Alembic | — |
| 프론트엔드 | React 18 + TypeScript + Tailwind CSS | — |
| 상태 관리 | Zustand | — |
| 컨테이너 | Docker + Docker Compose | — |
| 클라우드 (예정) | AWS ECS Fargate | — |
| CI/CD | GitHub Actions | ✅ 완료 |
| 구조화 로깅 | structlog | 24.4.0 |

## 8. 프론트엔드 아키텍처

### 8-1. Scene 레이어 시스템

`SceneBackground` 컴포넌트는 6개 레이어로 구성됩니다.

```
┌──────────────────────────────────────────────────────┐
│  Layer 6: 비네팅 (radial-gradient 주변부 어둠)          │
│  Layer 5: 하단 페이드 (linear-gradient, 하단 18%)       │
│  Layer 4: 수면 shimmer (animate-water-shimmer × 5)    │
│  Layer 3: StarField (별 반짝임, 시간대별 밀도)           │
│  Layer 2: 색조 오버레이 (tint, 3s transition)           │
│  Layer 1: 배경 이미지 (crossfade, 3s ease)             │
└──────────────────────────────────────────────────────┘
```

**`useTimeOfDay` 훅**

```ts
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
// 시각 기준: 06-12 / 12-17 / 17-21 / 21-06
// 60_000ms 간격으로 폴링 → period 변경 시 SceneBackground 자동 반응
```

### 8-2. UI 테마 시스템 (`sceneTheme.ts`)

`SceneTheme` 인터페이스는 21개 Tailwind CSS 클래스 토큰으로 구성됩니다.

| 토큰 그룹 | 토큰 |
|----------|------|
| 공통 크롬 | `chrome`, `sub` |
| 채팅 버블 | `userBubble`, `aiBubble`, `userName`, `aiName`, `timestamp` |
| 입력 영역 | `input`, `sendBtn` |
| 퀵 리플라이 | `chip` |
| 모달 | `modalBackdrop`, `modalPanel`, `modalTitle`, `modalBody`, `modalOption`, `modalOptionSel`, `modalTextarea`, `modalProgressBg`, `modalProgressFill`, `modalPrimaryBtn` |

`ChatPage`에서 `getTheme(period)`를 호출하여 모든 자식 컴포넌트에 전달합니다.

```tsx
const { period } = useTimeOfDay()
const theme = getTheme(period)
// → AssessmentModal, FollowUpModal, ChatMessage 모두 theme prop 수신
```

### 8-3. 초기 평가 흐름

```
ChatPage mount
  → sessionsApi.create() → sessionId 확보
  → AssessmentModal 표시 (z-50 모달)
      → 9문항 (PHQ / GAD / Safety) 순차 응답
      → complaint 자유 입력 (선택)
      → assessmentApi.submit() → 서버 저장
  → assessmentApi.greeting() → GreetingResponse
      { content, quick_replies: string[], follow_ups: FollowUpRecommendation[] }
  → 인사 메시지 + 퀵 리플라이 칩 표시
  → followUpQueue 큐 구성
      → FollowUpInviteCard (채팅 흐름 내 인라인 카드)
          → "시작하기" → FollowUpModal (심화 검사)
          → "건너뛸게요" → 다음 항목으로 이동
      → 큐 소진 → MatchNotification 표시
```

---

## 9. 보안 아키텍처

### 9-1. 데이터 암호화 (At-rest)

```
core/encryption.py — EncryptedText (SQLAlchemy TypeDecorator)
  ┌─────────────────────────────────────────────────────┐
  │  저장 (process_bind_param)                           │
  │    plaintext → Fernet.encrypt() → ciphertext (DB)   │
  │                                                     │
  │  조회 (process_result_value)                         │
  │    ciphertext (DB) → Fernet.decrypt() → plaintext   │
  └─────────────────────────────────────────────────────┘

암호화 적용 컬럼:
  - messages.content              (상담 대화 내용)
  - clinical_notes.subjective     (SOAP — 주관적)
  - clinical_notes.objective      (SOAP — 객관적)
  - clinical_notes.assessment     (SOAP — 임상 평가)
  - clinical_notes.plan           (SOAP — 계획)

키 관리:
  - ENCRYPTION_KEY 환경변수 (Fernet 32-byte base64 키)
  - 키 분실 시 기존 데이터 복호화 불가
```

### 9-2. 감사 로그 (Audit Log)

PHI(Protected Health Information) 접근 시마다 `audit_logs` 테이블에 기록됩니다.

| 엔드포인트 | action | resource_type |
|-----------|--------|---------------|
| `GET /sessions/{id}/clinical-notes` | `view_clinical_notes` | `clinical_note` |
| `GET /doctors/matches/{id}/report` | `view_psychiatric_report` | `psychiatric_report` |
| `GET /expert/queue` | `view_expert_queue` | `expert_review` |

```python
# 사용법 — API 핸들러에서 await 없이 호출 (비동기 백그라운드)
log_access(
    user_id=current_user.sub,
    user_role=current_user.role,
    action="view_psychiatric_report",
    resource_type="psychiatric_report",
    resource_id=match_id,
)
```

### 9-3. 인증 & 권한

```
JWT (HS256) — 만료: 60분
  role 클레임 기반 접근 제어:
    user      → /ws/chat, /sessions, /users/me/*
    doctor    → /doctors/* (케이스 게시판, 매칭, 리포트)
    counselor → /expert/* (리뷰 큐, 피드백)
    admin     → 모든 엔드포인트
```
