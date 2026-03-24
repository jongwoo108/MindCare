import structlog
import chromadb
from chromadb import AsyncHttpClient

from ..config import get_settings

logger = structlog.get_logger(__name__)

_client: AsyncHttpClient | None = None


async def get_chroma_client() -> AsyncHttpClient:
    """ChromaDB 비동기 HTTP 클라이언트 싱글톤."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = await chromadb.AsyncHttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
        logger.info("chroma_connected", host=settings.chroma_host, port=settings.chroma_port)
    return _client


async def close_chroma() -> None:
    global _client
    _client = None
