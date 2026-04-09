/** 门户页：资助政策链接、校区联系（与后端 policy_context 公开信息一致，供前端展示） */

export type PolicyLinkItem = { label: string; href: string; note?: string };
export type PolicyLinkGroup = { title: string; items: PolicyLinkItem[] };

export const POLICY_LINK_GROUPS: PolicyLinkGroup[] = [
  {
    title: "总入口与系统",
    items: [
      { label: "学生资助管理中心", href: "https://zxdk.gdut.edu.cn/index.htm" },
      { label: "学工处（学生工作处）", href: "https://xsc.gdut.edu.cn/" },
      { label: "学生工作信息管理系统", href: "http://xsgl.gdut.edu.cn/" },
      { label: "迎新网 · 教学资讯（绿色通道等以当年栏目为准）", href: "https://yx.gdut.edu.cn/jxzx.htm" },
    ],
  },
  {
    title: "校级办法（学工处）",
    items: [
      {
        label: "《学生资助工作实施办法》（2025年9月修订）",
        href: "https://xsc.gdut.edu.cn/info/1039/5358.htm",
      },
      {
        label: "《全日制本科学生国家奖助学金实施办法》（2025年9月修订）",
        href: "https://xsc.gdut.edu.cn/info/1039/5367.htm",
      },
      {
        label: "《学生临时困难资助管理办法》",
        href: "https://xsc.gdut.edu.cn/info/1039/5422.htm",
      },
      { label: "勤工助学与三助一辅专栏", href: "https://xsc.gdut.edu.cn/xsgl/qgzxyszyf.htm" },
    ],
  },
  {
    title: "通知、下载与贷款",
    items: [
      { label: "资助中心 · 通知公告", href: "https://zxdk.gdut.edu.cn/index/tzgg/11.htm" },
      { label: "资助中心 · 下载中心", href: "https://zxdk.gdut.edu.cn/xzzx.htm" },
      { label: "资助中心 · 规章制度", href: "https://zxdk.gdut.edu.cn/index/gzzd.htm" },
      {
        label: "生源地助学贷款工作通知（示例，新学年以最新一篇为准）",
        href: "https://zxdk.gdut.edu.cn/info/1129/3051.htm",
      },
      {
        label: "贷款毕业生还款指南（生源地，示例）",
        href: "https://zxdk.gdut.edu.cn/info/1139/3008.htm",
      },
    ],
  },
  {
    title: "国家与省级（参考）",
    items: [
      { label: "全国学生资助管理中心", href: "https://www.xszz.edu.cn/" },
      { label: "教育部政府信息公开", href: "http://www.moe.gov.cn/" },
    ],
  },
];

export type CampusBlock = { title: string; lines: string[] };

export const CAMPUS_CONTACT_BLOCKS: CampusBlock[] = [
  {
    title: "校级学生资助管理中心",
    lines: [
      "业务范围：奖助学金、助学贷款等主咨询入口。",
      "办公地点：大学城校区生活区东十东座202室（以官网为准）。",
      "电话：020-39322619、020-39322610",
      "邮箱：xsczdb@gdut.edu.cn",
    ],
  },
  {
    title: "主要校区（地址为公开信息归纳）",
    lines: [
      "大学城校区（校本部）：广州市番禺区广州大学城外环西路100号",
      "东风路校区：广州市越秀区东风东路729号",
      "龙洞校区：广州市天河区迎龙路161号",
      "番禺校区：广州市番禺区钟村街市广路11号一带（以学校最新公布为准）",
      "沙河校区：广州市天河区先烈东路131号",
      "揭阳校区：广东省揭阳市粤东新城大学路1号（区号0663）",
    ],
  },
  {
    title: "各校区学工联系（转介参考，以学校官网为准）",
    lines: [
      "东风路校区 · 就业指导管理服务：020-37626136",
      "龙洞校区 · 学生就业指导中心：020-87082927",
      "揭阳校区 · 学生工作办公室：（0663）6603130",
      "番禺校区 · 学生工作办公室：020-31361917、020-31361920",
    ],
  },
];

/** 演示：事件处理进度示例数据（非真实工单） */
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
    title: "本科生国家助学金学院初审",
    type: "奖助评审",
    status: "学院审核中",
    updated: "2026-04-08",
  },
  {
    id: "ZD-2026-0138",
    title: "生源地贷款受理证明录入核对",
    type: "助学贷款",
    status: "待学生补材料",
    updated: "2026-04-07",
  },
  {
    id: "ZD-2026-0125",
    title: "临时困难资助申请",
    type: "应急资助",
    status: "资助中心复审",
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
