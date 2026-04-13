import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { suggestPolicyDocAttachments } from "./docAttachmentHints";
import {
  CAMPUS_CONTACT_BLOCKS,
  MOCK_EVENT_TICKETS,
  POLICY_LINK_GROUPS,
  docHref,
} from "./portalData";
import {
  HONGFAN_BANK_ITEMS,
  HONGFAN_COURSES,
  HONGFAN_INTRO,
  hongfanItemsForCourse,
  type HongfanBankItem,
  type HongfanCourseId,
} from "./hongfanData";
import { HongfanQuizPanel } from "./HongfanQuizPanel";
import { HonggeLingjingPanel } from "./HonggeLingjingPanel";
import { LearningMaterialsPanel } from "./LearningMaterialsPanel";
import { ToolResultVisual } from "./toolResultVisual";

type Role = "user" | "assistant";
type ChatDocAttachment = { label: string; filename: string };
type Msg = { role: Role; content: string; attachments?: ChatDocAttachment[] };
type Tab = "screen" | "insights" | "calculator" | "match" | "ops";

/** 侧栏一级页面（#hash 同步，便于收藏） */
type MainView =
  | "chat"
  | "hongfan"
  | "tools"
  | "policy"
  | "contacts"
  | "dashboard"
  | "events"
  | "feedback"
  | "admin"
  | "soul_window"
  | "hongge";

const MAIN_VIEW_ORDER: MainView[] = [
  "chat",
  "hongfan",
  "soul_window",
  "hongge",
  "tools",
  "policy",
  "contacts",
  "dashboard",
  "events",
  "feedback",
  "admin",
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
  if (!raw) return "chat";
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

/** 生产构建若未设置 VITE_API_BASE，fetch 会请求当前站点下的 /api/…，静态服务器无此路由 → 404；学习材料改走说明文案 */
const learningMaterialsStatic =
  import.meta.env.DEV ? false : isStaticDemo || !apiBase;

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
      "college": "计算机学院",
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
      "college": "机电工程学院",
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
  opts?: { appScope?: "policy" | "hongfan" | "soul_window"; courseTag?: HongfanCourseId | null },
) {
  const body: Record<string, unknown> = {
    messages,
    app_scope: opts?.appScope ?? "policy",
  };
  if (opts?.courseTag) {
    body.course_tag = opts.courseTag;
  }
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
    attachments?: ChatDocAttachment[] | null;
  }>;
}

const ASSISTANT_INTRO =
  "你好，我是「广工学工数智助手」里的资助政策咨询入口。\n\n" +
  "我可以协助你了解国家与学校层面的奖助学金、助学贷款、绿色通道、勤工助学、困难认定与申诉渠道等信息。回答基于公开政策归纳，个人能否获评、具体金额与时间，请以学校及学院当年正式通知为准。\n\n" +
  "若在这里无法解决你的问题，请拨打揭阳校区资助工作负责老师（谢老师）电话：0663-6603294，或发邮件至 zhongkyxie@gdut.edu.cn；也可先联系所在年级辅导员。\n\n" +
  "更多演示能力（资格审查、计算器、政策匹配等）在侧栏「智能工具」；政策原文与校区联系方式见「资助文件」「校区联系方式」。";

const ASSISTANT_SECOND =
  "你可以点击下方快捷主题，或在输入框自由提问。";

const SOUL_WINDOW_INTRO =
  "你好，欢迎来到「心灵之窗」。\n\n" +
  "你可以在这里聊聊情绪、压力、人际或自我认同等话题。我会尽量温暖、耐心地回应，并陪你一起梳理感受。\n\n" +
  "重要说明：对话由人工智能生成，不能替代心理咨询、精神科诊疗或危机干预；不用于诊断或开药。";

const SOUL_WINDOW_SECOND =
  "若你感到难以承受、出现自伤自杀念头或正在面临紧迫危险，请立即联系身边信任的人，拨打 110 / 120，或心理援助热线（如 400-161-9995，以实际公布为准），并尽快联系学校心理中心或医院急诊。";

const SOUL_QUICK_TOPICS: { id: string; label: string; text: string }[] = [
  { id: "exam", label: "考试焦虑睡不着", text: "最近考试周压力很大，晚上睡不着，脑子一直转，我该怎么缓解？" },
  { id: "peer", label: "和室友相处困难", text: "和室友经常有小摩擦，感觉很压抑，又不想把关系搞僵，怎么办？" },
  { id: "future", label: "对未来很迷茫", text: "对未来特别迷茫，不知道自己适合做什么，觉得很空虚。" },
  { id: "home", label: "想家又不敢说", text: "在外读书很想家，但不敢跟家里说怕他们担心，自己憋着很难受。" },
];

type QuickOption = { id: string; label: string; reply: string };

const QUICK_OPTIONS: QuickOption[] = [
  {
    id: "loan",
    label: "助学贷款怎么申请？",
    reply:
      "【助学贷款（简要）】\n\n" +
      "1. 生源地信用助学贷款：一般在入学前到户籍所在县（区）教育局或资助中心办理，领取《受理证明》，开学后按学校通知提交。\n" +
      "2. 额度：全日制普通本专科生每年申请额度不超过国家规定上限（近年常见为 20000 元/年，以财教〔2024〕188 号及学校执行为准）。\n" +
      "3. 还款与利率：按国家助学贷款政策执行（利率与 LPR 挂钩等），具体以经办银行及合同为准。\n\n" +
      "如需广工返校提交节点、抵扣学费流程，请关注学生工作处/资助中心当年通知。",
  },
  {
    id: "scholarship",
    label: "奖学金申请条件有哪些？",
    reply:
      "【奖学金类型（简要）】\n\n" +
      "常见包括：国家奖学金、国家励志奖学金、校内各类奖学金、社会捐赠奖助学金等。\n\n" +
      "• 国家奖学金：奖励特别优秀的学生，一般对年级、学业与综合表现有较高要求（二年级及以上等，以学校办法为准）。\n" +
      "• 国家励志奖学金：面向品学兼优且家庭经济困难的学生，通常需通过困难认定。\n" +
      "• 校内奖学金：依据综合测评与学校评定办法分批开展。\n\n" +
      "同一学年国家奖学金与国家励志奖学金不可兼得；是否可同时获得国家助学金与其中一项，按当年规定执行。",
  },
  {
    id: "grant",
    label: "国家助学金与困难认定",
    reply:
      "【国家助学金与困难认定（简要）】\n\n" +
      "国家助学金一般面向家庭经济困难学生，通常需先完成家庭经济困难学生认定，再按学年申请与评审。\n\n" +
      "资助标准按国家与学校分档执行（平均资助标准、分档区间等以当年文件为准）。退役士兵本科生等国家另有专门规定。\n\n" +
      "若你尚未在库，可关注每学年开学初的认定与申请通知，并向学院辅导员或资助中心咨询。",
  },
  {
    id: "workstudy",
    label: "勤工助学 / 绿色通道",
    reply:
      "【勤工助学 & 绿色通道（简要）】\n\n" +
      "• 绿色通道：家庭经济困难新生如暂时筹不齐学费，可按报到当天学校安排先办理入学，再核实后给予相应资助（以当年迎新通知为准）。\n" +
      "• 勤工助学：学有余力的学生可申请校内岗位，通过劳动获得报酬；家庭经济困难学生通常优先（以学校办法为准）。\n\n" +
      "具体岗位、薪酬与申请方式请关注学工处/资助中心及学院通知。",
  },
  {
    id: "appeal",
    label: "公示异议与申诉",
    reply:
      "【公示与申诉（简要）】\n\n" +
      "各类奖助学金评审结果一般会按规定公示，并同步开通异议或申诉渠道。\n\n" +
      "如对公示有异议，应按通知要求实名反映、提供具体事实与材料；匿名或缺少事实的反映可能不予受理。\n\n" +
      "具体受理部门与时限以当年通知为准（可向学院辅导员或学生资助管理中心咨询）。",
  },
  {
    id: "official-links",
    label: "官方政策与网页链接",
    reply:
      "【广东工业大学资助信息—官方入口（可复制到浏览器打开）】\n\n" +
      "总入口：学生资助管理中心 https://zxdk.gdut.edu.cn/index.htm\n" +
      "学工处（学生工作处）https://xsc.gdut.edu.cn/\n" +
      "奖助申请系统 http://xsgl.gdut.edu.cn/\n\n" +
      "校级办法：\n" +
      "• 《学生资助工作实施办法》（2025年9月修订）https://xsc.gdut.edu.cn/info/1039/5358.htm\n" +
      "• 《全日制本科学生国家奖助学金实施办法》（2025年9月修订）https://xsc.gdut.edu.cn/info/1039/5367.htm\n" +
      "• 《学生临时困难资助管理办法》https://xsc.gdut.edu.cn/info/1039/5422.htm\n" +
      "• 勤工助学与三助一辅专栏 https://xsc.gdut.edu.cn/xsgl/qgzxyszyf.htm\n\n" +
      "通知与表格：\n" +
      "• 资助中心通知公告 https://zxdk.gdut.edu.cn/index/tzgg/11.htm\n" +
      "• 下载中心（认定表、临时困难申请表等）https://zxdk.gdut.edu.cn/xzzx.htm\n\n" +
      "助学贷款（示例通知，新学年以最新一篇为准）：\n" +
      "• 生源地助学贷款工作通知 https://zxdk.gdut.edu.cn/info/1129/3051.htm\n\n" +
      "具体截止时间、材料以当年学校及学院正式通知为准；智能体回答不能替代审批。",
  },
  {
    id: "contact",
    label: "各校区与资助咨询电话",
    reply:
      "【校区与咨询方式（公开信息归纳）】\n\n" +
      "广东工业大学主要校区包括：大学城校区（校本部，番禺区广州大学城外环西路100号）、东风路校区（越秀区东风东路729号）、龙洞校区（天河区迎龙路161号）、番禺校区（番禺区钟村街市广路11号一带，以学校最新公布为准）、沙河校区（天河区先烈东路131号）、揭阳校区（揭阳市粤东新城大学路1号）等。\n\n" +
      "【校级学生资助管理中心（奖助学金、助学贷款等主咨询）】\n" +
      "办公地点：大学城校区生活区东十东座202室（以官网为准）。\n" +
      "电话：020-39322619、020-39322610\n" +
      "邮箱：xsczdb@gdut.edu.cn\n\n" +
      "【各校区学工联系（转介参考，以学校官网办公电话为准）】\n" +
      "• 东风路校区：学生工作处就业指导管理服务 020-37626136（学工处公开信息）\n" +
      "• 龙洞校区：学生工作处学生就业指导中心 020-87082927（学工处公开信息）\n" +
      "• 揭阳校区：学生工作办公室（0663）6603130（学校官网揭阳校区电话表）\n" +
      "• 番禺校区（国际教育学院等）：学生工作办公室 020-31361917、020-31361920（学校官网番禺校区电话表）\n\n" +
      "资助业务由大学城校区学生资助管理中心统筹；其他校区可先联系学院学生工作办公室或辅导员协助对接。",
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

  const [hfMessages, setHfMessages] = useState<Msg[]>([{ role: "assistant", content: HONGFAN_INTRO }]);
  const [hfInput, setHfInput] = useState("");
  const [hfLoading, setHfLoading] = useState(false);
  const [hfError, setHfError] = useState<string | null>(null);
  const [hfDemoMode, setHfDemoMode] = useState(false);
  const [hfCourseTag, setHfCourseTag] = useState<HongfanCourseId | null>(null);
  const [hfTab, setHfTab] = useState<"chat" | "quiz" | "materials">("chat");
  const hfBottomRef = useRef<HTMLDivElement>(null);

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

  const [fbTopic, setFbTopic] = useState("");
  const [fbContent, setFbContent] = useState("");
  const [fbContact, setFbContact] = useState("");
  const [fbDone, setFbDone] = useState(false);
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

  const dismissWelcomeSplash = useCallback(() => {
    try {
      sessionStorage.setItem(WELCOME_SPLASH_KEY, "1");
    } catch {
      /* ignore */
    }
    setWelcomeSplash(false);
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
    hfBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hfMessages]);

  useEffect(() => {
    soulBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [soulMessages]);

  useEffect(() => {
    const onHash = () => setMainView(mainViewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (isStaticDemo) {
      setDemoMode(true);
      setHfDemoMode(true);
      setSoulDemoMode(true);
    }
  }, []);

  const navigateView = (v: MainView) => {
    setMainView(v);
    window.location.hash = v;
    setSidebarOpen(false);
    if (v === "tools") setTab("screen");
  };

  const hongfanBankFiltered = useMemo(
    () => hongfanItemsForCourse(hfCourseTag),
    [hfCourseTag],
  );

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
          "1) 侧栏页面（政策链接、校区联系方式、反馈箱、事件进度）\n" +
          "2) 聊天区快捷主题按钮（固定回复）\n\n" +
          "若需实时智能问答，请部署后端并配置 VITE_API_BASE 指向后端地址。";
        const atts = suggestPolicyDocAttachments(trimmed);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: demoReply,
            attachments: atts.length ? atts : undefined,
          },
        ]);
      } else {
        const data = await postChat(history, { appScope: "policy" });
        if (data.mode === "demo") setDemoMode(true);
        const atts =
          data.attachments && data.attachments.length > 0
            ? data.attachments
            : suggestPolicyDocAttachments(trimmed);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply,
            attachments: atts.length ? atts : undefined,
          },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setLoading(false);
    }
  };

  const sendHongfan = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || hfLoading) return;
    setHfError(null);
    const nextUser: Msg = { role: "user", content: trimmed };
    setHfMessages((m) => [...m, nextUser]);
    setHfInput("");
    setHfLoading(true);
    const history = [...hfMessages, nextUser].map((x) => ({
      role: x.role,
      content: x.content,
    }));
    try {
      if (isStaticDemo) {
        setHfDemoMode(true);
        const label = hfCourseTag
          ? HONGFAN_COURSES.find((c) => c.id === hfCourseTag)?.full ?? ""
          : "";
        const demoReply =
          "【静态演示】当前为静态站点，红帆知海未连接后端 API。\n\n" +
          (label ? `你已选择读本侧重「${label}」。` : "") +
          "部署后端并配置 VITE_API_BASE 后可使用大模型答疑。";
        setHfMessages((m) => [...m, { role: "assistant", content: demoReply }]);
      } else {
        const data = await postChat(history, {
          appScope: "hongfan",
          courseTag: hfCourseTag,
        });
        if (data.mode === "demo") setHfDemoMode(true);
        setHfMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setHfError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setHfLoading(false);
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
          "【静态演示】当前页面未连接后端 API，心灵之窗无法调用大模型。\n\n" +
          "你值得被认真倾听。请在本地运行后端并配置 VITE_API_BASE，或部署带 API 的站点后再试；紧急情况下请直接拨打 110 / 120 或心理援助热线，并联系学校心理中心。";
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

  const pickHongfanBankItem = (item: HongfanBankItem) => {
    if (hfLoading) return;
    const label = HONGFAN_COURSES.find((c) => c.id === item.courseId)?.full ?? item.courseId;
    setHfError(null);
    setHfMessages((m) => [
      ...m,
      { role: "user", content: `【题库 · ${label}】${item.question}` },
      { role: "assistant", content: item.answer },
    ]);
  };

  const pickQuickOption = (opt: QuickOption) => {
    if (loading) return;
    setError(null);
    const atts = suggestPolicyDocAttachments(`${opt.label}\n${opt.reply}`);
    setMessages((m) => [
      ...m,
      { role: "user", content: opt.label },
      {
        role: "assistant",
        content: opt.reply,
        attachments: atts.length ? atts : undefined,
      },
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
          recommendation: "建议辅导员跟进访谈，核验家庭经济变化。",
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
          matched: ["国家励志奖学金", "校级综合奖学金", "社会捐赠奖助学金（待学院通知）"],
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
          reminders: ["关注学院通知发布时间", "在系统内按时提交申请", "准备佐证材料并备份"],
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
            { college: "计算机学院", rate: 0.94 },
            { college: "机电工程学院", rate: 0.91 },
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
    const id = window.setTimeout(dismissWelcomeSplash, 4000);
    return () => clearTimeout(id);
  }, [welcomeSplash, dismissWelcomeSplash]);

  useEffect(() => {
    if (!welcomeSplash) return;
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
  }, [welcomeSplash]);

  useEffect(() => {
    try {
      localStorage.setItem(QUICK_TOPICS_VISIBLE_KEY, quickTopicsVisible ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [quickTopicsVisible]);

  const submitFeedback = () => {
    if (!fbTopic.trim() || !fbContent.trim()) return;
    const key = "gdut_aid_feedback_entries";
    const entry = {
      ts: Date.now(),
      topic: fbTopic.trim(),
      content: fbContent.trim(),
      contact: fbContact.trim(),
    };
    try {
      const prev = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
      const arr = Array.isArray(prev) ? prev : [];
      localStorage.setItem(key, JSON.stringify([entry, ...arr].slice(0, 100)));
    } catch {
      localStorage.setItem(key, JSON.stringify([entry]));
    }
    setFbDone(true);
    setFbTopic("");
    setFbContent("");
    setFbContact("");
  };

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
          <canvas ref={welcomeCanvasRef} className="welcome-splash-fireworks" aria-hidden="true" />
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
          <span className="sidebar-brand-title">广工学工数智助手</span>
          <span className="sidebar-brand-sub">广东工业大学 · 学工场景一站式</span>
        </div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-link ${mainView === "chat" ? "active" : ""}`}
            onClick={() => navigateView("chat")}
          >
            <span className="sidebar-link-main">政策问答</span>
            <span className="sidebar-link-sub">7×24 资助政策咨询</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "hongfan" ? "active" : ""}`}
            onClick={() => navigateView("hongfan")}
          >
            <span className="sidebar-link-main">红帆知海</span>
            <span className="sidebar-link-sub">思政课本侧重 · 示例题库</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "soul_window" ? "active" : ""}`}
            onClick={() => navigateView("soul_window")}
          >
            <span className="sidebar-link-main">心灵之窗</span>
            <span className="sidebar-link-sub">情感与心理陪伴（大模型）</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "hongge" ? "active" : ""}`}
            onClick={() => navigateView("hongge")}
          >
            <span className="sidebar-link-main">红歌灵境</span>
            <span className="sidebar-link-sub">外链听学唱 · 五首经典</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "tools" ? "active" : ""}`}
            onClick={() => navigateView("tools")}
          >
            <span className="sidebar-link-main">智能工具</span>
            <span className="sidebar-link-sub">审查、测算、匹配、预审等</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "policy" ? "active" : ""}`}
            onClick={() => navigateView("policy")}
          >
            <span className="sidebar-link-main">资助文件与政策</span>
            <span className="sidebar-link-sub">一键跳转官方原文</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "contacts" ? "active" : ""}`}
            onClick={() => navigateView("contacts")}
          >
            <span className="sidebar-link-main">校区联系方式</span>
            <span className="sidebar-link-sub">校区电话、邮箱与地址</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "dashboard" ? "active" : ""}`}
            onClick={() => navigateView("dashboard")}
          >
            <span className="sidebar-link-main">数据看板</span>
            <span className="sidebar-link-sub">进度、完成率、风险概览</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "events" ? "active" : ""}`}
            onClick={() => navigateView("events")}
          >
            <span className="sidebar-link-main">事件处理进度</span>
            <span className="sidebar-link-sub">工单状态与节点追踪</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "feedback" ? "active" : ""}`}
            onClick={() => navigateView("feedback")}
          >
            <span className="sidebar-link-main">反馈箱</span>
            <span className="sidebar-link-sub">问题上报与改进建议</span>
          </button>
          <button
            type="button"
            className={`sidebar-link ${mainView === "admin" ? "active" : ""}`}
            onClick={() => navigateView("admin")}
          >
            <span className="sidebar-link-main">后台管理平台</span>
            <span className="sidebar-link-sub">权限、审计与运行管理</span>
          </button>
        </nav>
      </aside>

      <div
        className={`main-column layout layout-wide${mainView === "chat" || mainView === "hongfan" || mainView === "soul_window" || mainView === "hongge" ? " chat-pure" : ""}`}
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
            {mainView === "chat" && "政策问答"}
            {mainView === "hongfan" && "红帆知海"}
            {mainView === "soul_window" && "心灵之窗"}
            {mainView === "hongge" && "红歌灵境"}
            {mainView === "tools" && "智能工具"}
            {mainView === "policy" && "资助文件与政策"}
            {mainView === "contacts" && "校区联系方式"}
            {mainView === "dashboard" && "数据看板"}
            {mainView === "events" && "事件处理进度"}
            {mainView === "feedback" && "反馈箱"}
            {mainView === "admin" && "后台管理"}
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
              <AgentAvatar className="logo logo-sm" alt="广东工业大学校徽" />
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
                    {msg.role === "assistant" && msg.attachments && msg.attachments.length > 0 && (
                      <div className="chat-attachments" aria-label="相关文件下载">
                        <div className="chat-attachments-title">相关文件</div>
                        <div className="chat-attachments-list">
                          {msg.attachments.map((a) => (
                            <a
                              key={a.filename}
                              className="chat-attachment-link"
                              href={docHref(a.filename)}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {a.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
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
      ) : mainView === "hongfan" ? (
        <>
          {(hfDemoMode || isStaticDemo) && (
            <div className="demo-banner" role="status">
              {isStaticDemo
                ? "静态演示站：红帆知海不会请求后端 API。"
                : "演示模式：未接通大模型或上游限制时，为固定说明文案。"}
            </div>
          )}
          <div className="chat-slim-header">
            <div className="chat-slim-brand">
              <AgentAvatar className="logo logo-sm" alt="广东工业大学校徽" />
              <h1 className="chat-slim-title">红帆知海</h1>
            </div>
          </div>

          <p className="hongfan-scope-note">
            先选读本侧重（可选「不限」）可筛选下方题目；题库由{" "}
            <code className="inline-code">01历年真题及解析/hongfan-bank.json</code>{" "}
            同步到前端（见仓库内同步脚本）。
          </p>

          <div className="course-chip-row" role="group" aria-label="可选课本侧重">
            <span className="course-chip-row-label">读本侧重</span>
            <button
              type="button"
              className={`course-chip ${hfCourseTag === null ? "active" : ""}`}
              onClick={() => setHfCourseTag(null)}
            >
              不限
            </button>
            {HONGFAN_COURSES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`course-chip ${hfCourseTag === c.id ? "active" : ""}`}
                onClick={() => setHfCourseTag(c.id)}
                title={c.full}
              >
                {c.short}
              </button>
            ))}
          </div>

          <div className="hongfan-tab-row" role="tablist" aria-label="红帆知海子页面">
            <button
              type="button"
              role="tab"
              aria-selected={hfTab === "chat"}
              className={`hongfan-tab ${hfTab === "chat" ? "active" : ""}`}
              onClick={() => setHfTab("chat")}
            >
              对话
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={hfTab === "quiz"}
              className={`hongfan-tab ${hfTab === "quiz" ? "active" : ""}`}
              onClick={() => setHfTab("quiz")}
            >
              题库练习
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={hfTab === "materials"}
              className={`hongfan-tab ${hfTab === "materials" ? "active" : ""}`}
              onClick={() => setHfTab("materials")}
            >
              学习材料
            </button>
          </div>

          {hfTab === "quiz" && <HongfanQuizPanel pool={hongfanBankFiltered} />}

          {hfTab === "materials" && (
            <LearningMaterialsPanel apiBase={apiBase} staticSite={learningMaterialsStatic} />
          )}

          {hfTab === "chat" && (
          <details className="hongfan-sample-details">
            <summary>
              题库（共 {HONGFAN_BANK_ITEMS.length} 题
              {hfCourseTag ? ` · 当前筛选 ${hongfanBankFiltered.length} 题` : ""}）
            </summary>
            <p className="hongfan-sample-hint">
              在本机「01历年真题及解析」目录放置 <code className="inline-code">hongfan-bank.json</code>
              后运行 <code className="inline-code">python scripts/sync_hongfan_bank.py</code>{" "}
              再执行 <code className="inline-code">npm run dev</code>。仅使用有权使用的材料。
            </p>
            {hongfanBankFiltered.length === 0 ? (
              <p className="hongfan-sample-hint">
                当前筛选无题目。请同步题库 JSON，或切换「不限」读本侧重。
              </p>
            ) : (
              <div className="hongfan-bank-root">
                {HONGFAN_COURSES.map((c) => {
                  const rows = hongfanBankFiltered.filter((it) => it.courseId === c.id);
                  if (!rows.length) return null;
                  return (
                    <section key={c.id} className="hongfan-bank-block">
                      <h3 className="hongfan-bank-block-title">
                        {c.short} · {c.full}
                      </h3>
                      <ul className="hongfan-bank-list">
                        {rows.map((item) => (
                          <li key={item.id} className="hongfan-bank-row">
                            <button
                              type="button"
                              className="hongfan-bank-insert"
                              onClick={() => pickHongfanBankItem(item)}
                              disabled={hfLoading}
                            >
                              插入
                            </button>
                            <span className="hongfan-bank-q" title={item.question}>
                              {item.question.length > 96 ? `${item.question.slice(0, 96)}…` : item.question}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </details>
          )}

          {hfTab === "chat" && (
          <main className="chat-panel">
            <div className="messages">
              {hfMessages.map((msg, i) => (
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
              {hfLoading && (
                <div className="bubble-row assistant">
                  <AgentAvatar className="bubble-avatar" alt="助手头像" />
                  <div className="bubble assistant thinking">正在思考…</div>
                </div>
              )}
              <div ref={hfBottomRef} />
            </div>

            {hfError && <div className="error-banner">{hfError}</div>}

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void sendHongfan(hfInput);
              }}
            >
              <textarea
                rows={2}
                placeholder="输入你的问题…"
                value={hfInput}
                onChange={(e) => setHfInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendHongfan(hfInput);
                  }
                }}
                disabled={hfLoading}
              />
              <button type="submit" className="send-btn" disabled={hfLoading}>
                发送
              </button>
            </form>
          </main>
          )}

          <p className="tools-back-hint">
            <button type="button" className="text-link" onClick={() => navigateView("chat")}>
              ← 返回政策问答
            </button>
          </p>
        </>
      ) : mainView === "soul_window" ? (
        <>
          {(soulDemoMode || isStaticDemo) && (
            <div className="demo-banner" role="status">
              {isStaticDemo
                ? "静态演示站：心灵之窗不会请求后端 API。"
                : "演示模式：未接通大模型时，为固定说明文案。配置 OPENAI_API_KEY 并对接 DeepSeek 等兼容接口后可使用智能回复。"}
            </div>
          )}
          <div className="chat-slim-header">
            <div className="chat-slim-brand">
              <AgentAvatar className="logo logo-sm" alt="广东工业大学校徽" />
              <h1 className="chat-slim-title">心灵之窗</h1>
            </div>
          </div>

          <p className="soul-window-scope-note">
            本栏目用于情绪倾诉与心理科普向陪伴，<strong>不能替代</strong>学校心理咨询或医疗。遇危机请拨打
            <strong> 110 / 120 </strong>或心理援助热线，并联系本校心理健康教育与咨询中心。
          </p>

          <main className="chat-panel soul-window-panel">
            <div className="messages">
              {soulMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`bubble-row ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  {msg.role === "assistant" && (
                    <AgentAvatar className="bubble-avatar" alt="心灵之窗助手" />
                  )}
                  <div className={`bubble ${msg.role}`}>
                    <div className="bubble-text">{msg.content}</div>
                  </div>
                </div>
              ))}
              {soulLoading && (
                <div className="bubble-row assistant">
                  <AgentAvatar className="bubble-avatar" alt="心灵之窗助手" />
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
          <AgentAvatar className="logo" alt="广东工业大学校徽" />
          <div>
            <h1>广工学工数智助手</h1>
            <p className="subtitle">
              资助政策、思政学习、心理陪伴、红色文化与智能工具一体的学工智能服务演示
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
          <strong>先看「资助文件与政策」再办业务</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">咨询兜底</span>
          <strong>资助中心 020-39322619 / 39322610</strong>
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
              展示资助申请进度、各学院完成率、待处理异议申诉（当前为示例数据接口，可对接真实库）。
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

      {mainView === "policy" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">资助文件与政策链接</h2>
          <p className="tool-intro">
            以下为广东工业大学及上级部门公开网页归纳，便于一键跳转；另有「校级办法与表格」「项目说明」等本站备份文档，可直接打开或下载。具体名额、时间与材料以当年官网最新通知为准。
          </p>
          {POLICY_LINK_GROUPS.map((g) => (
            <div key={g.title} className="portal-block">
              <h3 className="tool-h3">{g.title}</h3>
              <ul className="portal-link-list">
                {g.items.map((item) => (
                  <li key={item.label + item.href}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {mainView === "contacts" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">校区与联系方式</h2>
          <p className="tool-intro">
            信息来自学校公开栏目归纳；若与官网不一致，以{" "}
            <a href="https://xsc.gdut.edu.cn/" target="_blank" rel="noopener noreferrer">
              学工处网站
            </a>{" "}
            及{" "}
            <a href="https://zxdk.gdut.edu.cn/index.htm" target="_blank" rel="noopener noreferrer">
              学生资助管理中心
            </a>{" "}
            最新公布为准。
          </p>
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
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">反馈箱</h2>
          <p className="tool-intro">
            将意见暂存在本机浏览器（localStorage），便于演示；生产环境应接入工单或邮件服务，并遵守隐私与审计要求。
          </p>
          {fbDone && (
            <div className="feedback-toast" role="status">
              已记录，感谢你的反馈。（演示：数据仅存于本机）
            </div>
          )}
          <label className="field-label">主题</label>
          <input
            className="portal-input"
            type="text"
            value={fbTopic}
            onChange={(e) => {
              setFbDone(false);
              setFbTopic(e.target.value);
            }}
            placeholder="例如：希望增加某类政策说明"
          />
          <label className="field-label">内容</label>
          <textarea
            className="json-editor"
            rows={6}
            value={fbContent}
            onChange={(e) => {
              setFbDone(false);
              setFbContent(e.target.value);
            }}
            placeholder="请简要描述问题或建议…"
          />
          <label className="field-label">联系方式（选填）</label>
          <input
            className="portal-input"
            type="text"
            value={fbContact}
            onChange={(e) => {
              setFbDone(false);
              setFbContact(e.target.value);
            }}
            placeholder="学号 / 邮箱 / 手机"
          />
          <div className="tool-actions">
            <button type="button" className="send-btn" onClick={() => submitFeedback()}>
              提交反馈
            </button>
          </div>
        </section>
      )}

      {mainView === "admin" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">后台管理平台</h2>
          <p className="tool-intro">
            本应用为<strong>广工学工数智助手演示前端</strong>，不包含独立的管理员后台。若需正式「后台管理平台」，请在服务端单独部署管理端（身份认证、角色权限、审计日志、与学工数据对接），并通过环境变量配置仅内网或 VPN
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
