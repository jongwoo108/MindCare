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

## Phase 2: 안전성 & 메모리 고도화 (Week 3-4) ✅ 완료

**목표**: 임상적 신뢰성을 갖춘 안전장치 + 다층 메모리

### 태스크

- [x] Safety Guardrail 3계층 구현 (입력 필터 / 출력 검증 / 세션 모니터링)
- [x] 세션 메모리 (PostgreSQL) + 메시지 영속화
- [x] 세션 자동 요약 (`session_summarizer.py` — LLM 기반 3-5문장 요약)
- [x] 장기 메모리 (ChromaDB) + 의미 유사도 컨텍스트 검색
- [x] 임상 노트 자동 생성 (SOAP 형식 — 세션 종료 시 LLM 자동 생성)
- [x] 감사 로그 시스템 (`audit_logs` 테이블 + `log_access()` 헬퍼 — PHI 접근 기록)
- [x] 데이터 암호화 (Fernet 대칭키 — `Message.content` + SOAP 노트 4개 컬럼 at-rest 암호화)

**산출물**: 다회기 대화에서 맥락을 유지하며 안전하게 응답 ✅ (시나리오 4 동작)

---

## Phase 3: Expert-in-the-loop + 프론트엔드 (Week 5-6) ✅ 완료

**목표**: 전문가 피드백 루프 + 사용자/전문가 UI

### 태스크

- [x] 전문가 리뷰 대기열 시스템 (`expert_reviews` 테이블 + REST API)
- [ ] 피드백 → 에이전트 프롬프트 실시간 반영 (Phase 4 이후)
- [x] React 채팅 UI (사용자용) — 로그인/회원가입/WebSocket 채팅
- [x] 전문가 대시보드 UI — 대기열 조회 + 승인/수정 인터페이스
- [x] 위험도 시각 표시 (RiskBadge 컴포넌트 — 채팅 UI + 전문가 대시보드)
- [x] 전문가 실시간 알림 (`/ws/expert` WebSocket)

**산출물**: 사용자 채팅 + 전문가 모니터링이 동시에 동작하는 UI ✅ (시나리오 3 동작)

---

## Phase 4: 인프라 & 폴리싱 (Week 7-8) ✅ 완료

**목표**: 배포 가능한 프로토타입 + 문서화

### 태스크

- [x] Docker Compose 풀 스택 구성 (Backend / PostgreSQL / Redis / ChromaDB)
- [x] CI/CD 파이프라인 (GitHub Actions — ruff + pytest + tsc + eslint + docker build)
- [x] CI 서비스 구성 (postgres:16-alpine + redis:7-alpine 테스트 컨테이너)
- [x] API 문서화 (OpenAPI/Swagger — `/docs`)
- [x] 아키텍처 문서 (`docs/`)
- [x] README 포트폴리오 정리
- [x] 전체 기능 통합 테스트 (4개 시나리오 검증 완료)
- [ ] AWS ECS 배포 구성 (또는 로컬 K8s)
- [ ] 데모 시나리오 영상 녹화

**산출물**: Docker 한 줄로 실행 가능한 풀 스택 ✅

---

## Phase 5: 임상 평가 플로우 + UI 고도화 ✅ 완료

**목표**: 사용자 경험을 높이는 평가 흐름과 몰입형 시각 UI

### 태스크

- [x] 초기 평가 모달 (AssessmentModal) — PHQ-9 / GAD / Safety 9문항
- [x] 심화 검사 시스템 (FollowUpModal + FollowUpInviteCard)
  - crisis_detailed / phq_extended / gad_extended 3종
  - 채팅 흐름 내 인라인 초대 카드 → 모달 단계적 전환
- [x] 퀵 리플라이 칩 — AI 인사 메시지에 3개 선택지 버튼
- [x] Time-of-Day 배경 시스템 (`useTimeOfDay` + `SceneBackground`)
  - 실제 시각 기반 4시간대 자동 감지 (60초 폴링)
  - 배경 이미지 3초 크로스페이드 전환
  - 별 반짝임 (`StarField`) — 시간대별 밀도 (0 / 30 / 80 / 120)
  - 수면 shimmer 애니메이션 레이어
- [x] UI 테마 시스템 (`sceneTheme.ts`) — 시간대별 21개 색조 토큰
  - 헤더/채팅 버블/입력창/전송 버튼/모달 전체 동시 전환

**산출물**: 시간대에 반응하는 몰입형 UI + 단계적 임상 평가 흐름 ✅

---

## Phase 6: 의사-환자 매칭 플랫폼 ✅ 완료

**목표**: 전문가 매칭 기능으로 서비스 범위 확장

### 태스크

- [x] DB 모델 (DoctorProfile / PatientCase / DoctorPatientMatch)
- [x] Alembic 마이그레이션 (migration 005)
- [x] REST API (doctor.py) — 프로필 CRUD + 매칭 생성/수락/거절/완료
- [x] 의사 프로필 등록 페이지 (DoctorSetupPage.tsx) — frosted glass UI
- [x] 의사 매칭 대시보드 (DoctorDashboard.tsx) — frosted glass UI (dashboard.png 배경)
- [x] 정신과 사전 리포트 (`GET /doctors/matches/{id}/report`)
  - PatientCase 요약 + SOAP 임상 노트 + PHQ/GAD 평가 점수 통합 반환
  - DoctorDashboard ReportModal — 케이스 개요 / 초기 선별 평가 / SOAP 섹션
- [x] 재방문 사용자 UX — `GET /users/me/assessment-status` + `POST /sessions/{id}/returning-greeting`
  - 30일 이내 평가 이력 있으면 AI가 ChromaDB 기반 맞춤 인사 먼저 전달
- [x] 회원가입 페이지 frosted glass UI (login-bg.png 배경)
- [x] UI 전체 일관성 점검 — 잔여 하드코딩 컬러 제거
  - `MatchNotification.tsx` — 매칭 수락/거절 모달 frosted glass 적용
  - `FollowUpInviteCard.tsx` — 심화 검사 초대 카드 theme 시스템 연동
  - `DoctorDashboard` ReportModal — 정신과 리포트 모달 frosted glass 적용
- [x] 버그 수정
  - React StrictMode 이중 마운트로 AI 인사 메시지 중복 표시 → `cancelled` 플래그로 해결
  - 로딩 말풍선 색상 `theme.aiBubble` 연동
  - 의사 대시보드 `Promise.all` → `Promise.allSettled`로 부분 실패 허용
  - Fernet 암호화 이전 평문 데이터 복호화 실패 → `InvalidToken` 시 원본 반환 (하위 호환)
  - 환자 케이스 생성 기준 개선 — 채팅 메시지 수 단일 기준 → 평가 고위험 시 별도 경로
    - `suicide_flag=true` / `initial_risk_level≥4` / `PHQ≥10` 이면 채팅 수 무관 생성
    - 그 외 일반 위험도는 메시지 4개 이상 유지 (의미 있는 대화 보장)

**산출물**: 의사 등록 → 환자 케이스 매칭 → 정신과 리포트 전체 흐름 동작 ✅

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
| SOAP 임상 노트 | ✅ 완료 | 세션 종료 시 자동 생성 + PostgreSQL 저장 |
| 초기 평가 (PHQ/GAD/Safety) | ✅ 완료 | 9문항 + 심화 검사 3종 |
| 퀵 리플라이 칩 | ✅ 완료 | AI 인사 메시지에 3개 버튼 |
| Time-of-Day 배경 | ✅ 완료 | 4시간대 자동 교체 + 크로스페이드 |
| UI 테마 시스템 | ✅ 완료 | 21개 색조 토큰 × 4시간대 |
| 별 반짝임 애니메이션 | ✅ 완료 | CSS `star-twinkle` + 시간대 밀도 |
| 의사-환자 매칭 | ✅ 완료 | DoctorProfile + PatientCase + Match |
| 정신과 사전 리포트 | ✅ 완료 | SOAP + PHQ/GAD + 케이스 요약 통합 |
| 감사 로그 | ✅ 완료 | PHI 접근 기록 (audit_logs 테이블) |
| 데이터 암호화 | ✅ 완료 | Fernet at-rest (메시지 + SOAP 노트) |
| CI/CD | ✅ 완료 | GitHub Actions (ruff + pytest + tsc + eslint + docker build) |
| AWS 배포 | 🔜 다음 | 향후 Phase |
