from typing import Literal, Optional
from pydantic import BaseModel


class WSMessageIn(BaseModel):
    type: Literal["message", "ping"] = "message"
    content: str = ""


class WSResponseMetadata(BaseModel):
    agent: str
    risk_level: int
    therapeutic_approach: str
    safety_flags: list[str]
    expert_review_pending: bool = False


class WSResponseOut(BaseModel):
    type: Literal["response"] = "response"
    content: str
    metadata: WSResponseMetadata


class WSRiskAlert(BaseModel):
    type: Literal["risk_alert"] = "risk_alert"
    risk_level: int
    risk_factors: list[str]
    crisis_resources: list[dict] = [
        {"name": "자살예방상담전화", "number": "1393"},
        {"name": "정신건강위기상담전화", "number": "1577-0199"},
        {"name": "응급의료", "number": "119"},
    ]


class WSErrorOut(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str
