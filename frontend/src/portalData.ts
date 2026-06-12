/** 门户页辅助数据 */

/** 构建时随 Vite `base` 变化，指向 `frontend/public/docs/` 下静态文件 */
export function docHref(file: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}docs/${file}`;
}

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
