/** 门户页：资助政策链接（供前端展示） */

export type PolicyLinkItem = { label: string; href?: string; note?: string };
export type PolicyLinkGroup = { title: string; items: PolicyLinkItem[] };

/** 构建时随 Vite `base` 变化，指向 `frontend/public/docs/` 下静态文件 */
export function docHref(file: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}docs/${file}`;
}

export const POLICY_LINK_GROUPS: PolicyLinkGroup[] = [
  {
    title: "国家及省级权威政策文件（本站整理·智能问答依据）",
    items: [
      {
        label:
          "《关于调整高等教育阶段和高中阶段国家奖助学金政策的通知》（财教〔2024〕181号）",
        href: docHref("policies/policy-caijiao-2024-181.md"),
        note: "国奖 10000 元、国励 6000 元、国助平均 3700 元等",
      },
      {
        label: "《关于调整完善国家助学贷款有关政策的通知》（财教〔2024〕188号）",
        href: docHref("policies/policy-caijiao-2024-188.md"),
        note: "本专科贷款额度 20000 元/年、LPR 减 70BP",
      },
      {
        label: "《学生资助资金管理办法》（财教〔2021〕310号）核心节选",
        href: docHref("policies/policy-caijiao-2021-310.md"),
        note: "资助体系母本、兼得规则、管理职责",
      },
      {
        label: "《广东省学生资助资金管理实施办法》（粤财规〔2026〕1号）节选",
        href: docHref("policies/policy-yuecaigui-2026-1.md"),
        note: "广东省执行口径与分档标准",
      },
      {
        label: "《高等学校学生勤工助学管理办法（2018年修订）》（教财〔2018〕12号）",
        href: docHref("policies/policy-jiaocai-2018-12-work-study.md"),
        note: "固定岗按月、临时岗不低于 12 元/时",
      },
      {
        label: "高校本专科生教育阶段资助政策简介与综合问答",
        href: docHref("policies/policy-undergrad-subsidy-overview.md"),
        note: "奖贷助勤补免体系速查",
      },
    ],
  },
  {
    title: "表格与办事指南下载",
    items: [
      {
        label: "《生源地助学贷款申请指南》（.pdf）",
        href: docHref("student-origin-loan-guide.pdf"),
      },
      {
        label: "《广东省家庭经济困难学生认定申请表》（.doc）",
        href: docHref("appendix1-difficulty-recognition-form.doc"),
      },
      {
        label: "《广东省家庭经济困难学生认定分析表》（.xls）",
        href: docHref("appendix2-difficulty-analysis.xls"),
      },
      {
        label: "《全日制本科学生勤工助学管理办法》（.docx）",
        href: docHref("gdut-work-study-management.docx"),
      },
    ],
  },
];

export type CampusBlock = { title: string; lines: string[] };

/** 本平台不提供任何高校机构联系方式 */
export const CAMPUS_CONTACT_BLOCKS: CampusBlock[] = [];

export type EventTicket = {
  id: string;
  title: string;
  type: string;
  status: string;
  updated: string;
};

export const MOCK_EVENT_TICKETS: EventTicket[] = [
  {
    id: "ZD-2026-0142",
    title: "本科生国家助学金初审",
    type: "奖助评审",
    status: "审核中",
    updated: "2026-04-08",
  },
  {
    id: "ZD-2026-0138",
    title: "生源地贷款受理证明录入核对",
    type: "助学贷款",
    status: "待补材料",
    updated: "2026-04-07",
  },
  {
    id: "ZD-2026-0125",
    title: "临时困难资助申请",
    type: "应急资助",
    status: "复审中",
    updated: "2026-04-06",
  },
  {
    id: "ZD-2026-0111",
    title: "异议申诉（公示期）",
    type: "申诉",
    status: "已结案",
    updated: "2026-04-02",
  },
];
