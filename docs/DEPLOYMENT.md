# MindCare AI — 배포 가이드

## 1. 로컬 개발 환경 (Docker Compose)

### 사전 요구사항
- Docker 24+
- Docker Compose 2.20+
- OpenAI API Key

### 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/mindcare-ai.git
cd mindcare-ai

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY 등 필수 값 입력

# 3. 전체 스택 실행
docker compose up -d

# 4. DB 마이그레이션
docker compose exec backend alembic upgrade head

# 5. 접속 확인
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 서비스 구성

| 서비스 | 포트 | 설명 |
|-------|------|------|
| frontend | 3000 | React 채팅 UI |
| backend | 8000 | FastAPI 서버 |
| postgres | 5432 | PostgreSQL DB |
| redis | 6379 | Redis 캐시/상태 |
| chromadb | 8001 | 벡터 DB |
| celery | - | 비동기 태스크 워커 |
| nginx | 80/443 | 리버스 프록시 |

---

## 2. 환경 변수

```bash
# .env.example

# 앱 설정
APP_NAME=MindCare AI
APP_ENV=development  # development | staging | production
SECRET_KEY=your-secret-key-here
DEBUG=true

# LLM
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-2024-08-06
OPENAI_MODEL_DEV=gpt-4o-mini  # 개발 시 비용 절감

# 데이터베이스
DATABASE_URL=postgresql+asyncpg://mindcare:password@postgres:5432/mindcare
REDIS_URL=redis://redis:6379/0
CHROMA_HOST=chromadb
CHROMA_PORT=8001

# 보안
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
ENCRYPTION_KEY=your-aes-256-key

# 위기 개입
CRISIS_RISK_THRESHOLD=7
EXPERT_REVIEW_THRESHOLD=6
CRISIS_HOTLINE_1393=1393
CRISIS_EMERGENCY=119

# Celery
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# 모니터링
LOG_LEVEL=INFO
PROMETHEUS_ENABLED=true
```

---

## 3. AWS ECS Fargate 배포

### 아키텍처

```
Internet
    │
    ▼
[Route 53] → [CloudFront] → [ALB]
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              [Frontend     [Backend     [Celery
               ECS Task]    ECS Task]    ECS Task]
                    │           │
                    └───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         [RDS          [ElastiCache  [OpenSearch
          PostgreSQL]   Redis]        (optional)]
```

### 배포 순서

```bash
# 1. AWS CLI 설정
aws configure

# 2. ECR 이미지 빌드 & 푸시
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com

docker build -t mindcare-backend ./backend
docker tag mindcare-backend:latest <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/mindcare-backend:latest
docker push <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/mindcare-backend:latest

# 3. CloudFormation 스택 배포
aws cloudformation deploy \
  --template-file infra/aws/cloudformation.yml \
  --stack-name mindcare-ai \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    OpenAIApiKey=sk-... \
    DBPassword=your-db-password

# 4. ECS 서비스 업데이트
aws ecs update-service \
  --cluster mindcare-cluster \
  --service mindcare-backend \
  --force-new-deployment
```

---

## 4. CI/CD (GitHub Actions)

### 파이프라인 흐름

```
Push to main
     │
     ▼
[Lint & Test]
     │
     ▼
[Build Docker Images]
     │
     ▼
[Push to ECR]
     │
     ▼
[Deploy to ECS] (main 브랜치만)
     │
     ▼
[E2E Smoke Test]
     │
     ▼
[Slack 알림]
```

### 브랜치 전략

| 브랜치 | 배포 환경 | 자동 배포 |
|-------|---------|---------|
| `feature/*` | - | 테스트만 실행 |
| `develop` | Staging | 자동 배포 |
| `main` | Production | 자동 배포 (승인 필요) |

---

## 5. 로컬 K8s (minikube) — 선택 사항

```bash
# minikube 시작
minikube start --memory=8192 --cpus=4

# 이미지 빌드
eval $(minikube docker-env)
docker build -t mindcare-backend:local ./backend
docker build -t mindcare-frontend:local ./frontend

# 배포
kubectl apply -f infra/k8s/

# 서비스 확인
kubectl get pods -n mindcare
kubectl get services -n mindcare

# 포트 포워딩
kubectl port-forward service/backend 8000:8000 -n mindcare
kubectl port-forward service/frontend 3000:3000 -n mindcare
```

---

## 6. 데이터베이스 마이그레이션

```bash
# 새 마이그레이션 생성
alembic revision --autogenerate -m "add_clinical_notes_table"

# 마이그레이션 적용
alembic upgrade head

# 특정 버전으로 롤백
alembic downgrade -1

# 마이그레이션 이력 확인
alembic history
```

---

## 7. 모니터링 & 로그

### 로그 확인

```bash
# 백엔드 로그
docker compose logs -f backend

# 에이전트 처리 로그만 필터
docker compose logs -f backend | grep "agent"

# 위기 이벤트 로그
docker compose logs -f backend | grep "CRISIS"
```

### 메트릭 (Prometheus)

주요 메트릭:
- `mindcare_messages_total` — 총 메시지 수
- `mindcare_crisis_events_total` — 위기 이벤트 수
- `mindcare_agent_latency_seconds` — 에이전트 응답 시간
- `mindcare_safety_blocks_total` — 안전 필터 차단 수
- `mindcare_expert_reviews_total` — 전문가 리뷰 수

---

## 8. 트러블슈팅

### 일반 문제

**Q: Backend 컨테이너가 시작 후 바로 종료됨**
```bash
docker compose logs backend
# 주로 DATABASE_URL 연결 오류 또는 OPENAI_API_KEY 누락
```

**Q: ChromaDB 연결 오류**
```bash
docker compose restart chromadb
docker compose exec backend python -c "import chromadb; print('OK')"
```

**Q: WebSocket 연결이 끊김**
- nginx.conf의 `proxy_read_timeout` 값 확인 (기본값: 60s → 3600s로 변경)

**Q: 마이그레이션 충돌**
```bash
alembic stamp head  # 현재 상태를 head로 표시
alembic upgrade head
```
