import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..core.database import get_db
from ..core.security import verify_token, TokenPayload
from ..models.doctor import DoctorProfile
from ..models.patient_case import PatientCase
from ..models.match import DoctorPatientMatch

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/doctors", tags=["doctors"])
bearer = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> TokenPayload:
    try:
        return verify_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


# ── Schemas ────────────────────────────────────────────────────────────────────

class DoctorRegisterRequest(BaseModel):
    license_number: str
    hospital: str
    department: str = "정신건강의학과"
    specialties: list[str] = []
    bio: str | None = None
    max_patients: int = 0


class DoctorProfileResponse(BaseModel):
    id: str
    user_id: str
    license_number: str
    hospital: str
    department: str
    specialties: list[str]
    bio: str | None
    max_patients: int
    is_verified: bool
    is_accepting: bool

    @classmethod
    def from_orm(cls, p: DoctorProfile) -> "DoctorProfileResponse":
        return cls(
            id=str(p.id),
            user_id=str(p.user_id),
            license_number=p.license_number,
            hospital=p.hospital,
            department=p.department,
            specialties=p.specialties or [],
            bio=p.bio,
            max_patients=p.max_patients,
            is_verified=p.is_verified,
            is_accepting=p.is_accepting,
        )


class PatientCaseResponse(BaseModel):
    id: str
    summary: str
    keywords: list[str]
    risk_label: str
    recommended_specialties: list[str]
    is_matched: bool
    created_at: str

    @classmethod
    def from_orm(cls, c: PatientCase) -> "PatientCaseResponse":
        return cls(
            id=str(c.id),
            summary=c.summary,
            keywords=c.keywords or [],
            risk_label=c.risk_label,
            recommended_specialties=c.recommended_specialties or [],
            is_matched=c.is_matched,
            created_at=c.created_at.isoformat(),
        )


class MatchRequestBody(BaseModel):
    patient_case_id: str
    doctor_message: str | None = None


class MatchResponse(BaseModel):
    id: str
    doctor_id: str
    patient_case_id: str
    status: str
    doctor_message: str | None
    patient_message: str | None
    created_at: str

    @classmethod
    def from_orm(cls, m: DoctorPatientMatch) -> "MatchResponse":
        return cls(
            id=str(m.id),
            doctor_id=str(m.doctor_id),
            patient_case_id=str(m.patient_case_id),
            status=m.status,
            doctor_message=m.doctor_message,
            patient_message=m.patient_message,
            created_at=m.created_at.isoformat(),
        )


class MatchRespondBody(BaseModel):
    accept: bool
    patient_message: str | None = None


# ── Doctor Registration ────────────────────────────────────────────────────────

@router.post("/register", response_model=DoctorProfileResponse, status_code=201)
async def register_doctor(
    body: DoctorRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    의사 프로필 등록.
    role='doctor'인 User만 가능. Admin이 나중에 is_verified=True로 승인.
    """
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="의사 계정만 프로필을 등록할 수 있습니다.")

    existing = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(current_user.sub))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 프로필이 등록되어 있습니다.")

    dup_license = await db.execute(
        select(DoctorProfile).where(DoctorProfile.license_number == body.license_number)
    )
    if dup_license.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 등록된 면허 번호입니다.")

    profile = DoctorProfile(
        id=uuid.uuid4(),
        user_id=uuid.UUID(current_user.sub),
        license_number=body.license_number,
        hospital=body.hospital,
        department=body.department,
        specialties=body.specialties,
        bio=body.bio,
        max_patients=body.max_patients,
    )
    db.add(profile)
    await db.flush()
    logger.info("doctor_registered", profile_id=str(profile.id))
    return DoctorProfileResponse.from_orm(profile)


@router.get("/me", response_model=DoctorProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(current_user.sub))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="프로필이 없습니다.")
    return DoctorProfileResponse.from_orm(profile)


@router.patch("/me", response_model=DoctorProfileResponse)
async def update_my_profile(
    body: DoctorRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="의사 계정만 수정할 수 있습니다.")

    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(current_user.sub))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="프로필이 없습니다.")

    profile.hospital = body.hospital
    profile.department = body.department
    profile.specialties = body.specialties
    profile.bio = body.bio
    profile.max_patients = body.max_patients
    await db.flush()
    return DoctorProfileResponse.from_orm(profile)


# ── Case Board (의사용 환자 케이스 게시판) ──────────────────────────────────────

@router.get("/cases", response_model=dict)
async def list_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    specialty: str | None = Query(None),
    risk_min: int = Query(0, ge=0, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    케이스 게시판 — 매칭 대기 중인 익명화 케이스 목록.
    의사만 접근 가능. 전문 분야 필터 및 위험도 필터 지원.
    """
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="의사 계정만 접근할 수 있습니다.")

    # 프로필 승인 여부 확인
    profile_result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(current_user.sub))
    )
    profile = profile_result.scalar_one_or_none()
    if not profile or not profile.is_verified:
        raise HTTPException(status_code=403, detail="승인된 의사만 케이스를 조회할 수 있습니다.")

    query = select(PatientCase).where(
        PatientCase.is_visible.is_(True),
        PatientCase.is_matched.is_(False),
        PatientCase.risk_level >= risk_min,
    )

    total_result = await db.execute(
        select(func.count()).select_from(PatientCase).where(
            PatientCase.is_visible.is_(True),
            PatientCase.is_matched.is_(False),
            PatientCase.risk_level >= risk_min,
        )
    )
    total = total_result.scalar_one()

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(PatientCase.created_at.desc()).offset(offset).limit(limit)
    )
    cases = result.scalars().all()

    # specialty 필터 (JSON 배열 포함 여부 — 간단 구현)
    if specialty:
        cases = [c for c in cases if specialty in (c.recommended_specialties or [])]

    return {
        "items": [PatientCaseResponse.from_orm(c) for c in cases],
        "total": total,
        "page": page,
        "limit": limit,
    }


# ── Match Request (의사 → 환자 매칭 요청) ────────────────────────────────────

@router.post("/matches", response_model=MatchResponse, status_code=201)
async def request_match(
    body: MatchRequestBody,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    의사가 특정 케이스에 매칭 요청.
    케이스당 하나의 매칭만 허용 (unique constraint on patient_case_id).
    """
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="의사 계정만 매칭 요청을 할 수 있습니다.")

    profile_result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(current_user.sub))
    )
    profile = profile_result.scalar_one_or_none()
    if not profile or not profile.is_verified:
        raise HTTPException(status_code=403, detail="승인된 의사만 매칭 요청을 할 수 있습니다.")

    case_result = await db.execute(
        select(PatientCase).where(PatientCase.id == uuid.UUID(body.patient_case_id))
    )
    patient_case = case_result.scalar_one_or_none()
    if not patient_case:
        raise HTTPException(status_code=404, detail="케이스를 찾을 수 없습니다.")
    if patient_case.is_matched:
        raise HTTPException(status_code=409, detail="이미 매칭된 케이스입니다.")

    existing_match = await db.execute(
        select(DoctorPatientMatch).where(
            DoctorPatientMatch.patient_case_id == uuid.UUID(body.patient_case_id)
        )
    )
    if existing_match.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 매칭 요청이 진행 중인 케이스입니다.")

    match = DoctorPatientMatch(
        id=uuid.uuid4(),
        doctor_id=profile.id,
        patient_case_id=uuid.UUID(body.patient_case_id),
        user_id=patient_case.user_id,
        doctor_message=body.doctor_message,
        status="pending",
    )
    db.add(match)
    await db.flush()
    logger.info("match_requested", match_id=str(match.id), doctor_id=str(profile.id))
    return MatchResponse.from_orm(match)


@router.get("/matches", response_model=list[MatchResponse])
async def list_my_matches(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """의사 본인의 매칭 요청 목록."""
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="의사 계정만 접근할 수 있습니다.")

    profile_result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == uuid.UUID(current_user.sub))
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="프로필이 없습니다.")

    result = await db.execute(
        select(DoctorPatientMatch)
        .where(DoctorPatientMatch.doctor_id == profile.id)
        .order_by(DoctorPatientMatch.created_at.desc())
    )
    return [MatchResponse.from_orm(m) for m in result.scalars().all()]


# ── Patient-side: 매칭 요청 수락/거절 ──────────────────────────────────────────

@router.get("/my-match", response_model=MatchResponse | None)
async def get_patient_match(
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """환자 본인에게 온 매칭 요청 조회 (가장 최근 pending)."""
    result = await db.execute(
        select(DoctorPatientMatch)
        .where(
            DoctorPatientMatch.user_id == uuid.UUID(current_user.sub),
            DoctorPatientMatch.status == "pending",
        )
        .order_by(DoctorPatientMatch.created_at.desc())
        .limit(1)
    )
    match = result.scalar_one_or_none()
    if not match:
        return None
    return MatchResponse.from_orm(match)


@router.post("/my-match/{match_id}/respond", response_model=MatchResponse)
async def respond_to_match(
    match_id: str,
    body: MatchRespondBody,
    db: AsyncSession = Depends(get_db),
    current_user: TokenPayload = Depends(get_current_user),
):
    """환자가 매칭 요청을 수락하거나 거절."""
    result = await db.execute(
        select(DoctorPatientMatch).where(
            DoctorPatientMatch.id == uuid.UUID(match_id),
            DoctorPatientMatch.user_id == uuid.UUID(current_user.sub),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="매칭 요청을 찾을 수 없습니다.")
    if match.status != "pending":
        raise HTTPException(status_code=400, detail="이미 처리된 요청입니다.")

    match.status = "accepted" if body.accept else "rejected"
    match.patient_message = body.patient_message

    if body.accept:
        # PatientCase 매칭 완료 처리
        case_result = await db.execute(
            select(PatientCase).where(PatientCase.id == match.patient_case_id)
        )
        patient_case = case_result.scalar_one_or_none()
        if patient_case:
            patient_case.is_matched = True

    await db.flush()
    logger.info("match_responded", match_id=match_id, accepted=body.accept)
    return MatchResponse.from_orm(match)
