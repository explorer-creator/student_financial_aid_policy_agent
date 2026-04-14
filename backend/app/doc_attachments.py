"""根据用户问题关键词，推荐可下载的 public/docs 静态文件（与前端 portalData 文件名一致）。"""

from __future__ import annotations

# (关键词子串列表, public/docs 下文件名, 展示名称)
_DOC_RULES: list[tuple[list[str], str, str]] = [
    (
        ["困难认定", "认定表", "家庭经济困难", "认定申请", "附表1"],
        "appendix1-difficulty-recognition-form.doc",
        "附表1：广东省家庭经济困难学生认定申请表（.doc）",
    ),
    (
        ["认定分析", "分析表", "附表2"],
        "appendix2-difficulty-analysis.xls",
        "附表2：广东省家庭经济困难学生认定分析表（.xls）",
    ),
    (
        ["助学贷款", "生源地贷款", "受理证明", "续贷", "贷款申请指南"],
        "student-origin-loan-guide.pdf",
        "《生源地助学贷款申请指南》（.pdf）",
    ),
    (
        ["国家奖助学金实施办法", "国奖", "励志", "助学金办法", "5367"],
        "gdut-national-scholarship-undergrad.docx",
        "《广东工业大学全日制本科学生国家奖助学金实施办法》（.docx）",
    ),
    (
        ["临时困难资助", "临时困难", "证明材料清单"],
        "gdut-temporary-hardship-aid.docx",
        "《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）（.docx）",
    ),
]

_MAX = 5


def suggest_doc_attachments(user_text: str) -> list[dict[str, str]]:
    t = user_text.strip()
    if not t:
        return []
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for keywords, filename, label in _DOC_RULES:
        if any(k in t for k in keywords):
            if filename not in seen:
                seen.add(filename)
                out.append({"label": label, "filename": filename})
        if len(out) >= _MAX:
            break
    return out
