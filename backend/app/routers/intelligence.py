from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.calculator import AidCalcInput, DifficultyLevel, estimate_aid
from app.services.hidden_poverty import HiddenPovertyInput, detect_hidden_poverty
from app.services.insights import ConsumptionInput, ProfileFlags, assess_hidden_poverty, recommend_auto_policies
from app.services.policy_matcher import StudentMatchProfile, build_push_reminders, match_awards
from app.services.policy_windows import list_windows
from app.services.precheck_robot import PrecheckInput, run_precheck, to_excel_bytes
from app.services.screening import ApplicationIntent, StudentScreeningInput, screen_batch

router = APIRouter(tags=["intelligence"])


FAQ_PRESETS = [
    {"id": "loan_apply", "question": "助学贷款怎么申请？", "hint": "生源地信用助学贷款办理与回校提交受理证明"},
    {"id": "scholarship_cond", "question": "奖学金申请条件有哪些？", "hint": "国奖、励志、校内奖差异"},
    {"id": "grant_poverty", "question": "国家助学金和困难认定是什么关系？", "hint": "认定库与申请资格"},
    {"id": "same_year", "question": "同一学年国奖和励志能同时拿吗？", "hint": "互斥与可组合情形"},
]


@router.get("/faq/presets")
def faq_presets():
    """7x24 问答：前端可展示预设问题，任意时刻可调用 /api/chat。"""
    return {
        "items": FAQ_PRESETS,
        "note": "政策问答接口为 POST /api/chat，本列表仅作快捷入口。",
    }


class ScreeningRow(BaseModel):
    student_id: str = Field(..., min_length=1)
    name: str | None = None
    is_suspended: bool = False
    has_major_disciplinary: bool = False
    in_poverty_database: bool = False
    intent: ApplicationIntent = ApplicationIntent.NONE


class ScreeningRequest(BaseModel):
    students: list[ScreeningRow] = Field(..., min_length=1)


@router.post("/eligibility/screen")
def eligibility_screen(body: ScreeningRequest):
    """自动化资格审查：核对休学、违纪、困难库与申请意向，生成异常名单。"""
    rows = [
        StudentScreeningInput(
            student_id=s.student_id,
            name=s.name,
            is_suspended=s.is_suspended,
            has_major_disciplinary=s.has_major_disciplinary,
            in_poverty_database=s.in_poverty_database,
            intent=s.intent,
        )
        for s in body.students
    ]
    return screen_batch(rows)


class ConsumptionBody(BaseModel):
    student_id: str
    monthly_total_yuan: float = Field(..., ge=0)
    cohort_median_yuan: float | None = Field(None, ge=0)
    canteen_share: float = Field(..., ge=0, le=1)
    essential_share: float | None = Field(None, ge=0, le=1)


@router.post("/insights/poverty-risk")
def poverty_risk(body: ConsumptionBody):
    """智能预警：基于消费画像的「隐形贫困」风险提示（演示算法）。"""
    r = assess_hidden_poverty(
        ConsumptionInput(
            student_id=body.student_id,
            monthly_total_yuan=body.monthly_total_yuan,
            cohort_median_yuan=body.cohort_median_yuan,
            canteen_share=body.canteen_share,
            essential_share=body.essential_share,
        )
    )
    return {
        "student_id": r.student_id,
        "hidden_poverty_score": r.hidden_poverty_score,
        "level": r.level,
        "reasons": r.reasons,
        "disclaimer": "演示模型，不构成认定结论。须与困难生认定、民主评议等程序结合使用。",
    }


class RecommendBody(BaseModel):
    is_freshman: bool = False
    is_retired_soldier_undergrad: bool = False
    in_poverty_database: bool = False
    is_suspended: bool = False


@router.post("/recommendations/auto")
def recommendations_auto(body: RecommendBody):
    """智能推荐：免申即享/主动推送类政策（规则演示）。"""
    return recommend_auto_policies(
        ProfileFlags(
            is_freshman=body.is_freshman,
            is_retired_soldier_undergrad=body.is_retired_soldier_undergrad,
            in_poverty_database=body.in_poverty_database,
            is_suspended=body.is_suspended,
        )
    )


class AidCalculatorBody(BaseModel):
    grade: int = Field(..., ge=1, le=8)
    gpa: float = Field(..., ge=0, le=5)
    rank_percent: float | None = Field(None, ge=0, le=100)
    in_poverty_database: bool = False
    difficulty_level: DifficultyLevel = DifficultyLevel.NONE
    has_disability_certificate: bool = False
    is_retired_soldier_undergrad: bool = False
    wants_national_scholarship: bool = True
    wants_national_encouragement: bool = True
    wants_national_grant: bool = True


@router.post("/calculator/aid-estimate")
def calculator_aid_estimate(body: AidCalculatorBody):
    """资助计算器：估算理论可申请上限，支持“励志+助学金”并行规则说明。"""
    return estimate_aid(
        AidCalcInput(
            grade=body.grade,
            gpa=body.gpa,
            rank_percent=body.rank_percent,
            in_poverty_database=body.in_poverty_database,
            difficulty_level=body.difficulty_level,
            has_disability_certificate=body.has_disability_certificate,
            is_retired_soldier_undergrad=body.is_retired_soldier_undergrad,
            wants_national_scholarship=body.wants_national_scholarship,
            wants_national_encouragement=body.wants_national_encouragement,
            wants_national_grant=body.wants_national_grant,
        )
    )


class MatchProfileBody(BaseModel):
    grade: int = Field(2, ge=1, le=8)
    gpa: float = Field(3.2, ge=0, le=5)
    rank_percent: float | None = Field(None, ge=0, le=100)
    in_poverty_database: bool = False
    difficulty_level: DifficultyLevel = DifficultyLevel.NONE
    is_undergraduate: bool = True
    is_freshman: bool = False
    is_retired_soldier_undergrad: bool = False
    has_patent: bool = False
    competition_level: str = "none"
    has_art_performance_award: bool = False
    has_social_practice_award: bool = False
    has_major_disciplinary: bool = False
    is_suspended: bool = False


def _to_match_profile(body: MatchProfileBody) -> StudentMatchProfile:
    cl = body.competition_level if body.competition_level in ("none", "provincial", "national") else "none"
    return StudentMatchProfile(
        grade=body.grade,
        gpa=body.gpa,
        rank_percent=body.rank_percent,
        in_poverty_database=body.in_poverty_database,
        difficulty_level=body.difficulty_level,
        is_undergraduate=body.is_undergraduate,
        is_freshman=body.is_freshman,
        is_retired_soldier_undergrad=body.is_retired_soldier_undergrad,
        has_patent=body.has_patent,
        competition_level=cl,  # type: ignore[arg-type]
        has_art_performance_award=body.has_art_performance_award,
        has_social_practice_award=body.has_social_practice_award,
        has_major_disciplinary=body.has_major_disciplinary,
        is_suspended=body.is_suspended,
    )


@router.get("/policy/windows")
def policy_windows_catalog():
    """常见申请窗口期（归纳，以当年学校通知为准）。"""
    return {"windows": list_windows()}


@router.post("/match/awards")
def match_awards_endpoint(body: MatchProfileBody):
    """个性化匹配：筛选可能适合的国/校/社会奖项（演示规则）。"""
    return match_awards(_to_match_profile(body))


class PushRemindersBody(MatchProfileBody):
    month: int = Field(default_factory=lambda: datetime.now().month, ge=1, le=12)


@router.post("/push/reminders")
def push_reminders_endpoint(body: PushRemindersBody):
    """主动提醒：在窗口期内对符合条件学生列出应关注的政策批次（演示）。"""
    return build_push_reminders(_to_match_profile(body), body.month)


class HiddenPovertyRow(BaseModel):
    student_id: str
    grade: str
    major: str
    in_poverty_database: bool = False
    canteen_monthly_yuan: float = Field(..., ge=0)
    canteen_monthly_freq: int = Field(..., ge=0)
    supermarket_monthly_yuan: float = Field(..., ge=0)
    workstudy_apply_count: int = Field(..., ge=0)
    cohort_monthly_median_yuan: float | None = Field(None, ge=0)


class HiddenPovertyBatchBody(BaseModel):
    rows: list[HiddenPovertyRow] = Field(..., min_length=1)


@router.post("/hidden-poverty/detect")
def hidden_poverty_detect(body: HiddenPovertyBatchBody):
    """隐形贫困识别辅助：输出个人风险与匿名预警（演示，需授权用数）。"""
    return detect_hidden_poverty(
        [
            HiddenPovertyInput(
                student_id=r.student_id,
                grade=r.grade,
                major=r.major,
                in_poverty_database=r.in_poverty_database,
                canteen_monthly_yuan=r.canteen_monthly_yuan,
                canteen_monthly_freq=r.canteen_monthly_freq,
                supermarket_monthly_yuan=r.supermarket_monthly_yuan,
                workstudy_apply_count=r.workstudy_apply_count,
                cohort_monthly_median_yuan=r.cohort_monthly_median_yuan,
            )
            for r in body.rows
        ]
    )


class PrecheckRow(BaseModel):
    student_id: str
    name: str
    college: str
    major: str
    grade: str
    rank_percent: float | None = Field(None, ge=0, le=100)
    is_suspended: bool = False
    has_major_disciplinary: bool = False
    in_poverty_database: bool = False
    intent: ApplicationIntent = ApplicationIntent.NONE


class PrecheckBatchBody(BaseModel):
    rows: list[PrecheckRow] = Field(..., min_length=1)


@router.post("/precheck/run")
def precheck_run(body: PrecheckBatchBody):
    """资格预审机器人：输出符合条件名单与异常清单（JSON）。"""
    rows = [
        PrecheckInput(
            student_id=r.student_id,
            name=r.name,
            college=r.college,
            major=r.major,
            grade=r.grade,
            rank_percent=r.rank_percent,
            is_suspended=r.is_suspended,
            has_major_disciplinary=r.has_major_disciplinary,
            in_poverty_database=r.in_poverty_database,
            intent=r.intent,
        )
        for r in body.rows
    ]
    out = run_precheck(rows)
    return {
        "eligible_count": len(out["eligible"]),
        "abnormal_count": len(out["abnormal"]),
        **out,
    }


@router.post("/precheck/export.xlsx")
def precheck_export_xlsx(body: PrecheckBatchBody):
    """资格预审机器人：导出 Excel（符合条件学生名单 + 异常情况清单）。"""
    rows = [
        PrecheckInput(
            student_id=r.student_id,
            name=r.name,
            college=r.college,
            major=r.major,
            grade=r.grade,
            rank_percent=r.rank_percent,
            is_suspended=r.is_suspended,
            has_major_disciplinary=r.has_major_disciplinary,
            in_poverty_database=r.in_poverty_database,
            intent=r.intent,
        )
        for r in body.rows
    ]
    out = run_precheck(rows)
    content = to_excel_bytes(out["eligible"], out["abnormal"])
    filename = f"precheck_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
