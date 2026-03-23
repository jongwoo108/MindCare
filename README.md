# MindCare AI

> LangGraph 기반 멀티에이전트 정신건강 상담 시스템 프로토타입

임상 맥락을 이해하는 멀티에이전트 AI 상담 시스템. CBT/정신역동 기반 상담 에이전트, 실시간 위기 개입, Expert-in-the-loop 파이프라인을 갖춘 풀스택 프로토타입.

## 핵심 기능

- **멀티에이전트 오케스트레이션** — LangGraph StateGraph 기반 Triage → Counseling → Crisis 에이전트 워크플로우
- **위기 개입 시스템** — 고위험 징후 실시간 탐지 (0-10 위험도 스케일) + 외부 기관 연계
- **Safety Guardrail** — 입력 필터링 / 출력 검증 / 세션 모니터링 3계층 안전장치
- **다층 메모리** — Working Memory (Redis) + Session Memory (PostgreSQL) + Long-term Memory (ChromaDB)
- **Expert-in-the-loop** — 전문가 피드백 → AI 응답 실시간 반영 파이프라인
- **임상 노트 자동 생성** — SOAP 형식 세션 요약
- **데이터 보안** — AES-256 암호화, RBAC, 불변 감사 로그

## 기술 스택

| 영역 | 기술 |
|-----|------|
| 에이전트 오케스트레이션 | LangGraph + OpenAI GPT-4o |
| 백엔드 | FastAPI (Python 3.12) + WebSocket |
| 비동기 | Celery + Redis |
| 데이터베이스 | PostgreSQL 16 + ChromaDB |
| 프론트엔드 | React 18 + TypeScript + Tailwind CSS |
| 인프라 | Docker Compose / AWS ECS Fargate |

## 빠른 시작

```bash
cp .env.example .env
# .env에서 OPENAI_API_KEY 설정

docker compose up -d
docker compose exec backend alembic upgrade head
```

- 채팅 UI: http://localhost:3000
- API 문서: http://localhost:8000/docs

## 문서

| 문서 | 내용 |
|-----|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 아키텍처, 에이전트 설계, 메모리 구조 |
| [API_SPEC.md](docs/API_SPEC.md) | REST API 및 WebSocket 명세 |
| [SAFETY_PROTOCOL.md](docs/SAFETY_PROTOCOL.md) | 안전 프로토콜, 위기 개입, 데이터 보안 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 로컬/AWS 배포 가이드 |
| [ROADMAP.md](docs/ROADMAP.md) | 구현 로드맵 및 데모 시나리오 |

## 프로젝트 구조

```
mindcare-ai/
├── backend/
│   └── app/
│       ├── agents/          # LangGraph 에이전트 (triage, counseling, crisis)
│       ├── memory/          # 메모리 시스템 (working, session, long-term)
│       ├── safety/          # Safety Guardrail 3계층
│       ├── expert/          # Expert-in-the-loop 파이프라인
│       ├── api/             # FastAPI 라우터
│       ├── models/          # SQLAlchemy 모델
│       └── security/        # 암호화, RBAC, 감사 로그
├── frontend/
│   └── src/
│       └── components/      # ChatWindow, ExpertDashboard 등
├── infra/                   # Docker, AWS, K8s 설정
└── docs/                    # 아키텍처 및 운영 문서
```

---

> **면책**: 이 시스템은 포트폴리오 프로토타입으로, 실제 임상 환경 적용 시 의료법에 따른 추가 검토가 필요합니다. 위기 상황 시 **자살예방상담전화 1393** 또는 **119**에 연락하세요.
