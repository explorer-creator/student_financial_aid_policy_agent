"""隐形贫困识别辅助（演示规则，需在授权与脱敏前提下使用）。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HiddenPovertyInput:
    student_id: str
    grade: str
    major: str
    in_poverty_database: bool
    canteen_monthly_yuan: float
    canteen_monthly_freq: int
    supermarket_monthly_yuan: float
    workstudy_apply_count: int
    cohort_monthly_median_yuan: float | None = None


def detect_hidden_poverty(rows: list[HiddenPovertyInput]) -> dict:
    flagged: list[dict] = []
    for r in rows:
        total = r.canteen_monthly_yuan + r.supermarket_monthly_yuan
        ratio = (
            round(total / r.cohort_monthly_median_yuan, 3)
            if r.cohort_monthly_median_yuan and r.cohort_monthly_median_yuan > 0
            else None
        )
        reasons: list[str] = []
        score = 0.0

        if ratio is not None and ratio < 0.5:
            score += 0.45
            reasons.append("月消费显著低于同群体中位水平。")
        if r.canteen_monthly_freq >= 45 and r.supermarket_monthly_yuan < 80:
            score += 0.25
            reasons.append("食堂消费频次高但非餐支出很低，可能存在压缩性消费。")
        if r.workstudy_apply_count >= 1:
            score += 0.2
            reasons.append("存在勤工助学申请记录。")
        if not r.in_poverty_database:
            score += 0.2
            reasons.append("当前未在困难生库，可纳入重点复核。")

        score = min(1.0, score)
        if score >= 0.62 and not r.in_poverty_database:
            flagged.append(
                {
                    "student_id": r.student_id,
                    "grade": r.grade,
                    "major": r.major,
                    "risk_score": round(score, 3),
                    "reasons": reasons,
                    "anonymous_message": f"{r.grade}{r.major}疑似存在经济困难未申请资助个案，建议辅导员主动关怀。",
                }
            )

    # 匿名汇总（给辅导员/学院）
    summary: dict[str, int] = {}
    for f in flagged:
        k = f"{f['grade']}|{f['major']}"
        summary[k] = summary.get(k, 0) + 1

    anonymous_warnings = [
        {
            "grade": k.split("|", 1)[0],
            "major": k.split("|", 1)[1],
            "suspected_count": v,
            "message": f"{k.split('|', 1)[0]} {k.split('|', 1)[1]} 有 {v} 名学生疑似经济困难未申请资助，建议开展主动关怀。",
        }
        for k, v in summary.items()
    ]

    return {
        "flagged_students": flagged,
        "anonymous_warnings": anonymous_warnings,
        "disclaimer": "结果仅作辅助研判，不作为认定结论。须经辅导员谈心、民主评议和学校认定程序复核。",
    }

