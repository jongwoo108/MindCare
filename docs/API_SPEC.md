# MindCare AI — API 명세

## 기본 정보

- Base URL: `http://localhost:8000/api/v1`
- WebSocket URL: `ws://localhost:8000/ws`
- 인증 방식: JWT Bearer Token
- 응답 형식: JSON

---

## 인증 (Auth)

### POST /auth/register
사용자 등록

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "string",
  "name": "string",
  "role": "user" // "user" | "counselor" | "admin"
}
```

**Response 201**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "string",
  "role": "user",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### POST /auth/login
로그인 및 토큰 발급

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response 200**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

### POST /auth/refresh
Access Token 갱신

**Request Body**
```json
{
  "refresh_token": "string"
}
```

---

## 채팅 (Chat)

### WebSocket /ws/chat/{session_id}
실시간 채팅 (메인 채팅 엔드포인트)

**Connection Header**
```
Authorization: Bearer {access_token}
```

**Client → Server (메시지 전송)**
```json
{
  "type": "message",
  "content": "오늘 너무 힘들어요...",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Server → Client (AI 응답)**
```json
{
  "type": "response",
  "content": "string",
  "metadata": {
    "agent": "counseling", // "triage" | "counseling" | "crisis"
    "risk_level": 3,
    "therapeutic_approach": "cbt",
    "safety_flags": [],
    "expert_review_pending": false
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Server → Client (위험 알림)**
```json
{
  "type": "risk_alert",
  "risk_level": 8,
  "risk_factors": ["자해 언급", "절망감"],
  "crisis_resources": [
    {"name": "자살예방상담전화", "number": "1393"},
    {"name": "응급의료", "number": "119"}
  ]
}
```

**Server → Client (스트리밍)**
```json
{
  "type": "stream_chunk",
  "content": "string",
  "done": false
}
```

---

## 세션 (Sessions)

### POST /sessions
새 상담 세션 생성

**Response 201**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "active",
  "therapeutic_approach": null,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### GET /sessions
세션 목록 조회

**Query Parameters**
- `page`: int (default: 1)
- `limit`: int (default: 20)
- `status`: "active" | "closed" | "crisis"

**Response 200**
```json
{
  "items": [
    {
      "id": "uuid",
      "status": "active",
      "summary": "string",
      "risk_level": 2,
      "message_count": 15,
      "created_at": "2024-01-01T00:00:00Z",
      "last_activity_at": "2024-01-01T01:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### GET /sessions/{session_id}
세션 상세 조회

**Response 200**
```json
{
  "id": "uuid",
  "status": "active",
  "therapeutic_approach": "cbt",
  "risk_level": 3,
  "messages": [...],
  "clinical_notes": [...],
  "summary": "string",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### GET /sessions/{session_id}/messages
세션 메시지 목록

**Query Parameters**
- `page`: int
- `limit`: int

---

### GET /sessions/{session_id}/clinical-notes
세션 임상 노트 조회 (상담사/관리자 전용)

**Response 200**
```json
{
  "notes": [
    {
      "id": "uuid",
      "format": "soap",
      "subjective": "string",
      "objective": "string",
      "assessment": "string",
      "plan": "string",
      "risk_level": 3,
      "generated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 전문가 대시보드 (Expert)

### WebSocket /ws/expert
전문가 실시간 모니터링

**Connection Header**
```
Authorization: Bearer {counselor_access_token}
```

**Server → Client (고위험 세션 알림)**
```json
{
  "type": "high_risk_alert",
  "session_id": "uuid",
  "user_id": "uuid",
  "risk_level": 8,
  "risk_factors": ["string"],
  "pending_response": {
    "id": "uuid",
    "ai_response": "string",
    "generated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Client → Server (응답 승인/수정)**
```json
{
  "type": "review_decision",
  "pending_response_id": "uuid",
  "action": "approve", // "approve" | "modify"
  "modified_content": null, // action이 "modify"일 때만
  "feedback_note": "string"
}
```

---

### GET /expert/queue
전문가 리뷰 대기열 조회

**Response 200**
```json
{
  "items": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "risk_level": 8,
      "ai_response": "string",
      "context_summary": "string",
      "created_at": "2024-01-01T00:00:00Z",
      "status": "pending" // "pending" | "approved" | "modified"
    }
  ]
}
```

---

### POST /expert/feedback
전문가 피드백 제출

**Request Body**
```json
{
  "session_id": "uuid",
  "pending_response_id": "uuid",
  "action": "modify",
  "modified_content": "string",
  "feedback_category": "response_quality", // "response_quality" | "safety" | "clinical_accuracy"
  "feedback_note": "string"
}
```

---

## 오류 응답 형식

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "인증 토큰이 유효하지 않습니다.",
    "detail": {}
  }
}
```

| HTTP 상태 | 오류 코드 | 설명 |
|----------|---------|------|
| 400 | VALIDATION_ERROR | 요청 데이터 유효성 오류 |
| 401 | INVALID_TOKEN | 인증 토큰 오류 |
| 403 | FORBIDDEN | 권한 없음 |
| 404 | NOT_FOUND | 리소스 없음 |
| 429 | RATE_LIMIT | 요청 한도 초과 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |
