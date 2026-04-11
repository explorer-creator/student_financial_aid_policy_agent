"""
Generate docs/广工学工数智助手-模块功能说明.docx using only stdlib (zip + XML).
"""
from __future__ import annotations

import datetime
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
# 主文件名（中文）；另写一份英文名便于跨环境查找
OUT = ROOT / "docs" / "模块功能说明.docx"
OUT_EN = ROOT / "docs" / "module-features-overview.docx"


def p(text: str) -> str:
    return f'<w:p><w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'


def heading(text: str, level: int) -> str:
    # Word uses heading styles; simplified: bold run via w:b
    tag = "Heading1" if level == 1 else "Heading2" if level == 2 else "Heading3"
    return (
        f'<w:p><w:pPr><w:pStyle w:val="{tag}"/></w:pPr>'
        f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>'
    )


def body_paragraphs() -> str:
    today = datetime.date.today().isoformat()
    parts = [
        heading("广工学工数智助手 — 模块功能说明", 1),
        p(f"文档版本：与仓库 main 对应；生成日期：{today}"),
        p(
            "本系统为前后端分离演示：前端 React + Vite；后端 FastAPI。"
            "GitHub Pages 静态站为演示模式（VITE_DEMO_ONLY），不连接后端；"
            "本地联调需启动后端并配置 VITE_API_BASE。"
        ),
        heading("一、全局与界面", 2),
        p(
            "侧栏导航：智能工具、资助文件与政策、校区联系方式、数据看板、事件处理进度、反馈箱、后台管理平台。"
            "地址栏 #hash 与页面同步，便于收藏直达。"
        ),
        p(
            "主题切换：浅色正式版 / 深色夜间版，设置保存在浏览器 localStorage。"
        ),
        p(
            "页头：展示校徽、系统标题与副标题；平台概览卡片显示当前模式（静态演示/联调）、推荐入口与资助中心咨询电话。"
        ),
        heading("二、智能工具（侧栏「智能工具」）", 2),
        p(
            "以下为同一页内的功能 Tab，对应后端若干 API（联调时生效；静态演示为本地示例数据）。"
        ),
        heading("1. 7×24 政策问答", 3),
        p(
            "多轮对话，支持自然语言提问；可配置大模型后由后端生成回复。" 
            "静态演示下为固定说明与快捷主题按钮回复。"
        ),
        p(
            "快捷主题：助学贷款、奖学金条件、国家助学金与困难认定、勤工助学与绿色通道、公示异议与申诉、"
            "官方政策链接汇总、各校区与资助咨询电话等。"
        ),
        p("后端接口：POST /api/chat（联调模式）。"),
        heading("2. 资格审查", 3),
        p(
            "根据休学、严重违纪、困难生库与申请意向等字段做规则校验，输出全量结果与异常名单。"
            "请求体为 JSON（students 数组），适合演示批量跑批思路。"
        ),
        p("后端接口：POST /api/eligibility/screen。"),
        heading("3. 智能预警与推荐", 3),
        p(
            "（A）隐形贫困风险提示：基于月消费、同届中位、食堂占比等做启发式评分，辅助发现「低消费高刚性」群体（须与认定流程结合）。"
        ),
        p(
            "（B）免申即享 / 主动推送（规则演示）：勾选身份特征后给出可重点提醒的政策类型（非审批结果）。"
        ),
        p("后端接口：POST /api/insights/poverty-risk；POST /api/recommendations/auto。"),
        heading("4. 资助计算器", 3),
        p(
            "输入年级、GPA、排名百分位、困难等级、在库情况、身份特征等，按规则进行理论额度试算，"
            "并说明国家励志奖学金与国家助学金等可并行性（演示规则）。"
        ),
        p("后端接口：POST /api/calculator/aid-estimate。"),
        heading("5. 政策匹配与推送", 3),
        p(
            "根据成绩、困难认定、专利/竞赛、特长等筛选可申奖项；结合月份生成窗口期提醒清单；"
            "可加载政策窗口期归纳（演示）。"
        ),
        p(
            "后端接口：POST /api/match/awards；POST /api/push/reminders；GET /api/policy/windows。"
        ),
        heading("6. 预审机器人与看板", 3),
        p(
            "A. 隐形贫困识别辅助：按 JSON 行数据批量识别风险（演示）。"
            "B. 资格预审机器人：贫困库、成绩排名、违纪、休学等规则核对，输出符合条件与异常清单；支持导出 Excel（非静态站）。"
            "C. 数据看板：调用汇总接口展示申请进度、完成率等示例指标。"
        ),
        p(
            "后端接口：POST /api/hidden-poverty/detect；POST /api/precheck/run；"
            "POST /api/precheck/export.xlsx；GET /api/dashboard/summary。"
        ),
        heading("三、侧栏独立页面", 2),
        heading("1. 资助文件与政策", 3),
        p(
            "按分组列出学校及上级部门公开网页链接，便于一键跳转；文案提示以当年官网最新通知为准。"
        ),
        heading("2. 校区联系方式", 3),
        p(
            "多校区卡片展示电话、邮箱、地址等公开信息归纳；与学工处、资助中心官网对照使用。"
        ),
        heading("3. 数据看板", 3),
        p(
            "单独拉取 GET /api/dashboard/summary 结果展示；也可从智能工具内「预审与看板」进入完整能力。"
        ),
        heading("4. 事件处理进度", 3),
        p(
            "前端表格演示工单号、类型、摘要、状态与更新日期；正式环境需对接业务系统。"
        ),
        heading("5. 反馈箱", 3),
        p(
            "主题、内容与联系方式提交后暂存于本机 localStorage（演示）；生产环境应接入工单或邮件并遵守隐私。"
        ),
        heading("6. 后台管理平台", 3),
        p(
            "说明本应用为演示前端，不包含独立管理员后台；给出建议与跳转到预审、看板演示区的按钮。"
        ),
        heading("四、部署与模式说明", 2),
        p(
            "GitHub Pages：工作流构建 frontend，设置 VITE_DEMO_ONLY 与仓库子路径 BASE_PATH，产物为静态文件。"
        ),
        p(
            "Docker Compose：可一键前后端（及 nginx）联调，详见 README。"
        ),
        heading("五、免责声明", 2),
        p(
            "智能体与规则引擎输出均为基于公开政策归纳或演示规则，不构成审批结论；"
            "具体资格、金额、截止时间与材料以学校及学院当年正式通知为准。"
        ),
    ]
    return "".join(parts)


def build_document_xml() -> str:
    """Minimal WordprocessingML body."""
    body = body_paragraphs()
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>
"""


def build_styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/><w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>
"""


def build_content_types() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"""


def build_rels_root() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""


def build_rels_document() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""


def write_docx(path: Path) -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", build_content_types())
        z.writestr("_rels/.rels", build_rels_root())
        z.writestr("word/document.xml", build_document_xml())
        z.writestr("word/_rels/document.xml.rels", build_rels_document())
        z.writestr("word/styles.xml", build_styles_xml())


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    write_docx(OUT)
    write_docx(OUT_EN)
    print(f"Wrote {OUT}")
    print(f"Wrote {OUT_EN}")


if __name__ == "__main__":
    main()
