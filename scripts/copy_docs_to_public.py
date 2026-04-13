"""Copy selected docs/ files into frontend/public/docs/ with stable ASCII filenames.

Run from repo root: python scripts/copy_docs_to_public.py
(Use a working Python 3; copies are also committed under frontend/public/docs/.)
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs")
DST = os.path.join(ROOT, "frontend", "public", "docs")

MAPPING: list[tuple[str, str]] = [
    ("高校智能体AIGC应用说明-PPT文稿.md", "aigc-app-ppt.md"),
    ("前后端与网络层通信-PPT图表.md", "network-communication-ppt.md"),
    ("高校智能体AIGC应用说明-PPT文稿.docx", "aigc-app-ppt.docx"),
    ("广东工业大学学生资助工作实施办法 (1).doc", "gdut-student-aid-regulation.doc"),
    ("广东工业大学全日制本科生国家奖助学金实施办法 (1).docx", "gdut-national-scholarship-undergrad.docx"),
    ("广东工业大学全日制本科学生勤工助学管理办法 (1).docx", "gdut-work-study-management.docx"),
    ("附表1：广东省家庭经济困难学生认定申请表.doc", "appendix1-difficulty-recognition-form.doc"),
    ("附表2：广东省家庭经济困难学生认定分析表.xls", "appendix2-difficulty-analysis.xls"),
    ("《广东工业大学学生临时困难资助管理办法》 .docx", "gdut-temporary-hardship-aid.docx"),
]


def main() -> None:
    os.makedirs(DST, exist_ok=True)
    for src_name, dest_name in MAPPING:
        src_path = os.path.join(SRC, src_name)
        if not os.path.isfile(src_path):
            alt = os.path.join(SRC, "《广东工业大学学生临时困难资助管理办法》 (1).docx")
            if dest_name == "gdut-temporary-hardship-aid.docx" and os.path.isfile(alt):
                shutil.copy2(alt, os.path.join(DST, dest_name))
                print(f"OK {dest_name} (alternate filename)")
            else:
                print(f"SKIP (missing): {src_name}")
            continue
        shutil.copy2(src_path, os.path.join(DST, dest_name))
        print(f"OK {dest_name}")


if __name__ == "__main__":
    main()
