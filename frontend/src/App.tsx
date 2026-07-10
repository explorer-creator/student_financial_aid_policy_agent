import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { IntegrityPanel } from "./IntegrityPanel";
import {
  CAMPUS_CONTACT_BLOCKS,
  MOCK_EVENT_TICKETS,
} from "./portalData";
import { HonggeLingjingPanel } from "./HonggeLingjingPanel";
import { FraudPreventionPanel } from "./FraudPreventionPanel";
import { ToolResultVisual } from "./toolResultVisual";

type Role = "user" | "assistant";
/** 本地 `public/docs` 用 `filename`；学校官网下载页等用 `href` */
type Msg = { role: Role; content: string };
type Tab = "screen" | "insights" | "calculator" | "match" | "ops";

/** 侧栏一级页面（#hash 同步，便于收藏） */
type MainView =
  | "chat"
  | "tools"
  | "contacts"
  | "dashboard"
  | "events"
  | "feedback"
  | "admin"
  | "soul_window"
  | "hongge"
  | "anti_fraud";

const MAIN_VIEW_ORDER: MainView[] = [
  "chat",
  "anti_fraud",
  "soul_window",
  "hongge",
  "feedback",
];

const AVATAR_SRC = `${import.meta.env.BASE_URL}gdut-avatar.png`;

function truncateDashboardErr(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** 解析 FastAPI/Starlette 的 JSON 错误体，避免只显示「请求失败 (HTTP 500)」 */
function dashboardFetchErrorHint(body: string, status: number): string {
  const t = body.trim();
  if (!t) {
    return `请求失败（HTTP ${status}）：响应体为空。请在后端终端查看报错，并确认本机已启动 API（如 uvicorn app.main:app --reload --port 8000）；开发前端时 Vite 会把 /api 代理到 127.0.0.1:8000。`;
  }
  if (t.startsWith("{")) {
    try {
      const j = JSON.parse(t) as { detail?: unknown };
      if (j && "detail" in j) {
        const d = j.detail;
        if (typeof d === "string") return truncateDashboardErr(d, 520);
        if (Array.isArray(d)) {
          const parts = d.map((item) => {
            if (typeof item === "object" && item !== null && "msg" in item) {
              return String((item as { msg: unknown }).msg);
            }
            return String(item);
          });
          return truncateDashboardErr(parts.join("；"), 520);
        }
        if (d != null) return truncateDashboardErr(String(d), 520);
      }
    } catch {
      /* 非 JSON，继续 */
    }
  }
  if (
    t.startsWith("<!") ||
    /<html[\s>]/i.test(t) ||
    /<!doctype/i.test(t)
  ) {
    return `无法加载看板（HTTP ${status}）：服务器返回了网页而不是 JSON。请确认后端已启动，且 VITE_API_BASE 指向正确 API（开发环境常见为 http://127.0.0.1:8000）。`;
  }
  return truncateDashboardErr(t, 400) || `请求失败（HTTP ${status}）`;
}

function AgentAvatar({ className, alt }: { className: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`${className} avatar-fallback`} role="img" aria-label={alt}>
        广
      </span>
    );
  }

  return (
    <img
      className={className}
      src={AVATAR_SRC}
      alt={alt}
      onError={() => setFailed(true)}
      loading="eager"
      decoding="async"
    />
  );
}

function mainViewFromHash(): MainView {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw || raw === "policy") return "chat";
  return MAIN_VIEW_ORDER.includes(raw as MainView) ? (raw as MainView) : "chat";
}

const QUICK_TOPICS_VISIBLE_KEY = "gdut_aid_quick_topics_visible";
/** 同一会话内仅首次进入展示欢迎层，关闭后写入 sessionStorage */
const WELCOME_SPLASH_KEY = "gdut_welcome_splash_seen";

function readQuickTopicsVisible(): boolean {
  try {
    return localStorage.getItem(QUICK_TOPICS_VISIBLE_KEY) !== "0";
  } catch {
    return true;
  }
}

/** 防止 .env 误粘贴「https://http://…」或中文说明导致 fetch 拼错 URL */
function normalizeApiBase(raw: string | undefined): string {
  if (!raw) return "";
  let s = String(raw).trim();
  while (/^https?:\/\/https?:\/\//i.test(s)) {
    s = s.replace(/^https?:\/\//i, "");
  }
  const cut = s.search(/[\s\uFF08（]/);
  if (cut > 0) s = s.slice(0, cut);
  return s.replace(/\/+$/, "");
}

/** 开发态用相对路径 /api，走 Vite 代理到 8000，避免 localhost 页面请求 127.0.0.1 触发跨域 Failed to fetch */
const apiBase = import.meta.env.DEV
  ? ""
  : normalizeApiBase(import.meta.env.VITE_API_BASE);
/** 本地 npm run dev 一律走联调：避免本机/系统环境变量里残留的 VITE_DEMO_ONLY=true 覆盖 .env */
const isStaticDemo =
  import.meta.env.DEV ? false : import.meta.env.VITE_DEMO_ONLY === "true";

/** 生产构建若未设置 VITE_API_BASE，fetch 会请求当前站点下的 /api/…，静态服务器无此路由 → 404 */

const DEFAULT_SCREEN_JSON = `{
  "students": [
    {
      "student_id": "2021001",
      "name": "示例甲",
      "is_suspended": false,
      "has_major_disciplinary": false,
      "in_poverty_database": true,
      "intent": "national_grant"
    },
    {
      "student_id": "2021002",
      "name": "示例乙",
      "is_suspended": true,
      "has_major_disciplinary": false,
      "in_poverty_database": true,
      "intent": "national_grant"
    },
    {
      "student_id": "2021003",
      "name": "示例丙",
      "is_suspended": false,
      "has_major_disciplinary": true,
      "in_poverty_database": true,
      "intent": "national_encouragement"
    }
  ]
}`;

const DEFAULT_HIDDEN_JSON = `{
  "rows": [
    {
      "student_id": "2023001",
      "grade": "2023级",
      "major": "计算机科学与技术",
      "in_poverty_database": false,
      "canteen_monthly_yuan": 420,
      "canteen_monthly_freq": 52,
      "supermarket_monthly_yuan": 40,
      "workstudy_apply_count": 1,
      "cohort_monthly_median_yuan": 1300
    }
  ]
}`;

const DEFAULT_PRECHECK_JSON = `{
  "rows": [
    {
      "student_id": "2021001",
      "name": "示例甲",
      "college": "示例院系A",
      "major": "软件工程",
      "grade": "2021级",
      "rank_percent": 8,
      "is_suspended": false,
      "has_major_disciplinary": false,
      "in_poverty_database": true,
      "intent": "national_encouragement"
    },
    {
      "student_id": "2021002",
      "name": "示例乙",
      "college": "示例院系B",
      "major": "机械工程",
      "grade": "2021级",
      "rank_percent": 55,
      "is_suspended": true,
      "has_major_disciplinary": false,
      "in_poverty_database": true,
      "intent": "national_grant"
    }
  ]
}`;

async function postChat(
  messages: { role: string; content: string }[],
  opts?: { appScope?: "policy" | "soul_window" },
) {
  const body: Record<string, unknown> = {
    messages,
    app_scope: opts?.appScope ?? "policy",
  };
  const res = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `请求失败 ${res.status}`);
  }
  return res.json() as Promise<{
    reply: string;
    mode: string;
  }>;
}

const ASSISTANT_INTRO =
  "你好，我是「砺志励行小助手」里的资助政策咨询入口。\n\n" +
  "我可以协助你了解国家与常见高校层面的奖助学金、助学贷款、绿色通道、勤工助学、困难认定与申诉渠道等信息。回答基于公开政策归纳，个人能否获评、具体金额与时间，请以你就读高校当年正式通知为准。\n\n" +
  "本助手不提供任何高校机构联系方式，也不代表某一所高校官方意见。更多栏目（辨诈防骗、砺心立志、守信立德、暖心润情等）在侧栏菜单。";

const ASSISTANT_SECOND =
  "你可以点击下方快捷主题，或在输入框自由提问。";

const SOUL_WINDOW_INTRO =
  "你好，欢迎来到「暖心润情」。\n\n" +
  "你可以在这里聊聊情绪、压力、人际或自我认同等话题。我会尽量温暖、耐心地回应，并陪你一起梳理感受。\n\n" +
  "重要说明：本次对话不能替代心理咨询、精神科诊疗或危机干预；不用于诊断或开药。";

const SOUL_WINDOW_SECOND =
  "若你感到难以承受、出现自伤自杀念头或正在面临紧迫危险，请立即联系身边信任的人，拨打 110 / 120，并前往当地正规医疗机构心理科/精神科获得专业帮助。本栏目已启用安全护栏，不能提供自伤/自杀相关方法，也不能替代专业咨询。";

const SOUL_QUICK_TOPICS: { id: string; label: string; text: string }[] = [
  { id: "exam", label: "考试焦虑睡不着", text: "最近考试周压力很大，晚上睡不着，脑子一直转，我该怎么缓解？" },
  { id: "peer", label: "和室友相处困难", text: "和室友经常有小摩擦，感觉很压抑，又不想把关系搞僵，怎么办？" },
  { id: "future", label: "对未来很迷茫", text: "对未来特别迷茫，不知道自己适合做什么，觉得很空虚。" },
  { id: "home", label: "想家又不敢说", text: "在外读书很想家，但不敢跟家里说怕他们担心，自己憋着很难受。" },
];

type QuickOption = {
  id: string;
  label: string;
  reply: string;
};

const QUICK_OPTIONS: QuickOption[] = [
  {
    id: "loan",
    label: "国家助学贷款如何申请？",
    reply:
      "【国家助学贷款如何申请】\n\n" +
      "一、学生申请\n" +
      "有贷款需求的学生请在入学前到户籍所在县（区）教育局或生源地资助中心办理国家助学贷款，签订合同，领取《生源地信用助学贷款受理证明》（以下简称《受理证明》）。国家助学贷款额度为本科生最高20000元，研究生最高25000元，可用于缴纳学费、住宿费和弥补生活费等。国家开发银行已开通线上续贷功能，续贷学生一般无需到场，办理成功后请打印《受理证明》待入学后提交。\n\n" +
      "二、返校提交\n" +
      "贷款学生返校后需按就读高校当年通知提交《受理证明》，空白处注明学号与联系方式。具体提交方式、时间与绿色通道安排以就读高校正式通知为准。\n\n" +
      "三、缴费处理\n" +
      "1. 贷款学生原则上只需缴纳超出贷款金额部分的欠费，剩余欠款待贷款到账后由高校统一抵扣，无需提前全额缴纳。\n" +
      "2. 助学贷款一般在11月前后由贷款银行拨付至高校账户，再由高校财务部门抵扣欠费；如有结余，通常在第一学期末退回至学生银行卡。请确保在高校财务系统绑定本人有效一类银行卡。\n\n" +
      "相关文件：《生源地助学贷款申请指南》（.pdf）",
  },
  {
    id: "scholarship",
    label: "国家奖助学金有哪些？",
    reply:
      "【国家奖助学金有哪些】\n\n" +
      "（一）本科生国家奖学金\n" +
      "奖励对象是普通高校全日制本科二年级及以上优秀在校学生，奖励标准为每生每年10000元。同一学年内，获得国家奖学金的家庭经济困难学生可以同时申请并获得国家助学金，但不能同时获得国家励志奖学金。\n\n" +
      "（二）本科生国家励志奖学金\n" +
      "奖励对象是品学兼优、家庭经济困难的二年级及以上的普通高校全日制本科在校生，奖励标准为每生每年6000元。同一学年内，获得国家励志奖学金的家庭经济困难学生可以同时申请并获得国家助学金，但不能同时获得国家奖学金。\n\n" +
      "（三）本科生国家助学金\n" +
      "资助对象是家庭经济困难的普通高校全日制本科在校学生（含预科生），平均资助标准为每生每年3700元，具体标准由学校在每生每年2500-5000元范围内确定，分为2-3档。全日制在校退役士兵学生原则上都可享受本科生国家助学金，资助标准为每生每年3700元。\n\n" +
      "相关文件：\n" +
      "1. 国家及就读高校奖助学金实施办法（以当年正式文件为准）",
  },
  {
    id: "grant",
    label: "家庭经济困难认定如何申请？",
    reply:
      "【家庭经济困难认定如何申请】\n\n" +
      "依据《广东省家庭经济困难学生认定实施办法》（粤教助〔2023〕2号）及国家相关文件精神，高校家庭经济困难认定一般按以下程序开展（具体以就读高校当年通知为准）：\n\n" +
      "一、认定对象：就读高校的全日制本专科生、研究生等（以高校规定为准）。\n\n" +
      "二、认定程序（常见流程）\n" +
      "（一）学生申请：学生对照本人情况如实填写《广东省家庭经济困难学生认定申请表》，并准备户口本复印件及相关证明材料。\n" +
      "（二）班级/年级评议：评议小组按《指标解释》审核材料，初步认定并在一定范围内公示。\n" +
      "（三）院系审核：院系认定工作小组复核并公示。\n" +
      "（四）学校评审：学校组织交叉评审，学生应留意审核结果并及时补正材料。\n" +
      "（五）名单确定：经公示无异议后，确定当学年家庭经济困难学生名单及认定等级。\n\n" +
      "三、注意事项\n" +
      "1. 自愿申请，诚实提交；特殊群体学生放弃申请需提供书面说明。\n" +
      "2. 严禁弄虚作假，一经查实将追回资助并按相关规定处理。\n" +
      "3. 申请材料应妥善归档保存。\n\n" +
      "相关文件：\n" +
      "1. 《广东省家庭经济困难学生认定申请表》\n" +
      "2. 《广东省家庭经济困难学生认定分析表》\n" +
      "3. 《广东省家庭经济困难学生认定工作指标解释》",
  },
  {
    id: "temp_hardship",
    label: "临时困难资助如何申请？",
    reply:
      "【临时困难资助如何申请】\n\n" +
      "许多高校设有临时困难资助项目，用于帮助学生度过在校期间遇到的临时性或突发性困难。一般要求已办理注册手续、遵守校纪校规，且出现影响基本学习生活的经济困难。\n\n" +
      "常见评审程序（以就读高校当年办法为准）：\n" +
      "（一）学生提交申请表及相关证明材料；\n" +
      "（二）院系初审并公示；\n" +
      "（三）学校复审并公示；\n" +
      "（四）财务部门统一发放至学生银行账户。\n\n" +
      "具体申请条件、金额标准与表格版本请以就读高校当年正式通知为准。",
  },
  {
    id: "military_funding",
    label: "服义务兵役学费补偿贷款代偿如何申请？",
    reply:
      "【服义务兵役学费补偿贷款代偿及学费资助（示例：2025年工作口径，新学年以学校最新通知为准）】\n\n" +
      "为推进国防和军队现代化建设，鼓励高等学校学生积极应征入伍服义务兵役，提高兵员征集质量，根据《财政部 教育部 人力资源社会保障部 退役军人部 中央军委国防动员部关于印发〈学生资助资金管理办法〉的通知》（财教〔2021〕310号）和有关实施细则要求，现就学生服义务兵役学费补偿贷款代偿及学费资助有关事宜说明如下（年度与时间以当年学校正式通知为准）。\n\n" +
      "一、资助项目\n" +
      "（一）应征入伍服义务兵役教育资助\n" +
      "1. 在校生应征入伍服义务兵役学费补偿、国家助学贷款代偿，退役复学后学费减免。对应征入伍服义务兵役的高校在校学生，在入伍当年对其在校期间缴纳的学费实行一次性补偿或对于国家助学贷款用于学费部分的款项实行代偿，退役后自愿复学继续完成剩余年限学业的，分年度实施学费减免。\n" +
      "2. 大学新生应征入伍，退役后学费减免。对于考入高等学校后当年应征入伍的大学新生，服役期间按国家有关规定保留学籍或入学资格、退役后自愿复学的，分年度实施学费减免。\n" +
      "3. 应、往届毕业生应征入伍学费补偿、国家助学贷款代偿。大学毕业生应征入伍，入伍时对其在校期间缴纳的学费实行一次性补偿或对于国家助学贷款用于学费部分的款项实行代偿。\n" +
      "（二）直接招收为士官教育资助\n" +
      "国家对直接招收为士官的高等学校学生，入伍时对其在校期间缴纳的学费实行一次性补偿或对于国家助学贷款用于学费部分的款项实行代偿。\n" +
      "（三）退役后考入高等学校教育资助\n" +
      "国家对自主就业，通过全国统一高考或高职单招考入高等学校并到校报到入学新生（即退役入学学生），分年度实施学费减免。\n" +
      "（四）退役士兵国家助学金\n" +
      "全日制在校退役士兵学生全部享受本科生国家助学金，每学期申请一次。此次申请对象为2025-2026学年秋季学期在校的全日制本科退役士兵学生（年度以学校最新通知为准）。\n" +
      "（五）不列为本项目资助对象的高校学生包括：\n" +
      "1.在校期间已通过其他方式免除全部学费的；\n" +
      "2.定向生（定向培养士官除外）、委培生和国防生；\n" +
      "3.其他不属于服义务兵役或招收士官到部队入伍的；\n" +
      "4.应征入伍服义务兵役国家资助的往届毕业生，不追溯至政策实施起始年（2013年）之前。\n" +
      "5.直招士官国家资助的往届毕业生，不追溯政策实施起始年（2015年）之前。\n" +
      "6.退役士兵国家助学金资助的在校退役士兵学生，不追溯2025-2026学年秋季学期之前。\n\n" +
      "二、资助标准\n" +
      "（一）服兵役高等学校学生国家教育资助的学费补偿、国家助学贷款代偿以及学费减免的标准，本科每生每年最高不超过20000元，研究生每生每年最高不超过25000元（但2023年9月1日-2024年8月31日期间入伍、退役复学、退役入学的学生，按本科每生每年最高不超过16000元、研究生每生每年最高不超过20000元的标准执行；2022年1月24日-2023年8月31日期间入伍、退役复学、退役入学的学生，按本科每生每年最高不超过12000元、研究生每生每年最高不超过16000元的标准执行；2022年1月24日前入伍、退役复学、退役入学的学生，按本科每生每年最高不超过8000元、研究生每生每年最高不超过12000元的标准执行），学费标准低于本学段最高标准的，按实际收费标准申请。超出部分不予补偿、代偿或减免。资助期限为全日制普通高等学历教育的一个学制期（按照国家规定的基本修业年限据实计算），后续攻读更高层次学历的不在学费资助范围内。\n" +
      "（二）全日制在校退役士兵本科生国家助学金标准为每学期1850元（以学校当年执行通知为准）。\n\n" +
      "三、报送材料及相关要求（摘要）\n" +
      "（一）学生申请材料：学生按照不同类型，需准备《入伍通知书》复印件、登录全国征兵网在线填写打印的《应征入伍服兵役高等学校学生国家教育资助申请表Ⅰ》或《申请表Ⅱ》一式两份（个人基本信息手填或复印无效），并按要求到征兵部门或退役军人事务部门盖章后提交就读高校审核；毕业生另需提供学位证、毕业证复印件等。退役复学/退役入学另需《退役证》复印件、录取通知书或复学通知书等。\n" +
      "（二）相关要求及说明：申请退役士兵学费资助的学生应完成退役军人服务中心（站）建档立卡或信息更正；材料需经批准入伍地县级征兵办公室及就读高校财务部门等审核后，按当年流程报送；审批通过后由高校财务部门统一发放（时间以当年通知为准）。\n\n" +
      "相关文件（表格以全国征兵网及就读高校当年通知版本为准）：\n" +
      "1. 《应征入伍服兵役高等学校学生国家教育资助申请表》\n" +
      "2. 退役复学（入学）学生国家教育资助续报表（非首次申请适用）",
  },
  {
    id: "newborn_temp",
    label: "新生临时困难资助如何申请？",
    reply:
      "【新生临时困难资助如何申请】\n\n" +
      "部分高校对新入学家庭经济困难学生设有一次性临时困难资助（常见为数百元量级，具体以就读高校办法为准）。\n\n" +
      "一般需提交申请表及佐证材料，经院系审核、学校公示后发放。具体条件、金额与材料清单请以就读高校当年正式通知为准。",
  },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("screen");

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: ASSISTANT_INTRO },
    { role: "assistant", content: ASSISTANT_SECOND },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [soulMessages, setSoulMessages] = useState<Msg[]>([
    { role: "assistant", content: SOUL_WINDOW_INTRO },
    { role: "assistant", content: SOUL_WINDOW_SECOND },
  ]);
  const [soulInput, setSoulInput] = useState("");
  const [soulLoading, setSoulLoading] = useState(false);
  const [soulError, setSoulError] = useState<string | null>(null);
  const [soulDemoMode, setSoulDemoMode] = useState(false);
  const soulBottomRef = useRef<HTMLDivElement>(null);

  const [screenJson, setScreenJson] = useState(DEFAULT_SCREEN_JSON);
  const [screenResult, setScreenResult] = useState<unknown>(null);
  const [screenLoading, setScreenLoading] = useState(false);

  const [povertyForm, setPovertyForm] = useState({
    student_id: "2022001",
    monthly_total_yuan: 980,
    cohort_median_yuan: 2200,
    canteen_share: 0.78,
    essential_share: 0.88 as number | "",
  });
  const [povertyResult, setPovertyResult] = useState<unknown>(null);
  const [povertyLoading, setPovertyLoading] = useState(false);

  const [recForm, setRecForm] = useState({
    is_freshman: false,
    is_retired_soldier_undergrad: true,
    in_poverty_database: true,
    is_suspended: false,
  });
  const [recResult, setRecResult] = useState<unknown>(null);
  const [recLoading, setRecLoading] = useState(false);

  const [calcForm, setCalcForm] = useState({
    grade: 2,
    gpa: 3.5,
    rank_percent: 15 as number | "",
    in_poverty_database: true,
    difficulty_level: "special",
    has_disability_certificate: false,
    is_retired_soldier_undergrad: false,
    wants_national_scholarship: true,
    wants_national_encouragement: true,
    wants_national_grant: true,
  });
  const [calcResult, setCalcResult] = useState<unknown>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const [matchForm, setMatchForm] = useState({
    grade: 2,
    gpa: 3.5,
    rank_percent: 15 as number | "",
    in_poverty_database: true,
    difficulty_level: "special",
    is_undergraduate: true,
    is_freshman: false,
    is_retired_soldier_undergrad: false,
    has_patent: false,
    competition_level: "provincial" as "none" | "provincial" | "national",
    has_art_performance_award: false,
    has_social_practice_award: false,
    has_major_disciplinary: false,
    is_suspended: false,
    pushMonth: 9,
  });
  const [matchResult, setMatchResult] = useState<unknown>(null);
  const [pushResult, setPushResult] = useState<unknown>(null);
  const [windowsResult, setWindowsResult] = useState<unknown>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [windowsLoading, setWindowsLoading] = useState(false);

  const [hiddenJson, setHiddenJson] = useState(DEFAULT_HIDDEN_JSON);
  const [hiddenResult, setHiddenResult] = useState<unknown>(null);
  const [hiddenLoading, setHiddenLoading] = useState(false);

  const [precheckJson, setPrecheckJson] = useState(DEFAULT_PRECHECK_JSON);
  const [precheckResult, setPrecheckResult] = useState<unknown>(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [dashboardResult, setDashboardResult] = useState<unknown>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [mainView, setMainView] = useState<MainView>(() => mainViewFromHash());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [quickTopicsVisible, setQuickTopicsVisible] = useState(readQuickTopicsVisible);

  const [welcomeSplash, setWelcomeSplash] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "1" || params.get("splash") === "1") {
        return true;
      }
      return sessionStorage.getItem(WELCOME_SPLASH_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [welcomeFireworksReady, setWelcomeFireworksReady] = useState(false);

  const dismissWelcomeSplash = useCallback(() => {
    try {
      sessionStorage.setItem(WELCOME_SPLASH_KEY, "1");
    } catch {
      /* ignore */
    }
    setWelcomeSplash(false);
    setWelcomeFireworksReady(false);
  }, []);
  const welcomeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const buildMatchBody = () => ({
    grade: matchForm.grade,
    gpa: matchForm.gpa,
    rank_percent: matchForm.rank_percent === "" ? null : Number(matchForm.rank_percent),
    in_poverty_database: matchForm.in_poverty_database,
    difficulty_level: matchForm.difficulty_level,
    is_undergraduate: matchForm.is_undergraduate,
    is_freshman: matchForm.is_freshman,
    is_retired_soldier_undergrad: matchForm.is_retired_soldier_undergrad,
    has_patent: matchForm.has_patent,
    competition_level: matchForm.competition_level,
    has_art_performance_award: matchForm.has_art_performance_award,
    has_social_practice_award: matchForm.has_social_practice_award,
    has_major_disciplinary: matchForm.has_major_disciplinary,
    is_suspended: matchForm.is_suspended,
  });

  const scrollDown = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollDown();
  }, [messages, scrollDown]);

  useEffect(() => {
    soulBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [soulMessages]);

  useEffect(() => {
    const onHash = () => setMainView(mainViewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    // 下线页面兜底：即使手动改 hash，也统一回到政策问答
    if (
      mainView === "tools" ||
      mainView === "contacts" ||
      mainView === "dashboard" ||
      mainView === "events" ||
      mainView === "admin"
    ) {
      navigateView("chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅做受限页面跳转兜底
  }, [mainView]);

  useEffect(() => {
    if (isStaticDemo) {
      setDemoMode(true);
      setSoulDemoMode(true);
    }
  }, []);

  const navigateView = (v: MainView) => {
    setMainView(v);
    window.location.hash = v;
    setSidebarOpen(false);
    if (v === "tools") setTab("screen");
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const nextUser: Msg = { role: "user", content: trimmed };
    setMessages((m) => [...m, nextUser]);
    setInput("");
    setLoading(true);
    const history = [...messages, nextUser].map((x) => ({
      role: x.role,
      content: x.content,
    }));
    try {
      if (isStaticDemo) {
        setDemoMode(true);
        const demoReply =
          "【静态演示模式】当前页面部署为静态站点，未连接后端 API。\n\n" +
          "你仍可体验：\n" +
          "1) 侧栏各模块（问策解惑、辨诈防骗、砺心立志、守信立德、暖心润情等）\n" +
          "2) 问策解惑内快捷主题按钮（固定回复）\n\n" +
          "若需实时智能问答，请部署后端并配置 VITE_API_BASE 指向后端地址。";
        setMessages((m) => [...m, { role: "assistant", content: demoReply }]);
      } else {
        const data = await postChat(history, { appScope: "policy" });
        if (data.mode === "demo") setDemoMode(true);
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setLoading(false);
    }
  };

  const sendSoul = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || soulLoading) return;
    setSoulError(null);
    const nextUser: Msg = { role: "user", content: trimmed };
    setSoulMessages((m) => [...m, nextUser]);
    setSoulInput("");
    setSoulLoading(true);
    const history = [...soulMessages, nextUser].map((x) => ({
      role: x.role,
      content: x.content,
    }));
    try {
      if (isStaticDemo) {
        setSoulDemoMode(true);
        const demoReply =
          "【静态演示】当前页面未连接后端 API，暖心润情无法调用大模型。\n\n" +
          "你值得被认真倾听。请在本地运行后端并配置 VITE_API_BASE，或部署带 API 的站点后再试；紧急情况下请直接拨打 110 / 120。";
        setSoulMessages((m) => [...m, { role: "assistant", content: demoReply }]);
      } else {
        const data = await postChat(history, { appScope: "soul_window" });
        if (data.mode === "demo") setSoulDemoMode(true);
        setSoulMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setSoulError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSoulLoading(false);
    }
  };

  const pickQuickOption = (opt: QuickOption) => {
    if (loading) return;
    setError(null);
    setMessages((m) => [
      ...m,
      { role: "user", content: opt.label },
      { role: "assistant", content: opt.reply },
    ]);
  };

  const runScreen = async () => {
    setScreenLoading(true);
    setScreenResult(null);
    try {
      if (isStaticDemo) {
        setScreenResult({
          note: "静态演示数据（未连接后端）",
          total: 3,
          passed: 1,
          exception_list: [
            { student_id: "2021002", reason: "休学中" },
            { student_id: "2021003", reason: "严重违纪记录" },
          ],
        });
        return;
      }
      const body = JSON.parse(screenJson) as { students: unknown[] };
      const res = await fetch(`${apiBase}/api/eligibility/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setScreenResult(data);
    } catch (e) {
      setScreenResult(
        e instanceof Error ? e.message : "解析失败，请检查 JSON 格式与 intent 取值。"
      );
    } finally {
      setScreenLoading(false);
    }
  };

  const runPoverty = async () => {
    setPovertyLoading(true);
    setPovertyResult(null);
    try {
      if (isStaticDemo) {
        setPovertyResult({
          note: "静态演示数据（未连接后端）",
          student_id: povertyForm.student_id,
          risk_level: "medium",
          score: 0.67,
          recommendation: "建议关注消费结构与家庭经济变化，必要时寻求可信亲友支持。",
        });
        return;
      }
      const res = await fetch(`${apiBase}/api/insights/poverty-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: povertyForm.student_id,
          monthly_total_yuan: povertyForm.monthly_total_yuan,
          cohort_median_yuan: povertyForm.cohort_median_yuan || null,
          canteen_share: povertyForm.canteen_share,
          essential_share:
            povertyForm.essential_share === "" ? null : povertyForm.essential_share,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPovertyResult(data);
    } catch (e) {
      setPovertyResult(e instanceof Error ? e.message : "请求失败");
    } finally {
      setPovertyLoading(false);
    }
  };

  const runRec = async () => {
    setRecLoading(true);
    setRecResult(null);
    try {
      if (isStaticDemo) {
        setRecResult({
          note: "静态演示数据（未连接后端）",
          recommendations: ["国家助学金", "勤工助学岗位", "临时困难资助"],
        });
        return;
      }
      const res = await fetch(`${apiBase}/api/recommendations/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRecResult(data);
    } catch (e) {
      setRecResult(e instanceof Error ? e.message : "请求失败");
    } finally {
      setRecLoading(false);
    }
  };

  const runCalc = async () => {
    setCalcLoading(true);
    setCalcResult(null);
    try {
      if (isStaticDemo) {
        setCalcResult({
          note: "静态演示数据（未连接后端）",
          estimated_total_yuan: 9700,
          detail: {
            national_grant: 3700,
            national_encouragement: 6000,
          },
        });
        return;
      }
      const body = {
        ...calcForm,
        rank_percent: calcForm.rank_percent === "" ? null : Number(calcForm.rank_percent),
      };
      const res = await fetch(`${apiBase}/api/calculator/aid-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCalcResult(data);
    } catch (e) {
      setCalcResult(e instanceof Error ? e.message : "试算失败");
    } finally {
      setCalcLoading(false);
    }
  };

  const runMatchAwards = async () => {
    setMatchLoading(true);
    setMatchResult(null);
    try {
      if (isStaticDemo) {
        setMatchResult({
          note: "静态演示数据（未连接后端）",
          matched: ["国家励志奖学金", "校级综合奖学金", "社会捐赠奖助学金（以高校通知为准）"],
        });
        return;
      }
      const res = await fetch(`${apiBase}/api/match/awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMatchBody()),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMatchResult(data);
    } catch (e) {
      setMatchResult(e instanceof Error ? e.message : "匹配失败");
    } finally {
      setMatchLoading(false);
    }
  };

  const runPushReminders = async () => {
    setPushLoading(true);
    setPushResult(null);
    try {
      if (isStaticDemo) {
        setPushResult({
          note: "静态演示数据（未连接后端）",
          month: matchForm.pushMonth,
          reminders: ["关注就读高校通知发布时间", "在系统内按时提交申请", "准备佐证材料并备份"],
        });
        return;
      }
      const res = await fetch(`${apiBase}/api/push/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildMatchBody(),
          month: matchForm.pushMonth,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPushResult(data);
    } catch (e) {
      setPushResult(e instanceof Error ? e.message : "生成失败");
    } finally {
      setPushLoading(false);
    }
  };

  const loadPolicyWindows = async () => {
    setWindowsLoading(true);
    setWindowsResult(null);
    try {
      if (isStaticDemo) {
        setWindowsResult({
          note: "静态演示数据（未连接后端）",
          windows: [
            { month: 9, topics: ["国家奖助学金申请", "困难认定复核"] },
            { month: 11, topics: ["国家助学金评定公示"] },
          ],
        });
        return;
      }
      const res = await fetch(`${apiBase}/api/policy/windows`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setWindowsResult(data);
    } catch (e) {
      setWindowsResult(e instanceof Error ? e.message : "加载失败");
    } finally {
      setWindowsLoading(false);
    }
  };

  const runHiddenDetect = async () => {
    setHiddenLoading(true);
    setHiddenResult(null);
    try {
      if (isStaticDemo) {
        setHiddenResult({
          note: "静态演示数据（未连接后端）",
          hit_count: 1,
          rows: [{ student_id: "2023001", risk_level: "high", reasons: ["连续低消费", "高频食堂消费"] }],
        });
        return;
      }
      const body = JSON.parse(hiddenJson) as { rows: unknown[] };
      const res = await fetch(`${apiBase}/api/hidden-poverty/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHiddenResult(data);
    } catch (e) {
      setHiddenResult(e instanceof Error ? e.message : "识别失败");
    } finally {
      setHiddenLoading(false);
    }
  };

  const runPrecheck = async () => {
    setPrecheckLoading(true);
    setPrecheckResult(null);
    try {
      if (isStaticDemo) {
        setPrecheckResult({
          note: "静态演示数据（未连接后端）",
          eligible_count: 1,
          exception_count: 1,
        });
        return;
      }
      const body = JSON.parse(precheckJson) as { rows: unknown[] };
      const res = await fetch(`${apiBase}/api/precheck/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPrecheckResult(data);
    } catch (e) {
      setPrecheckResult(e instanceof Error ? e.message : "预审失败");
    } finally {
      setPrecheckLoading(false);
    }
  };

  const exportPrecheckExcel = async () => {
    setExporting(true);
    try {
      if (isStaticDemo) {
        setPrecheckResult("静态演示站不支持导出 Excel。请在本地/服务器后端环境使用该功能。");
        return;
      }
      const body = JSON.parse(precheckJson) as { rows: unknown[] };
      const res = await fetch(`${apiBase}/api/precheck/export.xlsx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `precheck_export_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPrecheckResult(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const loadDashboard = async () => {
    setDashboardLoading(true);
    setDashboardResult(null);
    try {
      if (isStaticDemo) {
        setDashboardResult({
          note: "静态演示数据（未连接后端）",
          applications_total: 1284,
          reviewed: 1162,
          pending: 122,
          colleges_completion: [
            { college: "示例院系A", rate: 0.94 },
            { college: "示例院系B", rate: 0.91 },
          ],
        });
        return;
      }
      const res = await fetch(`${apiBase}/api/dashboard/summary`);
      const text = await res.text();
      if (!res.ok) {
        throw new Error(dashboardFetchErrorHint(text, res.status));
      }
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          "看板接口返回不是合法 JSON（可能被静态站点或首页 HTML 替代）。请确认 GET /api/dashboard/summary 可访问。",
        );
      }
      setDashboardResult(data);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "加载失败";
      setDashboardResult(raw.length > 600 ? `${raw.slice(0, 600)}…` : raw);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (mainView === "dashboard") void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在切换侧栏页时拉取
  }, [mainView]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    if (!welcomeSplash) return;
    // 先展示封面 Logo（3s），再播放烟花（2s），最后自动进入主页面
    setWelcomeFireworksReady(false);
    const fireworksId = window.setTimeout(() => setWelcomeFireworksReady(true), 3000);
    const dismissId = window.setTimeout(dismissWelcomeSplash, 5000);
    return () => {
      clearTimeout(fireworksId);
      clearTimeout(dismissId);
    };
  }, [welcomeSplash, dismissWelcomeSplash]);

  useEffect(() => {
    if (!welcomeSplash || !welcomeFireworksReady) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissWelcomeSplash();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [welcomeSplash, dismissWelcomeSplash]);

  useEffect(() => {
    if (!welcomeSplash) return;
    const canvas = welcomeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastRocketSpawn = 0;
    let running = true;
    const GRAVITY = 0.11;

    type Rocket = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      prevVy: number;
      baseHue: number;
    };

    type BurstParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      hue: number;
      size: number;
    };

    type TrailSpark = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      hue: number;
      size: number;
    };

    const rockets: Rocket[] = [];
    const bursts: BurstParticle[] = [];
    const trails: TrailSpark[] = [];

    /** 霓虹色系：高饱和 + 偏亮 */
    const neonHue = () => {
      const bands = [165, 185, 200, 280, 305, 330, 115, 52];
      const b = bands[Math.floor(Math.random() * bands.length)];
      return b + (Math.random() - 0.5) * 18;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnRocket = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = w * (0.08 + Math.random() * 0.84);
      const y = h - 8 - Math.random() * 50;
      const vx = (Math.random() - 0.5) * 1.4;
      const vy = -(9.5 + Math.random() * 6);
      rockets.push({
        x,
        y,
        vx,
        vy,
        prevVy: vy,
        baseHue: neonHue(),
      });
    };

    const explode = (cx: number, cy: number, baseHue: number) => {
      const count = 110 + Math.floor(Math.random() * 70);
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4.2 + Math.random() * 7.2;
        const hue = (baseHue + (Math.random() - 0.5) * 55 + i * 0.35 + 360) % 360;
        bursts.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 52 + Math.random() * 55,
          hue,
          size: 1.8 + Math.random() * 4.2,
        });
      }
      /* 内圈更密、稍慢，形成层次 */
      const inner = Math.floor(count * 0.45);
      for (let i = 0; i < inner; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3.8;
        const hue = (baseHue + (Math.random() - 0.5) * 40 + 360) % 360;
        bursts.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 70 + Math.random() * 45,
          hue,
          size: 1.2 + Math.random() * 2.8,
        });
      }
    };

    const frame = (t: number) => {
      if (!running) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      ctx.fillStyle = "rgba(255,255,255,0.11)";
      ctx.fillRect(0, 0, W, H);

      /* 更密：约每 120ms 一发上升弹 */
      if (t - lastRocketSpawn > 120) {
        spawnRocket();
        if (Math.random() > 0.55) spawnRocket();
        lastRocketSpawn = t;
      }

      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const r = rockets[i];
        r.prevVy = r.vy;
        r.x += r.vx;
        r.y += r.vy;
        r.vy += GRAVITY;
        r.vx *= 0.998;

        trails.push({
          x: r.x + (Math.random() - 0.5) * 3,
          y: r.y + 6,
          vx: (Math.random() - 0.5) * 0.35,
          vy: 0.6 + Math.random() * 0.5,
          life: 0,
          maxLife: 10 + Math.random() * 8,
          hue: (r.baseHue + (Math.random() - 0.5) * 25 + 360) % 360,
          size: 1.4 + Math.random() * 1.6,
        });

        const apex = r.prevVy < 0 && r.vy >= 0;
        if (apex || r.y < H * 0.06) {
          explode(r.x, r.y, r.baseHue);
          rockets.splice(i, 1);
        } else if (r.x < -40 || r.x > W + 40 || r.y > H + 20) {
          rockets.splice(i, 1);
        }
      }

      for (let i = trails.length - 1; i >= 0; i -= 1) {
        const s = trails[i];
        s.life += 1;
        s.x += s.vx;
        s.y += s.vy;
        const a = Math.max(0, 1 - s.life / s.maxLife);
        if (a <= 0.02) {
          trails.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 100%, 68%, ${a * 0.85})`;
        ctx.arc(s.x, s.y, s.size * (0.4 + 0.6 * a), 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const p = bursts[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.985;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha <= 0.015) {
          bursts.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue}, 100%, 72%, ${alpha})`;
        ctx.arc(p.x, p.y, p.size * (0.35 + 0.65 * Math.sqrt(alpha)), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(frame);
    };

    spawnRocket();
    spawnRocket();
    raf = window.requestAnimationFrame(frame);
    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, [welcomeSplash, welcomeFireworksReady]);

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_TOPICS_VISIBLE_KEY, quickTopicsVisible ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [quickTopicsVisible]);

  return (
    <div className="app-shell">
      {welcomeSplash && (
        <div
          className="welcome-splash"
          role="dialog"
          aria-modal="true"
          aria-label="欢迎"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}welcome-splash.png)`,
          }}
          onClick={dismissWelcomeSplash}
        >
          {welcomeFireworksReady && (
            <canvas ref={welcomeCanvasRef} className="welcome-splash-fireworks" aria-hidden="true" />
          )}
          <p className="welcome-splash-hint">（点击菜单可展开功能）</p>
        </div>
      )}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="关闭菜单"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        id="app-sidebar-nav"
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="站点导航"
      >
        <div className="sidebar-brand">
          <span className="sidebar-brand-title">砺志励行小助手</span>
          <span className="sidebar-brand-sub">大学生资助政策与成长陪伴助手</span>
        </div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-link ${mainView === "chat" ? "active" : ""}`}
            onClick={() => navigateView("chat")}
          >
            <span className="sidebar-link-main">问策解惑</span>
            <span className="sidebar-link-sub">获得国家支持的安全感</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "anti_fraud" ? "active" : ""}`}
            onClick={() => navigateView("anti_fraud")}
          >
            <span className="sidebar-link-main">辨诈防骗</span>
            <span className="sidebar-link-sub">获得守护财产的警觉感</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "hongge" ? "active" : ""}`}
            onClick={() => navigateView("hongge")}
          >
            <span className="sidebar-link-main">砺心立志</span>
            <span className="sidebar-link-sub">获得向上生长的力量感</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "feedback" ? "active" : ""}`}
            onClick={() => navigateView("feedback")}
          >
            <span className="sidebar-link-main">守信立德</span>
            <span className="sidebar-link-sub">获得立身之本的原则感</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "soul_window" ? "active" : ""}`}
            onClick={() => navigateView("soul_window")}
          >
            <span className="sidebar-link-main">暖心润情</span>
            <span className="sidebar-link-sub">获得情感归属的治愈感</span>
          </button>
        </nav>
      </aside>

      <div
        className={`main-column layout layout-wide${mainView === "chat" || mainView === "soul_window" || mainView === "hongge" ? " chat-pure" : ""}`}
      >
        <div className="mobile-topbar">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar-nav"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            菜单
          </button>
          <span className="mobile-topbar-title">
            {mainView === "chat" && "问策解惑"}
            {mainView === "anti_fraud" && "辨诈防骗"}
            {mainView === "soul_window" && "暖心润情"}
            {mainView === "hongge" && "砺心立志"}
            {mainView === "feedback" && "守信立德"}
          </span>
        </div>

      {mainView === "chat" ? (
        <>
          {demoMode && (
            <div className="demo-banner" role="status">
              {isStaticDemo
                ? "演示模式：当前为静态展示站（GitHub Pages），接口调用使用本地示例数据。"
                : "演示模式：后端未配置大模型密钥，问答为示例文案。配置 OPENAI_API_KEY 后可启用智能生成。"}
            </div>
          )}
          <div className="chat-slim-header">
            <div className="chat-slim-brand">
              <AgentAvatar className="logo logo-sm" alt="助手头像" />
              <h1 className="chat-slim-title">资助政策咨询</h1>
            </div>
          </div>

          <main className="chat-panel">
            <div className="messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`bubble-row ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  {msg.role === "assistant" && (
                    <AgentAvatar className="bubble-avatar" alt="助手头像" />
                  )}
                  <div className={`bubble ${msg.role}`}>
                    <div className="bubble-text">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="bubble-row assistant">
                  <AgentAvatar className="bubble-avatar" alt="助手头像" />
                  <div className="bubble assistant thinking">正在思考…</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {quickTopicsVisible ? (
              <div className="quick-options quick-options-pure" aria-label="快捷主题">
                <div className="quick-options-head">
                  <span className="quick-options-label">快捷主题</span>
                  <button
                    type="button"
                    className="text-link quick-options-hide-btn"
                    onClick={() => setQuickTopicsVisible(false)}
                    aria-expanded={true}
                  >
                    隐藏
                  </button>
                </div>
                <div className="quick-options-grid">
                  {QUICK_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="quick-option-btn"
                      onClick={() => pickQuickOption(opt)}
                      disabled={loading}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="quick-options quick-options-collapsed quick-options-pure">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setQuickTopicsVisible(true)}
                  aria-expanded="false"
                >
                  显示快捷主题
                </button>
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <textarea
                rows={2}
                placeholder="输入你的问题…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                disabled={loading}
              />
              <button type="submit" className="send-btn" disabled={loading}>
                发送
              </button>
            </form>
          </main>
        </>
      ) : mainView === "soul_window" ? (
        <>
          {(soulDemoMode || isStaticDemo) && (
            <div className="demo-banner" role="status">
              {isStaticDemo
                ? "静态演示站：暖心润情不会请求后端 API。"
                : "演示模式：未接通大模型时，为固定说明文案。配置 OPENAI_API_KEY 并对接 DeepSeek 等兼容接口后可使用智能回复。"}
            </div>
          )}
          <div className="chat-slim-header">
            <div className="chat-slim-brand">
              <AgentAvatar className="logo logo-sm" alt="助手头像" />
              <h1 className="chat-slim-title">暖心润情</h1>
            </div>
          </div>

          <p className="soul-window-scope-note">
            本栏目用于情绪倾诉与心理科普向陪伴，<strong>不能替代</strong>专业心理咨询或医疗。遇危机请拨打
            <strong> 110 / 120 </strong>，并联系身边可信的人或前往当地正规医疗机构心理科/精神科。
            对话经安全护栏过滤，拒绝诱导性、越狱类及有害内容请求。
          </p>

          <main className="chat-panel soul-window-panel">
            <div className="messages">
              {soulMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`bubble-row ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  {msg.role === "assistant" && (
                    <AgentAvatar className="bubble-avatar" alt="暖心润情助手" />
                  )}
                  <div className={`bubble ${msg.role}`}>
                    <div className="bubble-text">{msg.content}</div>
                  </div>
                </div>
              ))}
              {soulLoading && (
                <div className="bubble-row assistant">
                  <AgentAvatar className="bubble-avatar" alt="暖心润情助手" />
                  <div className="bubble assistant thinking">正在倾听与思考…</div>
                </div>
              )}
              <div ref={soulBottomRef} />
            </div>

            <div className="quick-options quick-options-pure soul-quick-topics" aria-label="倾诉入口">
              <span className="quick-options-label">想说的话（示例）</span>
              <div className="quick-options-grid">
                {SOUL_QUICK_TOPICS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="quick-option-btn"
                    onClick={() => void sendSoul(opt.text)}
                    disabled={soulLoading}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {soulError && <div className="error-banner">{soulError}</div>}

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void sendSoul(soulInput);
              }}
            >
              <textarea
                rows={2}
                placeholder="在这里说说你的感受…（Enter 发送，Shift+Enter 换行）"
                value={soulInput}
                onChange={(e) => setSoulInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendSoul(soulInput);
                  }
                }}
                disabled={soulLoading}
              />
              <button type="submit" className="send-btn" disabled={soulLoading}>
                发送
              </button>
            </form>
          </main>

          <p className="tools-back-hint">
            <button type="button" className="text-link" onClick={() => navigateView("chat")}>
              ← 返回政策问答
            </button>
          </p>
        </>
      ) : mainView === "hongge" ? (
        <HonggeLingjingPanel onBack={() => navigateView("chat")} />
      ) : mainView === "anti_fraud" ? (
        <FraudPreventionPanel onBack={() => navigateView("chat")} />
      ) : (
        <>
      <header className="header">
        {demoMode && (
          <div className="demo-banner" role="status">
            {isStaticDemo
              ? "演示模式：当前为静态展示站（GitHub Pages），接口调用使用本地示例数据。"
              : "演示模式：后端未配置大模型密钥，问答为示例文案。配置 OPENAI_API_KEY 后可启用智能生成。"}
          </div>
        )}
        <div className="brand">
          <AgentAvatar className="logo" alt="助手头像" />
          <div>
            <h1>砺志励行小助手</h1>
            <p className="subtitle">
              资助政策咨询、辨诈防骗，心理陪伴与情绪疏导，校园文化资源与砺心立志，守信立德一体化平台
            </p>
          </div>
        </div>
      </header>

      <section className="platform-overview" aria-label="平台概览">
        <div className="overview-card">
          <span className="overview-label">当前模式</span>
          <strong>{isStaticDemo ? "静态演示" : "联调模式"}</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">推荐入口</span>
          <strong>从「问策解惑」开始咨询</strong>
        </div>
      </section>

      {mainView === "tools" && (
        <>
      <nav className="tabs" aria-label="功能切换">
        <button
          type="button"
          className={`tab-btn ${tab === "screen" ? "active" : ""}`}
          onClick={() => setTab("screen")}
        >
          资格审查
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "insights" ? "active" : ""}`}
          onClick={() => setTab("insights")}
        >
          智能预警与推荐
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "calculator" ? "active" : ""}`}
          onClick={() => setTab("calculator")}
        >
          资助计算器
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "match" ? "active" : ""}`}
          onClick={() => setTab("match")}
        >
          政策匹配与推送
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "ops" ? "active" : ""}`}
          onClick={() => setTab("ops")}
        >
          预审机器人与看板
        </button>
      </nav>

      <p className="tools-back-hint">
        <button type="button" className="text-link" onClick={() => navigateView("chat")}>
          ← 返回政策问答
        </button>
      </p>

      {tab === "screen" && (
        <section className="tool-panel">
          <p className="tool-intro">
            根据<strong>休学</strong>、<strong>严重违纪</strong>、<strong>困难生库</strong>与
            <strong>申请意向</strong>做规则校验，输出全量结果与
            <strong>异常名单</strong>（演示，对接真实库后可在管理端批量跑批）。
          </p>
          <label className="field-label">请求体 JSON（students 数组）</label>
          <textarea
            className="json-editor"
            rows={16}
            value={screenJson}
            onChange={(e) => setScreenJson(e.target.value)}
            spellCheck={false}
          />
          <div className="tool-actions">
            <button
              type="button"
              className="send-btn"
              onClick={() => void runScreen()}
              disabled={screenLoading}
            >
              {screenLoading ? "筛查中…" : "运行筛查"}
            </button>
          </div>
          {screenResult != null && <ToolResultVisual kind="screen" data={screenResult} />}
        </section>
      )}

      {tab === "insights" && (
        <section className="tool-panel">
          <div className="insight-block">
            <h2 className="tool-h2">隐形贫困风险提示（消费画像）</h2>
            <p className="tool-intro">
              用月消费、与同届中位比、食堂占比等做<strong>启发式评分</strong>，辅助发现「低消费高刚性」群体（须与认定流程结合，合规使用数据）。
            </p>
            <div className="grid-form">
              <label>
                学号
                <input
                  value={povertyForm.student_id}
                  onChange={(e) =>
                    setPovertyForm((f) => ({ ...f, student_id: e.target.value }))
                  }
                />
              </label>
              <label>
                月消费（元）
                <input
                  type="number"
                  value={povertyForm.monthly_total_yuan}
                  onChange={(e) =>
                    setPovertyForm((f) => ({
                      ...f,
                      monthly_total_yuan: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                同届估算中位消费（元，可空）
                <input
                  type="number"
                  value={povertyForm.cohort_median_yuan}
                  onChange={(e) =>
                    setPovertyForm((f) => ({
                      ...f,
                      cohort_median_yuan: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                食堂支出占比（0–1）
                <input
                  type="number"
                  step="0.01"
                  value={povertyForm.canteen_share}
                  onChange={(e) =>
                    setPovertyForm((f) => ({
                      ...f,
                      canteen_share: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                必需品占比（0–1，可空）
                <input
                  type="number"
                  step="0.01"
                  value={povertyForm.essential_share}
                  onChange={(e) =>
                    setPovertyForm((f) => ({
                      ...f,
                      essential_share:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="tool-actions">
              <button
                type="button"
                className="send-btn"
                onClick={() => void runPoverty()}
                disabled={povertyLoading}
              >
                {povertyLoading ? "分析中…" : "评估风险"}
              </button>
            </div>
            {povertyResult != null && <ToolResultVisual kind="poverty" data={povertyResult} />}
          </div>

          <div className="insight-block insight-divider">
            <h2 className="tool-h2">免申即享 / 主动推送（规则演示）</h2>
            <p className="tool-intro">
              勾选身份特征后，按规则表给出可<strong>重点提醒</strong>的政策类型（非审批结果）。
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={recForm.is_freshman}
                  onChange={(e) =>
                    setRecForm((f) => ({ ...f, is_freshman: e.target.checked }))
                  }
                />
                本科新生
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={recForm.is_retired_soldier_undergrad}
                  onChange={(e) =>
                    setRecForm((f) => ({
                      ...f,
                      is_retired_soldier_undergrad: e.target.checked,
                    }))
                  }
                />
                全日制在校退役士兵（本科）
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={recForm.in_poverty_database}
                  onChange={(e) =>
                    setRecForm((f) => ({
                      ...f,
                      in_poverty_database: e.target.checked,
                    }))
                  }
                />
                已在困难生库
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={recForm.is_suspended}
                  onChange={(e) =>
                    setRecForm((f) => ({
                      ...f,
                      is_suspended: e.target.checked,
                    }))
                  }
                />
                休学中
              </label>
            </div>
            <div className="tool-actions">
              <button
                type="button"
                className="send-btn"
                onClick={() => void runRec()}
                disabled={recLoading}
              >
                {recLoading ? "生成中…" : "生成推荐"}
              </button>
            </div>
            {recResult != null && <ToolResultVisual kind="rec" data={recResult} />}
          </div>
        </section>
      )}

      {tab === "calculator" && (
        <section className="tool-panel">
          <h2 className="tool-h2">资助计算器（理论上限试算）</h2>
          <p className="tool-intro">
            输入年级、成绩、困难认定、身份特征后，自动匹配政策并估算
            <strong>理论可申请最高额度</strong>。同时会给出“国家励志奖学金 + 国家助学金”
            是否可并行申请的说明。
          </p>
          <div className="grid-form">
            <label>
              年级
              <input
                type="number"
                min={1}
                max={8}
                value={calcForm.grade}
                onChange={(e) =>
                  setCalcForm((f) => ({ ...f, grade: Number(e.target.value) }))
                }
              />
            </label>
            <label>
              GPA
              <input
                type="number"
                step="0.01"
                value={calcForm.gpa}
                onChange={(e) =>
                  setCalcForm((f) => ({ ...f, gpa: Number(e.target.value) }))
                }
              />
            </label>
            <label>
              排名百分位（前x%，可空）
              <input
                type="number"
                min={0}
                max={100}
                value={calcForm.rank_percent}
                onChange={(e) =>
                  setCalcForm((f) => ({
                    ...f,
                    rank_percent: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              困难等级
              <select
                value={calcForm.difficulty_level}
                onChange={(e) =>
                  setCalcForm((f) => ({ ...f, difficulty_level: e.target.value }))
                }
              >
                <option value="none">未认定</option>
                <option value="general">一般困难</option>
                <option value="comparative">比较困难</option>
                <option value="special">特别困难</option>
              </select>
            </label>
          </div>
          <div className="checks calc-checks">
            <label>
              <input
                type="checkbox"
                checked={calcForm.in_poverty_database}
                onChange={(e) =>
                  setCalcForm((f) => ({ ...f, in_poverty_database: e.target.checked }))
                }
              />
              在困难生库
            </label>
            <label>
              <input
                type="checkbox"
                checked={calcForm.has_disability_certificate}
                onChange={(e) =>
                  setCalcForm((f) => ({
                    ...f,
                    has_disability_certificate: e.target.checked,
                  }))
                }
              />
              有残疾证
            </label>
            <label>
              <input
                type="checkbox"
                checked={calcForm.is_retired_soldier_undergrad}
                onChange={(e) =>
                  setCalcForm((f) => ({
                    ...f,
                    is_retired_soldier_undergrad: e.target.checked,
                  }))
                }
              />
              退役士兵（本科）
            </label>
          </div>
          <div className="checks calc-checks">
            <label>
              <input
                type="checkbox"
                checked={calcForm.wants_national_scholarship}
                onChange={(e) =>
                  setCalcForm((f) => ({
                    ...f,
                    wants_national_scholarship: e.target.checked,
                  }))
                }
              />
              参与国家奖学金测算
            </label>
            <label>
              <input
                type="checkbox"
                checked={calcForm.wants_national_encouragement}
                onChange={(e) =>
                  setCalcForm((f) => ({
                    ...f,
                    wants_national_encouragement: e.target.checked,
                  }))
                }
              />
              参与国家励志奖学金测算
            </label>
            <label>
              <input
                type="checkbox"
                checked={calcForm.wants_national_grant}
                onChange={(e) =>
                  setCalcForm((f) => ({
                    ...f,
                    wants_national_grant: e.target.checked,
                  }))
                }
              />
              参与国家助学金测算
            </label>
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="send-btn"
              onClick={() => void runCalc()}
              disabled={calcLoading}
            >
              {calcLoading ? "试算中…" : "开始试算"}
            </button>
          </div>
          {calcResult != null && <ToolResultVisual kind="calc" data={calcResult} />}
        </section>
      )}

      {tab === "match" && (
        <section className="tool-panel">
          <h2 className="tool-h2">政策自动匹配与智能推送</h2>
          <p className="tool-intro">
            根据成绩、年级、困难认定、专利/竞赛、文艺/社会实践特长等做
            <strong>可申奖项筛选</strong>；再结合常见<strong>申请窗口期</strong>（如 9—10
            月国家奖助学金集中申请）生成<strong>提醒清单</strong>。对接消息中心后可向符合条件学生推送。
          </p>

          <div className="grid-form">
            <label>
              年级
              <input
                type="number"
                min={1}
                max={8}
                value={matchForm.grade}
                onChange={(e) =>
                  setMatchForm((f) => ({ ...f, grade: Number(e.target.value) }))
                }
              />
            </label>
            <label>
              GPA
              <input
                type="number"
                step="0.01"
                value={matchForm.gpa}
                onChange={(e) =>
                  setMatchForm((f) => ({ ...f, gpa: Number(e.target.value) }))
                }
              />
            </label>
            <label>
              排名百分位（前x%，可空）
              <input
                type="number"
                min={0}
                max={100}
                value={matchForm.rank_percent}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    rank_percent: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              困难等级
              <select
                value={matchForm.difficulty_level}
                onChange={(e) =>
                  setMatchForm((f) => ({ ...f, difficulty_level: e.target.value }))
                }
              >
                <option value="none">未认定</option>
                <option value="general">一般困难</option>
                <option value="comparative">比较困难</option>
                <option value="special">特别困难</option>
              </select>
            </label>
            <label>
              竞赛获奖（演示）
              <select
                value={matchForm.competition_level}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    competition_level: e.target.value as
                      | "none"
                      | "provincial"
                      | "national",
                  }))
                }
              >
                <option value="none">无</option>
                <option value="provincial">省级及以上</option>
                <option value="national">国家级</option>
              </select>
            </label>
            <label>
              提醒参考月份（1–12）
              <input
                type="number"
                min={1}
                max={12}
                value={matchForm.pushMonth}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    pushMonth: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>

          <div className="checks calc-checks">
            <label>
              <input
                type="checkbox"
                checked={matchForm.in_poverty_database}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    in_poverty_database: e.target.checked,
                  }))
                }
              />
              在困难生库
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.is_undergraduate}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    is_undergraduate: e.target.checked,
                  }))
                }
              />
              本科生
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.is_freshman}
                onChange={(e) =>
                  setMatchForm((f) => ({ ...f, is_freshman: e.target.checked }))
                }
              />
              本科新生
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.is_retired_soldier_undergrad}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    is_retired_soldier_undergrad: e.target.checked,
                  }))
                }
              />
              退役士兵（本科）
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.has_patent}
                onChange={(e) =>
                  setMatchForm((f) => ({ ...f, has_patent: e.target.checked }))
                }
              />
              有专利
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.has_art_performance_award}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    has_art_performance_award: e.target.checked,
                  }))
                }
              />
              文艺类校级及以上荣誉
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.has_social_practice_award}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    has_social_practice_award: e.target.checked,
                  }))
                }
              />
              社会实践/志愿服务突出
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.has_major_disciplinary}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    has_major_disciplinary: e.target.checked,
                  }))
                }
              />
              严重违纪记录
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchForm.is_suspended}
                onChange={(e) =>
                  setMatchForm((f) => ({
                    ...f,
                    is_suspended: e.target.checked,
                  }))
                }
              />
              休学中
            </label>
          </div>

          <div className="tool-actions tool-actions-row">
            <button
              type="button"
              className="send-btn"
              onClick={() => void runMatchAwards()}
              disabled={matchLoading}
            >
              {matchLoading ? "匹配中…" : "匹配可申奖项"}
            </button>
            <button
              type="button"
              className="send-btn secondary-btn"
              onClick={() => void runPushReminders()}
              disabled={pushLoading}
            >
              {pushLoading ? "生成中…" : "生成窗口期提醒"}
            </button>
            <button
              type="button"
              className="send-btn secondary-btn"
              onClick={() => void loadPolicyWindows()}
              disabled={windowsLoading}
            >
              {windowsLoading ? "加载中…" : "查看窗口期日历"}
            </button>
          </div>

          {matchResult != null && (
            <>
              <h3 className="tool-h3">匹配结果</h3>
              <ToolResultVisual kind="match" data={matchResult} />
            </>
          )}
          {pushResult != null && (
            <>
              <h3 className="tool-h3">智能推送（演示）</h3>
              <ToolResultVisual kind="push" data={pushResult} />
            </>
          )}
          {windowsResult != null && (
            <>
              <h3 className="tool-h3">窗口期归纳</h3>
              <ToolResultVisual kind="windows" data={windowsResult} />
            </>
          )}
        </section>
      )}

      {tab === "ops" && (
        <section className="tool-panel">
          <h2 className="tool-h2">功能三：隐形贫困识别辅助 + 资格预审机器人 + 数据看板</h2>
          <p className="tool-intro">
            在授权与隐私合规前提下，可对消费与申请数据进行辅助识别，并批量预审导出 Excel；同时查看资助管理看板数据。
          </p>

          <div className="insight-block">
            <h3 className="tool-h3">A. 隐形贫困识别辅助（匿名预警）</h3>
            <label className="field-label">请求体 JSON（rows）</label>
            <textarea
              className="json-editor"
              rows={10}
              value={hiddenJson}
              onChange={(e) => setHiddenJson(e.target.value)}
              spellCheck={false}
            />
            <div className="tool-actions tool-actions-row">
              <button
                type="button"
                className="send-btn"
                onClick={() => void runHiddenDetect()}
                disabled={hiddenLoading}
              >
                {hiddenLoading ? "识别中…" : "运行识别"}
              </button>
            </div>
            {hiddenResult != null && <ToolResultVisual kind="hidden" data={hiddenResult} />}
          </div>

          <div className="insight-block insight-divider">
            <h3 className="tool-h3">B. 资格预审机器人（2-3周）</h3>
            <p className="tool-intro">
              模拟“贫困库 + 成绩排名 + 违纪 + 休学”自动核对，输出符合条件名单与异常清单，并可导出 Excel。
            </p>
            <label className="field-label">请求体 JSON（rows）</label>
            <textarea
              className="json-editor"
              rows={12}
              value={precheckJson}
              onChange={(e) => setPrecheckJson(e.target.value)}
              spellCheck={false}
            />
            <div className="tool-actions tool-actions-row">
              <button
                type="button"
                className="send-btn"
                onClick={() => void runPrecheck()}
                disabled={precheckLoading}
              >
                {precheckLoading ? "预审中…" : "运行预审"}
              </button>
              <button
                type="button"
                className="send-btn secondary-btn"
                onClick={() => void exportPrecheckExcel()}
                disabled={exporting}
              >
                {exporting ? "导出中…" : "导出 Excel 清单"}
              </button>
            </div>
            {precheckResult != null && <ToolResultVisual kind="precheck" data={precheckResult} />}
          </div>

          <div className="insight-block insight-divider">
            <h3 className="tool-h3">C. 数据看板（1-2周）</h3>
            <p className="tool-intro">
              展示资助申请进度、各单位完成率、待处理异议申诉（当前为示例数据接口，可对接真实库）。
            </p>
            <div className="tool-actions tool-actions-row">
              <button
                type="button"
                className="send-btn"
                onClick={() => void loadDashboard()}
                disabled={dashboardLoading}
              >
                {dashboardLoading ? "加载中…" : "加载看板数据"}
              </button>
            </div>
            {dashboardResult != null && <ToolResultVisual kind="dashboard" data={dashboardResult} />}
          </div>
        </section>
      )}
        </>
      )}

      {mainView === "contacts" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">联系方式</h2>
          <p className="tool-intro">
            本平台为通用政策咨询与成长陪伴工具，<strong>不提供任何高校、院系或管理部门的联系方式</strong>，也不引导向具体机构求助。个案办理请以你就读高校当年正式通知为准。
          </p>
          {CAMPUS_CONTACT_BLOCKS.length === 0 && (
            <p className="portal-empty-note">暂无机构联系信息。</p>
          )}
          <div className="portal-cards">
            {CAMPUS_CONTACT_BLOCKS.map((b) => (
              <article key={b.title} className="portal-card">
                <h3 className="portal-card-title">{b.title}</h3>
                {b.lines.map((line) => (
                  <p key={line} className="portal-card-line">
                    {line}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </section>
      )}

      {mainView === "dashboard" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">数据看板</h2>
          <p className="tool-intro">
            调用后端 <code className="inline-code">GET /api/dashboard/summary</code>{" "}
            展示汇总数据（演示）。也可在「智能工具 → 预审机器人与看板」中与其他功能一并使用。
          </p>
          <div className="tool-actions tool-actions-row">
            <button
              type="button"
              className="send-btn secondary-btn"
              onClick={() => void loadDashboard()}
              disabled={dashboardLoading}
            >
              {dashboardLoading ? "刷新中…" : "重新加载"}
            </button>
            <button
              type="button"
              className="send-btn secondary-btn"
              onClick={() => {
                navigateView("tools");
                setTab("ops");
              }}
            >
              打开智能工具（预审与看板）
            </button>
          </div>
          {dashboardResult != null && <ToolResultVisual kind="dashboard" data={dashboardResult} />}
        </section>
      )}

      {mainView === "events" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">事件处理进度</h2>
          <p className="tool-intro">
            下表为<strong>前端演示数据</strong>，模拟工单状态；正式环境需对接业务系统与权限控制。
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>工单号</th>
                  <th>类型</th>
                  <th>摘要</th>
                  <th>状态</th>
                  <th>更新日期</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_EVENT_TICKETS.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.type}</td>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mainView === "feedback" && (
        <IntegrityPanel onBack={() => navigateView("chat")} />
      )}

      {mainView === "admin" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">后台管理平台</h2>
          <p className="tool-intro">
            本应用为<strong>砺志励行小助手演示前端</strong>，不包含独立的管理员后台。若需正式「后台管理平台」，请在服务端单独部署管理端（身份认证、角色权限、审计日志、与业务数据对接），并通过环境变量配置仅内网或 VPN
            可访问。
          </p>
          <ul className="portal-bullet-list">
            <li>建议技术栈：与现有 API 同域或反向代理下的独立 Admin SPA / 低代码平台。</li>
            <li>敏感数据须脱敏展示，操作留痕；禁止在公网暴露未鉴权的管理接口。</li>
            <li>下方按钮仅跳转到本应用的「预审与看板」演示区，便于对照能力清单。</li>
          </ul>
          <div className="tool-actions tool-actions-row">
            <button
              type="button"
              className="send-btn"
              onClick={() => {
                navigateView("tools");
                setTab("ops");
              }}
            >
              打开演示：预审机器人与看板
            </button>
            <button
              type="button"
              className="send-btn secondary-btn"
              onClick={() => {
                navigateView("dashboard");
              }}
            >
              打开数据看板页
            </button>
          </div>
        </section>
      )}
        </>
      )}
      </div>
    </div>
  );
}
