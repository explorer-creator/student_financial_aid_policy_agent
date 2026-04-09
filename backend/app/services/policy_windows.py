"""政策申请窗口期（归纳自常见高校节奏，演示用；每年以广工正式通知为准）。"""

from __future__ import annotations

# alert_months: 建议主动提醒的月份（1-12）
POLICY_WINDOWS: list[dict] = [
    {
        "window_id": "national_annual_review",
        "title": "本专科国家奖学金、国家励志奖学金、国家助学金（学年申请/评审）",
        "category": "national",
        "typical_period_text": "每年约 9 月—10 月（如 9 月 30 日前个人申请等，以当年通知为准）",
        "alert_months": [9, 10],
        "award_ids": [
            "national_scholarship",
            "national_encouragement",
            "national_grant",
            "soldier_grant",
        ],
    },
    {
        "window_id": "difficulty_recognition",
        "title": "家庭经济困难学生认定（申请国家助学金等的前置环节）",
        "category": "school",
        "typical_period_text": "每学年开学初，常与奖助学金申请衔接（以学院通知为准）",
        "alert_months": [9, 10],
        "award_ids": ["national_grant", "national_encouragement"],
    },
    {
        "window_id": "green_channel",
        "title": "新生入学「绿色通道」",
        "category": "school",
        "typical_period_text": "新生报到期间（通常 8 月底—9 月初）",
        "alert_months": [8, 9],
        "award_ids": ["green_channel"],
    },
    {
        "window_id": "source_loan_before_term",
        "title": "生源地信用助学贷款（入学前办理）",
        "category": "national",
        "typical_period_text": "暑假至开学前在户籍地办理；返校后提交受理证明（如 9 月中旬前）",
        "alert_months": [7, 8, 9],
        "award_ids": ["source_loan"],
    },
    {
        "window_id": "school_scholarship_review",
        "title": "校内奖学金、综合测评与奖学金评定",
        "category": "school",
        "typical_period_text": "每学年综合测评后，一般 9—11 月分批开展（以学院通知为准）",
        "alert_months": [9, 10, 11],
        "award_ids": [
            "school_excellent",
            "school_study_pacesetter",
            "school_progress",
            "school_innovation",
            "school_art_elite",
            "school_social_elite",
        ],
    },
    {
        "window_id": "social_scholarship",
        "title": "社会奖助学金（校院捐赠类）",
        "category": "social",
        "typical_period_text": "全年多批次，常见集中在 9—12 月及春季（以捐赠方年度通知为准）",
        "alert_months": [9, 10, 11, 12, 3, 4],
        "award_ids": [
            "social_miya",
            "social_37",
            "social_rongjiang",
            "social_zhongming",
            "social_shiyuan",
            "social_jushi",
        ],
    },
]


def list_windows() -> list[dict]:
    return POLICY_WINDOWS
