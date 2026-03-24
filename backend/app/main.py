import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .core.database import engine
from .core.redis_client import close_redis
from .core.chroma_client import get_chroma_client, close_chroma
from .models.base import Base
from .api.router import api_router
from .api.chat import router as chat_router

logger = structlog.get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", env=settings.app_env, model=settings.active_model)

    # 개발 환경: 자동 테이블 생성 (프로덕션은 Alembic 사용)
    if settings.app_env == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("db_tables_created")

    # ChromaDB 연결 + 컬렉션 초기화
    try:
        from .memory.long_term_memory import LongTermMemory
        chroma = await get_chroma_client()
        ltm = LongTermMemory(chroma)
        await ltm._get_collection()
        logger.info("chroma_collection_ready")
    except Exception as e:
        logger.warning("chroma_unavailable", error=str(e))

    # LangGraph 그래프 사전 컴파일 (첫 요청 지연 방지)
    from .agents.orchestrator import get_graph
    get_graph()

    yield

    # 종료 정리
    await engine.dispose()
    await close_redis()
    await close_chroma()
    logger.info("shutdown")


app = FastAPI(
    title="MindCare AI",
    description="LangGraph 기반 멀티에이전트 정신건강 상담 시스템",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST API (prefix: /api/v1)
app.include_router(api_router, prefix="/api/v1")

# WebSocket (ws://localhost:8000/ws/chat/{session_id})
app.include_router(chat_router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "mindcare-backend", "version": "0.1.0"}
