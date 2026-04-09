"""资格审查规则（演示逻辑）：正式环境需对接学籍、违纪、困难生认定等权威数据源。"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ApplicationIntent(str, Enum):
    """学生拟申请的资助类型（用于交叉校验）。"""

    NONE = "none"
    NATIONAL_SCHOLARSHIP = "national_scholarship"  # 国家奖学金
    NATIONAL_ENCOURAGEMENT = "national_encouragement"  # 国家励志奖学金
    NATIONAL_GRANT = "national_grant"  # 国家助学金
    LOAN = "loan"  # 助学贷款


class Severity(str, Enum):
    BLOCK = "block"  # 建议拦截或人工复核
    WARN = "warn"  # 提示风险


@dataclass(frozen=True)
class StudentScreeningInput:
    student_id: str
    name: str | None = None
    is_suspended: bool = False  # 休学
    has_major_disciplinary: bool = False  # 严重违纪（记过及以上等，由学校定义）
    in_poverty_database: bool = False  # 家庭经济困难认定库
    intent: ApplicationIntent = ApplicationIntent.NONE


@dataclass(frozen=True)
class AnomalyItem:
    student_id: str
    severity: Severity
    codes: list[str]
    messages: list[str]


def _messages_for(
    suspended: bool,
    major_disc: bool,
    in_poverty: bool,
    intent: ApplicationIntent,
) -> tuple[list[str], list[str], Severity]:
    codes: list[str] = []
    msgs: list[str] = []
    severity = Severity.WARN

    if suspended:
        codes.append("SUSPENDED")
        msgs.append(
            "学籍为休学（或保留学籍）状态：国家助学金一般自次月起停发，恢复学籍后按规定续发；"
            "奖助学金申请资格请以当年学校通知为准。"
        )
        if intent in (
            ApplicationIntent.NATIONAL_GRANT,
            ApplicationIntent.NATIONAL_ENCOURAGEMENT,
            ApplicationIntent.NATIONAL_SCHOLARSHIP,
        ):
            severity = Severity.BLOCK

    if major_disc:
        codes.append("DISCIPLINARY")
        msgs.append(
            "存在严重违纪记录：奖助学金评审可能受影响，请以学校处分决定及当年评审办法为准。"
        )
        severity = Severity.BLOCK

    if intent == ApplicationIntent.NATIONAL_ENCOURAGEMENT and not in_poverty:
        codes.append("POVERTY_REQUIRED")
        msgs.append(
            "申请国家励志奖学金：须为家庭经济困难认定学生；当前不在困难生库或未认定，资格异常。"
        )
        severity = Severity.BLOCK

    if intent == ApplicationIntent.NATIONAL_GRANT and not in_poverty:
        codes.append("POVERTY_REQUIRED_GRANT")
        msgs.append(
            "申请国家助学金：一般须通过家庭经济困难认定；当前不在困难生库或未认定，资格异常。"
        )
        severity = Severity.BLOCK

    if not codes:
        codes.append("OK")
        msgs.append("未发现与休学、违纪、困难库冲突的规则性异常（演示规则）。")

    return codes, msgs, severity


def screen_one(row: StudentScreeningInput) -> AnomalyItem:
    codes, msgs, sev = _messages_for(
        row.is_suspended,
        row.has_major_disciplinary,
        row.in_poverty_database,
        row.intent,
    )
    return AnomalyItem(
        student_id=row.student_id,
        severity=sev,
        codes=codes,
        messages=msgs,
    )


def screen_batch(rows: list[StudentScreeningInput]) -> dict:
    anomalies = [screen_one(r) for r in rows]
    blocked = sum(1 for a in anomalies if a.severity == Severity.BLOCK)
    warned = sum(1 for a in anomalies if a.severity == Severity.WARN)
    full = [
        {
            "student_id": a.student_id,
            "severity": a.severity.value,
            "codes": a.codes,
            "messages": a.messages,
        }
        for a in anomalies
    ]
    exception_only = [x for x in full if x["codes"] != ["OK"]]
    return {
        "total": len(rows),
        "blocked_count": blocked,
        "warn_count": warned,
        "anomalies": full,
        "exception_list": exception_only,
        "disclaimer": "演示规则引擎，非学校官方结论。正式使用需对接学籍、违纪、资助中心认定数据并履行审批与公示程序。",
    }
