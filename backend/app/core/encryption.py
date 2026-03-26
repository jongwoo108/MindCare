"""
Fernet 대칭키 암호화 유틸리티.

민감한 PHI(Protected Health Information) 컬럼에 적용되는 SQLAlchemy TypeDecorator.
DB에는 암호화된 텍스트가 저장되고, 읽을 때 자동으로 복호화된다.

적용 대상:
  - Message.content  (상담 대화 내용)
  - ClinicalNote.subjective / objective / assessment / plan  (SOAP 임상 노트)

키 관리:
  - ENCRYPTION_KEY 환경변수에서 Fernet 키 로드
  - 키 분실 시 기존 데이터 복호화 불가 → 키를 안전하게 보관할 것
"""
import structlog
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

logger = structlog.get_logger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        from ..config import get_settings
        key = get_settings().encryption_key
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        # 암호화 적용 이전에 저장된 평문 데이터는 그대로 반환 (하위 호환)
        logger.warning("decryption_skipped_plaintext", hint="평문 데이터로 간주하고 원본 반환")
        return value


class EncryptedText(TypeDecorator):
    """
    저장 시 Fernet 암호화, 조회 시 자동 복호화되는 SQLAlchemy 컬럼 타입.

    사용법:
        content: Mapped[str] = mapped_column(EncryptedText, nullable=False)
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Python → DB: 암호화"""
        if value is None:
            return None
        return encrypt(value)

    def process_result_value(self, value, dialect):
        """DB → Python: 복호화"""
        if value is None:
            return None
        return decrypt(value)
