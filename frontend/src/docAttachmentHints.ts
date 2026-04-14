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
    keywords: ["助学贷款", "生源地贷款", "受理证明", "续贷", "贷款申请指南"],
    filename: "student-origin-loan-guide.pdf",
    label: "《生源地助学贷款申请指南》（.pdf）",
  },
  {
    keywords: ["国家奖助学金实施办法", "国奖", "励志", "助学金办法", "5367"],
    filename: "gdut-national-scholarship-undergrad.docx",
    label: "《广东工业大学全日制本科学生国家奖助学金实施办法》（.docx）",
  },
  {
    keywords: ["临时困难资助", "临时困难", "证明材料清单"],
    filename: "gdut-temporary-hardship-aid.docx",
    label: "《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）（.docx）",
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
