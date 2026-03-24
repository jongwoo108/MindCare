# MindCare AI — 구현 로드맵

## Phase 1: 핵심 에이전트 파이프라인 (Week 1-2) ✅ 완료

**목표**: LangGraph 멀티에이전트 오케스트레이션이 동작하는 최소 백엔드

### 태스크

- [x] LangGraph StateGraph 정의 (`orchestrator.py`)
- [x] Triage Agent — 위험도 분류 로직 (키워드 + GPT-4o 판단)
- [x] Counseling Agent — CBT 기반 기본 상담 응답
- [x] Crisis Agent — 고위험 탐지 시 에스컬레이션 흐름
- [x] 메모리 시스템 기초 (Working Memory with Redis)
- [x] FastAPI 엔드포인트 (REST + WebSocket)
- [ ] 기본 테스트 케이스 (정상 대화, 위기 상황, 경계 케이스)

**산출물**: WebSocket `/ws/chat/{session_id}` → 에이전트가 위험도 판단 후 적절한 응답 반환 ✅

---

## Phase 2: 안전성 & 메모리 고도화 (Week 3-4) 🔄 진행 중

**목표**: 임상적 신뢰성을 갖춘 안전장치 + 다층 메모리

### 태스크

- [x] Safety Guardrail 3계층 구현 (입력 필터 / 출력 검증 / 세션 모니터링)
- [x] 세션 메모리 (PostgreSQL) + 메시지 영속화
- [x] 세션 자동 요약 (`session_summarizer.py` — LLM 기반 3-5문장 요약)
- [x] 장기 메모리 (ChromaDB) + 의미 유사도 컨텍스트 검색
- [x] 임상 노트 자동 생성 (SOAP 형식)
- [ ] 감사 로그 시스템
- [ ] 데이터 암호화 (AES-256 저장, TLS 전송)

**산출물**: 다회기 대화에서 맥락을 유지하며 안전하게 응답 ✅ (시나리오 4 동작)

---

## Phase 3: Expert-in-the-loop + 프론트엔드 (Week 5-6) 🔄 진행 중

**목표**: 전문가 피드백 루프 + 사용자/전문가 UI

### 태스크

- [x] 전문가 리뷰 대기열 시스템 (`expert_reviews` 테이블 + REST API)
- [ ] 피드백 → 에이전트 프롬프트 실시간 반영
- [x] React 채팅 UI (사용자용) — 로그인/회원가입/WebSocket 채팅
- [x] 전문가 대시보드 UI — 대기열 조회 + 승인/수정 인터페이스
- [x] 위험도 시각 표시 (RiskBadge 컴포넌트 — 채팅 UI + 전문가 대시보드)
- [x] 전문가 실시간 알림 (`/ws/expert` WebSocket)

**산출물**: 사용자 채팅 + 전문가 모니터링이 동시에 동작하는 UI ✅ (시나리오 3 동작)

---

## Phase 4: 인프라 & 폴리싱 (Week 7-8)

**목표**: 배포 가능한 프로토타입 + 문서화

### 태스크

- [x] Docker Compose 풀 스택 구성 (Backend / PostgreSQL / Redis / ChromaDB)
- [ ] AWS ECS 배포 구성 (또는 로컬 K8s)
- [ ] CI/CD 파이프라인 (GitHub Actions)
- [x] API 문서화 (OpenAPI/Swagger — `/docs`)
- [x] 아키텍처 문서 (`docs/`)
- [ ] 데모 시나리오 준비 (정상, 위기, 전문가 개입)
- [ ] README 포트폴리오 정리

**산출물**: Docker 한 줄로 실행 가능한 풀 스택 + 데모 영상

---

## 핵심 데모 시나리오

### 시나리오 1: 일반 상담 흐름
```
사용자: 직장 스트레스와 불안 호소
  → Triage: Low Risk (2/10)
  → Counseling Agent: CBT 기반 인지 왜곡 탐색
  → 세션 종료 시 요약 → ChromaDB 저장
```

### 시나리오 2: 위기 개입 흐름
```
사용자: 대화 중 자해 의도 표현
  → Triage: High Risk (8/10)
  → Crisis Agent 즉시 활성화
  → 안전 계획 안내 + 1393 연결 제안
  → 전문가 대시보드 즉시 알림 (WS)
  → expert_reviews 테이블에 pending 레코드 생성
```

### 시나리오 3: Expert-in-the-loop ✅ 구현 완료
```
고위험 세션 (risk_level ≥ 6) AI 응답 생성
  → expert_reviews 테이블에 pending 레코드 삽입
  → /ws/expert 연결된 전문가에게 실시간 브로드캐스트
  → 전문가가 /expert 대시보드에서 확인
  → 승인(approve) 또는 응답 수정(modify) + 피드백 메모 제출
  → reviewed_at, reviewer_id 기록
```

### 시나리오 4: 다회기 컨텍스트 유지 ✅ 구현 완료
```
2주 후 재방문 사용자
  → memory_loader_node: ChromaDB에서 의미 유사 과거 세션 검색
  → 과거 세션 요약이 system prompt에 주입
  → "지난번에 말씀하셨던 업무 스트레스는 어떻게 되셨나요?"
  → 치료 이력 기반 맞춤 접근
```

---

## 우선순위 결정 기준

| 항목 | 상태 | 비고 |
|-----|------|------|
| 에이전트 오케스트레이션 | ✅ 완료 | memory_loader → input_filter → triage → counseling/crisis |
| 위험도 분류 | ✅ 완료 | 정확도 고도화 가능 |
| 위기 개입 흐름 | ✅ 완료 | 외부 API 연동 예정 |
| Safety Guardrail | ✅ 완료 | 3계층 구현 |
| Working Memory (Redis) | ✅ 완료 | 슬라이딩 윈도우 20개 |
| Session Memory (PostgreSQL) | ✅ 완료 | 메시지 영속화 |
| Long-term Memory (ChromaDB) | ✅ 완료 | 세션 요약 + 의미 검색 |
| Expert-in-the-loop | ✅ 완료 | 대기열 + WS 알림 + 대시보드 |
| 전문가 대시보드 UI | ✅ 완료 | 승인/수정 인터페이스 |
| SOAP 임상 노트 | 🔜 다음 | Phase 2 마무리 |
| AWS 배포 | 🔜 다음 | Phase 4 |
| CI/CD | 🔜 다음 | Phase 4 |
