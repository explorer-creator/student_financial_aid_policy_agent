/** 与后端 doc_attachments 规则对齐：静态站无 API 时仍可按关键词给出下载链接 */

export type DocAttachmentHint = { label: string; filename: string };

const RULES: { keywords: string[]; filename: string; label: string }[] = [
  {
    keywords: ["困难认定", "认定表", "家庭经济困难", "认定申请", "附表1"],
    filename: "appendix1-difficulty-recognition-form.doc",
    label: "附表1：广东省家庭经济困难学生认定申请表（.doc）",
  },
  {
    keywords: ["认定分析", "分析表", "附表2"],
    filename: "appendix2-difficulty-analysis.xls",
    label: "附表2：广东省家庭经济困难学生认定分析表（.xls）",
  },
  {
    keywords: ["资助工作实施办法", "学生资助工作", "资助办法", "5358"],
    filename: "gdut-student-aid-regulation.doc",
    label: "《广东工业大学学生资助工作实施办法》（.doc）",
  },
  {
    keywords: ["国家奖助学金实施办法", "国奖", "励志", "助学金办法", "5367"],
    filename: "gdut-national-scholarship-undergrad.docx",
    label: "《广东工业大学全日制本科学生国家奖助学金实施办法》（.docx）",
  },
  {
    keywords: ["临时困难", "临时资助", "5422"],
    filename: "gdut-temporary-hardship-aid.docx",
    label: "《广东工业大学学生临时困难资助管理办法》（.docx）",
  },
  {
    keywords: ["勤工助学", "勤工", "三助", "岗位"],
    filename: "gdut-work-study-management.docx",
    label: "《广东工业大学全日制本科学生勤工助学管理办法》（.docx）",
  },
  {
    keywords: ["应用说明", "ppt", "智能体", "aigc"],
    filename: "aigc-app-ppt.docx",
    label: "《广工学工数智助手》应用说明（.docx）",
  },
  {
    keywords: ["网络", "通信", "前后端"],
    filename: "network-communication-ppt.md",
    label: "前后端与网络层通信说明（.md）",
  },
];

const MAX = 5;

export function suggestPolicyDocAttachments(userText: string): DocAttachmentHint[] {
  const t = userText.trim();
  if (!t) return [];
  const seen = new Set<string>();
  const out: DocAttachmentHint[] = [];
  for (const r of RULES) {
    if (r.keywords.some((k) => t.includes(k))) {
      if (!seen.has(r.filename)) {
        seen.add(r.filename);
        out.push({ label: r.label, filename: r.filename });
      }
    }
    if (out.length >= MAX) break;
  }
  return out;
}
