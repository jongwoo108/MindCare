from typing import Optional
from datetime import datetime
from pydantic import BaseModel


# ── REST ─────────────────────────────────────────────────

class ExpertQueueItem(BaseModel):
    id: str
    session_id: str
    user_id: str
    risk_level: int
    risk_factors: list[str]
    ai_response: str
    context_summary: Optional[str]
    status: str  # "pending" | "approved" | "modified"
    created_at: datetime

    class Config:
        from_attributes = True


class ExpertQueueResponse(BaseModel):
    items: list[ExpertQueueItem]
    total: int


class FeedbackRequest(BaseModel):
    session_id: str
    pending_response_id: str
    action: str                          # "approve" | "modify"
    modified_content: Optional[str] = None
    feedback_category: Optional[str] = None  # "response_quality"|"safety"|"clinical_accuracy"
    feedback_note: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    status: str
    reviewed_at: datetime


# ── WebSocket ─────────────────────────────────────────────

class WSHighRiskAlert(BaseModel):
    type: str = "high_risk_alert"
    review_id: str
    session_id: str
    user_id: str
    risk_level: int
    risk_factors: list[str]
    ai_response: str
    context_summary: Optional[str] = None


class WSReviewDecision(BaseModel):
    type: str  # "review_decision"
    pending_response_id: str
    action: str             # "approve" | "modify"
    modified_content: Optional[str] = None
    feedback_note: Optional[str] = None
