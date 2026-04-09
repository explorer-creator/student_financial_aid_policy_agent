"""资助计算器（演示规则）：
用于估算“理论可申请”金额，不等同于最终审批或发放结果。
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class DifficultyLevel(str, Enum):
    NONE = "none"
    GENERAL = "general"  # 一般困难
    COMPARATIVE = "comparative"  # 比较困难
    SPECIAL = "special"  # 特别困难


@dataclass(frozen=True)
class AidCalcInput:
    grade: int  # 年级：1~4（示例）
    gpa: float
    rank_percent: float | None  # 百分位，越小越靠前，例如 8 表示前 8%
    in_poverty_database: bool
    difficulty_level: DifficultyLevel = DifficultyLevel.NONE
    has_disability_certificate: bool = False
    is_retired_soldier_undergrad: bool = False
    wants_national_scholarship: bool = True
    wants_national_encouragement: bool = True
    wants_national_grant: bool = True


def _estimate_national_grant(level: DifficultyLevel, in_poverty: bool) -> tuple[int, str]:
    if not in_poverty:
        return 0, "未在困难生库，国家助学金通常不满足基础条件。"
    if level == DifficultyLevel.SPECIAL:
        return 4400, "按“特别困难”历史公示示例估算。"
    if level == DifficultyLevel.COMPARATIVE:
        return 3600, "按“比较困难”历史公示示例估算。"
    if level == DifficultyLevel.GENERAL:
        return 2800, "按“一般困难”历史公示示例估算。"
    return 3700, "按国家助学金平均标准估算。"


def estimate_aid(payload: AidCalcInput) -> dict:
    items: list[dict] = []
    notes: list[str] = []
    warnings: list[str] = []

    # 国家奖学金（示例资格：二年级及以上 + 成绩较优）
    can_national_scholarship = (
        payload.grade >= 2
        and (payload.rank_percent is not None and payload.rank_percent <= 10)
        and payload.gpa >= 3.5
    )
    if payload.wants_national_scholarship:
        amount = 10000 if can_national_scholarship else 0
        reason = (
            "满足演示门槛：二年级及以上、GPA>=3.5 且排名前10%。"
            if amount
            else "未达到演示门槛（真实评选以学校评审细则为准）。"
        )
        items.append(
            {
                "policy": "国家奖学金",
                "amount_yuan": amount,
                "eligible": bool(amount),
                "reason": reason,
            }
        )

    # 国家励志奖学金（示例资格：二年级及以上 + 困难生 + 成绩较好）
    can_encouragement = (
        payload.grade >= 2
        and payload.in_poverty_database
        and payload.gpa >= 3.0
        and (payload.rank_percent is None or payload.rank_percent <= 35)
    )
    if payload.wants_national_encouragement:
        amount = 6000 if can_encouragement else 0
        reason = (
            "满足演示门槛：二年级及以上、困难生认定、成绩较好。"
            if amount
            else "未达到演示门槛（真实评选以学校评审细则为准）。"
        )
        items.append(
            {
                "policy": "国家励志奖学金",
                "amount_yuan": amount,
                "eligible": bool(amount),
                "reason": reason,
            }
        )

    # 国家助学金（困难分档）
    if payload.wants_national_grant:
        grant_amount, grant_reason = _estimate_national_grant(
            payload.difficulty_level,
            payload.in_poverty_database,
        )
        items.append(
            {
                "policy": "国家助学金",
                "amount_yuan": grant_amount,
                "eligible": grant_amount > 0,
                "reason": grant_reason,
            }
        )

    # 退役士兵本专科国家助学金（常见规则）
    if payload.is_retired_soldier_undergrad:
        items.append(
            {
                "policy": "退役士兵国家助学金（本科）",
                "amount_yuan": 3700,
                "eligible": True,
                "reason": "全日制在校退役士兵本科生按政策可享受（以当年执行口径为准）。",
            }
        )

    # 残疾学生提醒（仅提示）
    if payload.has_disability_certificate:
        notes.append("检测到残疾证信息：请同步关注残疾学生专项资助、学费减免或地方补助。")

    # 互斥与可并行说明
    scholarship = next((i for i in items if i["policy"] == "国家奖学金"), None)
    encouragement = next((i for i in items if i["policy"] == "国家励志奖学金"), None)
    grant = next((i for i in items if i["policy"] == "国家助学金"), None)

    if scholarship and encouragement and scholarship["eligible"] and encouragement["eligible"]:
        warnings.append("国家奖学金与国家励志奖学金同一学年不可兼得，已按“择高”计算。")

    can_grant_and_encouragement = bool(
        encouragement and encouragement["eligible"] and grant and grant["eligible"]
    )
    notes.append(
        "国家励志奖学金与国家助学金同一学年通常可同时申请（以学校当年通知为准）。"
    )

    # 计算“理论可申请最高额度”
    total = 0
    for item in items:
        if not item["eligible"]:
            continue
        if item["policy"] == "国家励志奖学金" and scholarship and scholarship["eligible"]:
            # 和国家奖学金互斥，若国奖可得则励志不计入总额
            continue
        total += int(item["amount_yuan"])

    return {
        "theoretical_max_total_yuan": total,
        "can_apply_grant_and_encouragement_together": can_grant_and_encouragement,
        "items": items,
        "notes": notes,
        "warnings": warnings,
        "disclaimer": "演示估算器：具体资格、名额、金额、是否发放以广东工业大学及学院当年评审通知为准。",
    }

