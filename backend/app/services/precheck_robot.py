"""资格预审机器人（演示）：批量核对并导出 Excel。"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from openpyxl import Workbook

from app.services.screening import ApplicationIntent, StudentScreeningInput, screen_one


@dataclass(frozen=True)
class PrecheckInput:
    student_id: str
    name: str
    college: str
    major: str
    grade: str
    rank_percent: float | None
    is_suspended: bool
    has_major_disciplinary: bool
    in_poverty_database: bool
    intent: ApplicationIntent


def run_precheck(rows: list[PrecheckInput]) -> dict:
    eligible: list[dict] = []
    abnormal: list[dict] = []
    for r in rows:
        res = screen_one(
            StudentScreeningInput(
                student_id=r.student_id,
                name=r.name,
                is_suspended=r.is_suspended,
                has_major_disciplinary=r.has_major_disciplinary,
                in_poverty_database=r.in_poverty_database,
                intent=r.intent,
            )
        )
        rec = {
            "student_id": r.student_id,
            "name": r.name,
            "college": r.college,
            "major": r.major,
            "grade": r.grade,
            "rank_percent": r.rank_percent,
            "intent": r.intent.value,
            "codes": ",".join(res.codes),
            "messages": "；".join(res.messages),
            "severity": res.severity.value,
        }
        if res.codes == ["OK"]:
            eligible.append(rec)
        else:
            abnormal.append(rec)
    return {"eligible": eligible, "abnormal": abnormal}


def to_excel_bytes(eligible: list[dict], abnormal: list[dict]) -> bytes:
    wb = Workbook()
    ws_ok = wb.active
    ws_ok.title = "符合条件学生名单"
    ws_ab = wb.create_sheet("异常情况清单")

    header = [
        "student_id",
        "name",
        "college",
        "major",
        "grade",
        "rank_percent",
        "intent",
        "codes",
        "messages",
        "severity",
    ]
    ws_ok.append(header)
    for r in eligible:
        ws_ok.append([r.get(h) for h in header])

    ws_ab.append(header)
    for r in abnormal:
        ws_ab.append([r.get(h) for h in header])

    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()

