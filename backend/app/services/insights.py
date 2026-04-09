"""消费画像与政策推荐（演示启发式）：生产环境需合规采集数据、脱敏与授权。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ConsumptionInput:
    student_id: str
    monthly_total_yuan: float
    cohort_median_yuan: float | None
    canteen_share: float  # 食堂支出占月消费比例 0~1
    essential_share: float | None = None  # 生活必需品占比 0~1，可选


@dataclass(frozen=True)
class PovertyRiskResult:
    student_id: str
    hidden_poverty_score: float  # 0~1
    level: str  # low | medium | high
    reasons: list[str]


def assess_hidden_poverty(c: ConsumptionInput) -> PovertyRiskResult:
    """简易规则：月总消费显著低于群体中枢且食堂占比高，可能提示「低消费高刚性」风险。"""
    reasons: list[str] = []
    score = 0.0

    if c.cohort_median_yuan and c.cohort_median_yuan > 0:
        ratio = c.monthly_total_yuan / c.cohort_median_yuan
        if ratio < 0.45:
            score += 0.45
            reasons.append("月消费总额明显低于同届估算中位水平，可能存在经济压力或极端节俭。")
        elif ratio < 0.65:
            score += 0.25
            reasons.append("月消费总额低于同届估算中位水平，建议结合困难认定数据复核。")

    if c.canteen_share >= 0.72:
        score += 0.35
        reasons.append("食堂支出占比较高，基本生活支出占比大。")

    if c.essential_share is not None and c.essential_share >= 0.85:
        score += 0.2
        reasons.append("生活必需品支出占比高，可结合家访或民主评议进一步核实。")

    score = min(1.0, score)
    if score >= 0.65:
        level = "high"
    elif score >= 0.35:
        level = "medium"
    else:
        level = "low"

    if not reasons:
        reasons.append("未触发隐形贫困启发式规则（演示）。")

    return PovertyRiskResult(
        student_id=c.student_id,
        hidden_poverty_score=round(score, 3),
        level=level,
        reasons=reasons,
    )


@dataclass(frozen=True)
class ProfileFlags:
    is_freshman: bool = False
    is_retired_soldier_undergrad: bool = False
    in_poverty_database: bool = False
    is_suspended: bool = False


def recommend_auto_policies(f: ProfileFlags) -> dict:
    """免申即享/主动服务类推荐（规则表，演示）。"""
    items: list[dict] = []

    if f.is_retired_soldier_undergrad and not f.is_suspended:
        items.append(
            {
                "policy": "本专科生退役士兵国家助学金",
                "type": "免申即享（按规定直接纳入）",
                "note": "全日制在校退役士兵本科生按规定享受国家助学金，标准以国家及学校执行为准。",
            }
        )

    if f.is_freshman and f.in_poverty_database:
        items.append(
            {
                "policy": "绿色通道 / 新生专项资助",
                "type": "主动服务",
                "note": "家庭经济困难新生可走绿色通道，并关注路费、生活费等专项资助通知（以当年申请条件为准）。",
            }
        )

    if f.in_poverty_database:
        items.append(
            {
                "policy": "国家助学金 / 勤工助学优先",
                "type": "主动推送",
                "note": "已在困难生库的，关注国家助学金申请时段；勤工助学岗位优先安排困难生。",
            }
        )

    if not items:
        items.append(
            {
                "policy": "无匹配免申即享规则",
                "type": "提示",
                "note": "可根据困难认定结果在申请窗口期申请国家助学金、助学贷款等。",
            }
        )

    return {
        "recommendations": items,
        "disclaimer": "演示推荐，非录取或审批结果。正式推送须遵守个人信息保护与学校流程。",
    }
