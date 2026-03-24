from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class ClinicalNoteResponse(BaseModel):
    id: UUID
    session_id: UUID
    subjective: str
    objective: str
    assessment: str
    plan: str
    risk_level: int
    therapeutic_approach: str | None
    message_count: int
    generated_at: datetime  # created_at alias

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_note(cls, note) -> "ClinicalNoteResponse":
        return cls(
            id=note.id,
            session_id=note.session_id,
            subjective=note.subjective,
            objective=note.objective,
            assessment=note.assessment,
            plan=note.plan,
            risk_level=note.risk_level,
            therapeutic_approach=note.therapeutic_approach,
            message_count=note.message_count,
            generated_at=note.created_at,
        )


class ClinicalNotesListResponse(BaseModel):
    notes: list[ClinicalNoteResponse]
