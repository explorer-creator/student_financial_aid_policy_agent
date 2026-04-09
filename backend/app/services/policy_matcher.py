"""政策/奖项个性化匹配（演示规则）：国家、校内、社会三类，条件可配置。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.services.calculator import DifficultyLevel
from app.services.policy_windows import POLICY_WINDOWS

CompetitionLevel = Literal["none", "provincial", "national"]


@dataclass(frozen=True)
class StudentMatchProfile:
    grade: int = 1
    gpa: float = 3.0
    rank_percent: float | None = None
    in_poverty_database: bool = False
    difficulty_level: DifficultyLevel = DifficultyLevel.NONE
    is_undergraduate: bool = True
    is_freshman: bool = False
    is_retired_soldier_undergrad: bool = False
    has_patent: bool = False
    competition_level: CompetitionLevel = "none"
    has_art_performance_award: bool = False
    has_social_practice_award: bool = False
    has_major_disciplinary: bool = False
    is_suspended: bool = False


def _rank_ok(max_pct: float | None, need: float) -> bool:
    if max_pct is None:
        return False
    return max_pct <= need


def match_awards(p: StudentMatchProfile) -> dict:
    if p.is_suspended:
        return {
            "matches": [],
            "not_matched": [],
            "summary": {"national_count": 0, "school_count": 0, "social_count": 0},
            "block_reason": "休学状态下多数奖助学金与贷款申请需按学校规定暂停或另行处理，请以当年通知为准。",
            "disclaimer": "演示匹配引擎，最终以广东工业大学及学院评审与公示为准。",
        }

    matched: list[dict] = []
    not_matched: list[dict] = []

    def add(
        award_id: str,
        name: str,
        category: str,
        eligible: bool,
        score: int,
        reason: str,
        extra: str | None = None,
    ) -> None:
        row = {
            "award_id": award_id,
            "name": name,
            "category": category,
            "fit_score": score,
            "eligible": eligible,
            "reason": reason,
            "note": extra,
        }
        if eligible:
            matched.append(row)
        else:
            not_matched.append(row)

    # —— 国家 ——
    ns = (
        p.is_undergraduate
        and p.grade >= 2
        and p.gpa >= 3.5
        and _rank_ok(p.rank_percent, 10)
        and not p.has_major_disciplinary
    )
    add(
        "national_scholarship",
        "国家奖学金",
        "national",
        ns,
        95 if ns else 20,
        "二年级及以上、学业与综合表现突出；演示门槛：GPA≥3.5 且排名前约10%。",
        "与国励不可兼得。",
    )

    ne = (
        p.is_undergraduate
        and p.grade >= 2
        and p.in_poverty_database
        and p.gpa >= 3.0
        and (p.rank_percent is None or p.rank_percent <= 35)
        and not p.has_major_disciplinary
    )
    add(
        "national_encouragement",
        "国家励志奖学金",
        "national",
        ne,
        92 if ne else 25,
        "品学兼优且家庭经济困难；演示门槛：困难认定 + GPA≥3.0 + 排名不过于靠后。",
        "可与国家助学金同时申请（同一学年不可与国奖兼得）。",
    )

    ng = p.in_poverty_database and not p.has_major_disciplinary
    add(
        "national_grant",
        "国家助学金",
        "national",
        ng,
        90 if ng else 15,
        "经困难认定后可申请；金额按学校分档。",
        None,
    )

    add(
        "source_loan",
        "生源地信用助学贷款",
        "national",
        p.in_poverty_database,
        78 if p.in_poverty_database else 35,
        "家庭经济困难学生可申请；额度以国家规定上限为准。",
        "未认定困难也可关注地方政策；是否批贷以经办银行为准。",
    )

    if p.is_freshman and p.in_poverty_database:
        add(
            "green_channel",
            "绿色通道（入学）",
            "school",
            True,
            88,
            "家庭经济困难新生可缓缴学费先办理入学。",
            None,
        )
    else:
        add(
            "green_channel",
            "绿色通道（入学）",
            "school",
            False,
            0,
            "仅新生入学场景适用。",
            None,
        )

    if p.is_retired_soldier_undergrad:
        add(
            "soldier_grant",
            "退役士兵国家助学金（本科）",
            "national",
            True,
            93,
            "全日制在校退役士兵本科生按规定享受国家助学金。",
            None,
        )

    # —— 校内（与综合测评、特长挂钩的演示规则）——
    add(
        "school_excellent",
        "优秀学生奖学金等（校内）",
        "school",
        p.gpa >= 3.0 and not p.has_major_disciplinary,
        75 if p.gpa >= 3.0 else 30,
        "依综合测评与学校评定办法，学业与表现优良。",
        "具体奖项名称与比例以学院当年通知为准。",
    )
    add(
        "school_study_pacesetter",
        "学习标兵奖学金",
        "school",
        p.gpa >= 3.7 and _rank_ok(p.rank_percent, 15),
        80,
        "学业成绩突出；演示：GPA≥3.7 且排名靠前。",
        None,
    )
    add(
        "school_progress",
        "学业进步奖学金",
        "school",
        p.gpa >= 2.5,
        55,
        "学业进步明显者可参评（演示为宽松门槛）。",
        None,
    )
    innov = p.has_patent or p.competition_level in ("provincial", "national")
    add(
        "school_innovation",
        "学生创新奖学金",
        "school",
        innov,
        85 if innov else 25,
        "创新创业、专利或竞赛成果突出者优先。",
        "有专利或省国赛获奖更匹配。",
    )
    add(
        "school_art_elite",
        "校园文艺菁英奖学金",
        "school",
        p.has_art_performance_award,
        82 if p.has_art_performance_award else 20,
        "文艺表现突出、获校级以上相关荣誉者更匹配。",
        None,
    )
    add(
        "school_social_elite",
        "社会实践菁英奖学金",
        "school",
        p.has_social_practice_award,
        82 if p.has_social_practice_award else 20,
        "社会实践与志愿服务表现突出者更匹配。",
        None,
    )

    # —— 社会（简化：困难+成绩/综合）——
    social_base = p.in_poverty_database and p.gpa >= 3.0
    for aid, title in [
        ("social_miya", "米亚奖学金等"),
        ("social_37", "三七互娱大学生赋能奖助学金等"),
        ("social_rongjiang", "榕江奖学金等"),
        ("social_zhongming", "仲明大学生助学金等"),
        ("social_shiyuan", "视源优秀学生奖学金等"),
        ("social_jushi", "聚石化学奖学金等"),
    ]:
        add(
            aid,
            title,
            "social",
            social_base,
            68 if social_base else 22,
            "社会捐赠类奖助学金：通常要求品学兼优或家庭经济困难，以当年评选通知为准。",
            "名额有限，以学院分配与评审为准。",
        )

    matched.sort(key=lambda x: -x["fit_score"])

    return {
        "matches": matched,
        "not_matched": not_matched,
        "summary": {
            "national_count": sum(1 for m in matched if m["category"] == "national"),
            "school_count": sum(1 for m in matched if m["category"] == "school"),
            "social_count": sum(1 for m in matched if m["category"] == "social"),
        },
        "disclaimer": "演示匹配引擎，最终以广东工业大学及学院当年评审条件与公示为准。",
    }


def build_push_reminders(p: StudentMatchProfile, month: int) -> dict:
    """结合匹配结果与窗口期，生成「当前月份应提醒」的政策列表。"""
    mres = match_awards(p)
    matched_ids = {x["award_id"] for x in mres["matches"]}
    reminders: list[dict] = []

    for win in POLICY_WINDOWS:
        overlap = [aid for aid in win["award_ids"] if aid in matched_ids]
        if not overlap:
            continue
        in_window = month in win["alert_months"]
        urgency = "active" if in_window else "prepare"
        reminders.append(
            {
                "window_id": win["window_id"],
                "title": win["title"],
                "typical_period": win["typical_period_text"],
                "alert_months": win["alert_months"],
                "current_month": month,
                "in_alert_window": in_window,
                "urgency": urgency,
                "matched_award_ids": overlap,
                "push_hint": (
                    "当前处于常见申请窗口，请关注学院/资助中心通知并及时提交材料。"
                    if in_window
                    else "当前不在集中提醒月，仍可提前准备材料，并留意下一批次通知。"
                ),
            }
        )

    reminders.sort(key=lambda x: (0 if x["in_alert_window"] else 1, x["title"]))

    return {
        "reference_month": month,
        "reminders": reminders,
        "matched_awards_count": len(mres["matches"]),
        "disclaimer": "推送为演示逻辑；真实消息推送需对接消息中心并尊重学生订阅与隐私合规。",
    }
