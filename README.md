# MindCare AI

> LangGraph 기반 멀티에이전트 정신건강 상담 시스템

[![CI](https://github.com/your-repo/mindcare-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-repo/mindcare-ai/actions/workflows/ci.yml)

임상 맥락을 이해하는 멀티에이전트 AI 상담 시스템. **LangGraph StateGraph** 기반 에이전트 오케스트레이션, 실시간 위기 개입, Expert-in-the-loop 파이프라인, 3계층 메모리 아키텍처를 갖춘 풀스택 프로토타입입니다.

---

## 핵심 기능

### 멀티에이전트 오케스트레이션
LangGraph `StateGraph`로 구성된 5-노드 파이프라인이 모든 대화를 처리합니다.

```
memory_loader → input_filter → triage → counseling | crisis → output_validator
```

| 에이전트 | 역할 | 활성화 조건 |
|---------|------|-----------|
| **Triage** | 위험도(0-10) 분류 + 치료 접근 결정 | 모든 메시지 |
| **Counseling** | CBT / 지지적 상담 응답 생성 | risk < 7 |
| **Crisis** | 즉각 위기 개입 + 안전 자원 안내 | risk ≥ 7 |

### Safety Guardrail 3계층
- **Layer 1 (입력 필터)**: 프롬프트 인젝션, 범위 이탈 요청 차단
- **Layer 2 (출력 검증)**: 약물 권고·진단 표현 필터링
- **Layer 3 (세션 모니터링)**: 위험도 추이 감시, 에스컬레이션 자동 트리거

### 3계층 메모리 아키텍처

| 레이어 | 저장소 | 역할 |
|-------|-------|------|
| Working Memory | Redis | 현재 세션 슬라이딩 윈도우 (최근 20개) + 위험도 추이 |
| Session Memory | PostgreSQL | 메시지·세션 영속화, SOAP 임상 노트 |
| Long-term Memory | ChromaDB | 세션 요약 벡터 저장 + 의미 유사도 검색 |

재방문 사용자의 첫 메시지에서 과거 세션 요약을 자동으로 불러와 상담 맥락을 유지합니다.

### Expert-in-the-loop
고위험 세션(risk ≥ 6)에서 AI 응답이 자동으로 전문가 대기열에 등록되고, 상담사가 실시간으로 승인·수정할 수 있습니다.

```
AI 응답 생성 → expert_reviews (pending)
              → /ws/expert WebSocket 브로드캐스트
              → 전문가 대시보드에서 승인 / 응답 수정
```

### SOAP 임상 노트 자동 생성
세션 종료 시 LLM이 대화를 분석하여 SOAP 형식(주관적/객관적/평가/계획) 임상 노트를 자동 생성합니다.

---

## 기술 스택

| 영역 | 기술 |
|-----|------|
| 에이전트 오케스트레이션 | LangGraph 0.2 + OpenAI GPT-4o |
| 백엔드 | FastAPI 0.115 (Python 3.12) + WebSocket |
| 관계형 DB | PostgreSQL 16 + SQLAlchemy 2.0 + Alembic |
| 캐시 / Working Memory | Redis 7 |
| 벡터 DB / Long-term Memory | ChromaDB 0.6 |
| 프론트엔드 | React 18 + TypeScript + Tailwind CSS + Zustand |
| 컨테이너 | Docker Compose |
| CI | GitHub Actions |

---

## 빠른 시작

```bash
# 1. 환경 변수 설정
cp .env.example .env
# .env 에서 OPENAI_API_KEY 입력

# 2. 전체 스택 실행 (Backend · PostgreSQL · Redis · ChromaDB)
docker compose up -d

# 3. DB 마이그레이션
docker compose exec backend alembic upgrade head
```

| 서비스 | 주소 |
|-------|------|
| 채팅 UI | http://localhost:3000 |
| API 문서 (Swagger) | http://localhost:8080/docs |
| ChromaDB | http://localhost:8002 |

---

## 프로젝트 구조

```
MindCare/
├── backend/
│   ├── app/
│   │   ├── agents/              # LangGraph 노드
│   │   │   ├── orchestrator.py  # StateGraph 조립
│   │   │   ├── triage_agent.py
│   │   │   ├── counseling_agent.py
│   │   │   └── crisis_agent.py
│   │   ├── memory/
│   │   │   ├── working_memory.py    # Redis
│   │   │   ├── long_term_memory.py  # ChromaDB
│   │   │   ├── session_summarizer.py
│   │   │   └── soap_generator.py    # SOAP 임상 노트
│   │   ├── safety/
│   │   │   └── guardrail.py         # 3계층 Guardrail
│   │   ├── api/
│   │   │   ├── chat.py              # WS /ws/chat/{id}
│   │   │   ├── expert.py            # Expert 대기열 + WS
│   │   │   └── sessions.py
│   │   └── models/                  # SQLAlchemy 모델
│   └── tests/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── ChatPage.tsx         # 사용자 채팅
│       │   └── ExpertDashboard.tsx  # 전문가 대시보드
│       └── hooks/
│           ├── useChat.ts
│           └── useExpertWS.ts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_SPEC.md
│   ├── SAFETY_PROTOCOL.md
│   └── ROADMAP.md
└── docker-compose.yml
```

---

## 데모 시나리오

### 시나리오 1 — 일반 상담
```
사용자: "직장에서 번아웃이 온 것 같아요"
  → Triage: risk 3/10 → Counseling (CBT)
  → 세션 종료: ChromaDB 요약 저장 + SOAP 노트 생성
```

### 시나리오 2 — 위기 개입
```
사용자: "더 이상 살고 싶지 않아요"
  → Triage: risk 8/10 → Crisis Agent 즉시 활성화
  → 안전 계획 안내 + 자살예방상담전화 1393 안내
  → 전문가 대시보드에 실시간 알림
```

### 시나리오 3 — Expert-in-the-loop
```
위기 세션 AI 응답 생성
  → expert_reviews 테이블에 pending 등록
  → 상담사가 /expert 대시보드에서 응답 수정 후 승인
```

### 시나리오 4 — 다회기 컨텍스트 유지
```
2주 후 재방문
  → memory_loader_node: ChromaDB에서 과거 세션 의미 검색
  → "지난번 업무 스트레스 상황은 어떻게 되셨나요?" 자동 참조
```

---

## 문서

| 문서 | 내용 |
|-----|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처, StateGraph, 메모리 구조 |
| [API_SPEC.md](docs/API_SPEC.md) | REST · WebSocket 전체 명세 |
| [SAFETY_PROTOCOL.md](docs/SAFETY_PROTOCOL.md) | 안전 프로토콜, 위기 개입 기준 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 로컬 / AWS 배포 가이드 |
| [ROADMAP.md](docs/ROADMAP.md) | 구현 로드맵 및 Phase별 진행 현황 |

---

> **면책**: 이 시스템은 포트폴리오 프로토타입으로, 실제 임상 환경 적용 시 의료법에 따른 추가 검토가 필요합니다.
> 위기 상황 시 **자살예방상담전화 1393** 또는 **응급의료 119**에 연락하세요.
