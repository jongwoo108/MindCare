from uuid import UUID
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, field_validator


class SessionCreate(BaseModel):
    pass  # 서버에서 user_id를 JWT에서 추출


class SessionResponse(BaseModel):
    id: UUID
    status: str
    therapeutic_approach: Optional[str]
    risk_level: int
    message_count: int
    created_at: datetime
    last_activity_at: datetime

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    items: list[SessionResponse]
    total: int
    page: int
    limit: int
