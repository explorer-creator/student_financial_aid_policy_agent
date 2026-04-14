import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { suggestPolicyDocAttachments } from "./docAttachmentHints";
import { IntegrityPanel } from "./IntegrityPanel";
import {
  CAMPUS_CONTACT_BLOCKS,
  MOCK_EVENT_TICKETS,
  POLICY_LINK_GROUPS,
  docHref,
} from "./portalData";
import { HonggeLingjingPanel } from "./HonggeLingjingPanel";
import { FraudPreventionPanel } from "./FraudPreventionPanel";
import { ToolResultVisual } from "./toolResultVisual";

type Role = "user" | "assistant";
/** 本地 `public/docs` 用 `filename`；学校官网下载页等用 `href` */
type ChatDocAttachment = { label: string; filename?: string; href?: string };
type Msg = { role: Role; content: string; attachments?: ChatDocAttachment[] };
type Tab = "screen" | "insights" | "calculator" | "match" | "ops";

/** 侧栏一级页面（#hash 同步，便于收藏） */
type MainView =
  | "chat"
  | "tools"
  | "policy"
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
  "policy",
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
  if (!raw) return "chat";
  if (raw === "hongfan") {
    try {
      const base = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", `${base}#chat`);
    } catch {
      /* ignore */
    }
    return "chat";
  }
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
    attachments?: ChatDocAttachment[] | null;
  }>;
}

const ASSISTANT_INTRO =
  "你好，我是「砺志励行小助手」里的资助政策咨询入口。\n\n" +
  "我可以协助你了解国家与学校层面的奖助学金、助学贷款、绿色通道、勤工助学、困难认定与申诉渠道等信息。回答基于公开政策归纳，个人能否获评、具体金额与时间，请以学校及学院当年正式通知为准。\n\n" +
  "若在这里无法解决你的问题，请拨打揭阳校区资助工作负责老师（谢老师）电话：0663-6603294，或发邮件至 zhongkyxie@gdut.edu.cn；也可先联系所在年级辅导员。\n\n" +
  "更多栏目（辨诈防骗、砺心立志、守信立德、暖心润情、政策文件等）在侧栏菜单。";

const ASSISTANT_SECOND =
  "你可以点击下方快捷主题，或在输入框自由提问。";

const SOUL_WINDOW_INTRO =
  "你好，欢迎来到「暖心润情」。\n\n" +
  "你可以在这里聊聊情绪、压力、人际或自我认同等话题。我会尽量温暖、耐心地回应，并陪你一起梳理感受。\n\n" +
  "重要说明：本次对话不能替代心理咨询、精神科诊疗或危机干预；不用于诊断或开药。";

const SOUL_WINDOW_SECOND =
  "若你感到难以承受、出现自伤自杀念头或正在面临紧迫危险，请立即联系身边信任的人，拨打 110 / 120，或心理援助热线（如 400-161-9995，以实际公布为准），并尽快联系学校心理中心或医院急诊。";

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
  /** 显式指定下载区；传空数组表示不根据关键词自动附带文件（避免误匹配） */
  attachments?: ChatDocAttachment[];
};

const ZXDK_XZZX = "https://zxdk.gdut.edu.cn/xzzx.htm";
const ZXDK_TEMP_FORM = "https://zxdk.gdut.edu.cn/info/1139/2690.htm";

const QUICK_OPTIONS: QuickOption[] = [
  {
    id: "loan",
    label: "国家助学贷款如何申请？",
    attachments: [
      {
        label: "《生源地助学贷款申请指南》（.pdf）",
        filename: "student-origin-loan-guide.pdf",
      },
    ],
    reply:
      "【国家助学贷款如何申请】\n\n" +
      "一、学生申请\n" +
      "有贷款需求学生请在入学前到当地区县教育局或资助中心办理国家助学贷款，签订贷款合同，领取《生源地信用助学贷款受理证明》（以下简称《受理证明》）。国家助学贷款额度为本科生最高20000元，研究生最高25000元，可用于缴纳学费、住宿费和弥补生活费等，贷款学生可根据自身经济情况调整申请额度。目前，国家开发银行已开通线上续贷办理功能，办理流程简单方便，续贷学生无需到场办理，办理成功后请打印《受理证明》待入学后提交。\n\n" +
      "二、信息收集\n" +
      "国家开发银行助学贷款学生返校后需提交《受理证明》，《受理证明》空白处请注明学院、学号和联系方式。老生可提交至学院辅导员处，学院收齐后统一提交至资助中心；新生可在各校区绿色通道接待点提交给资助中心工作人员。\n\n" +
      "三、缴费处理\n" +
      "1. 贷款学生原则上只需缴纳超出贷款金额部分的欠费（如欠费9000元，贷款8000元，只需缴纳1000元），剩余欠款待贷款到账后由学校统一抵扣即可，无需提前全额缴纳。超出贷款部分的欠费请主动在“广东工业大学财务处”微信公众号“学生缴费”一栏查询后缴纳，以免影响注册手续办理。\n" +
      "2. 助学贷款预计在11月由贷款银行先拨付到学校对公账号，再由学校财务处抵扣欠费，抵扣完毕后如有贷款结余，结余资金将在第一学期末时退回至学生银行卡中，请确保在学校财务处绑定本人有效的银行卡号，建议将银行卡号升级为一类卡，以免发放失败。\n\n" +
      "相关文件：《生源地助学贷款申请指南》（.pdf）",
  },
  {
    id: "scholarship",
    label: "国家奖助学金有哪些？",
    attachments: [
      {
        label: "《广东工业大学全日制本科学生国家奖助学金实施办法》（.docx）",
        filename: "gdut-national-scholarship-undergrad.docx",
      },
    ],
    reply:
      "【国家奖助学金有哪些】\n\n" +
      "（一）本科生国家奖学金\n" +
      "奖励对象是普通高校全日制本科二年级及以上优秀在校学生，奖励标准为每生每年10000元。同一学年内，获得国家奖学金的家庭经济困难学生可以同时申请并获得国家助学金，但不能同时获得国家励志奖学金。\n\n" +
      "（二）本科生国家励志奖学金\n" +
      "奖励对象是品学兼优、家庭经济困难的二年级及以上的普通高校全日制本科在校生，奖励标准为每生每年6000元。同一学年内，获得国家励志奖学金的家庭经济困难学生可以同时申请并获得国家助学金，但不能同时获得国家奖学金。\n\n" +
      "（三）本科生国家助学金\n" +
      "资助对象是家庭经济困难的普通高校全日制本科在校学生（含预科生），平均资助标准为每生每年3700元，具体标准由学校在每生每年2500-5000元范围内确定，分为2-3档。全日制在校退役士兵学生原则上都可享受本科生国家助学金，资助标准为每生每年3700元。\n\n" +
      "相关文件：\n" +
      "1. 《广东工业大学全日制本科学生国家奖助学金实施办法》",
  },
  {
    id: "grant",
    label: "家庭经济困难认定如何申请？",
    attachments: [
      {
        label: "《广东省家庭经济困难学生认定申请表》（.doc）",
        filename: "appendix1-difficulty-recognition-form.doc",
      },
      {
        label: "《广东工业大学家庭经济困难学生认定实施办法》（广工大规字〔2023〕16号）等（资助中心规章制度）",
        href: "https://zxdk.gdut.edu.cn/index/gzzd.htm",
      },
      {
        label: "《广东省家庭经济困难学生认定工作指标解释》《放弃说明》模板等（资助中心下载中心）",
        href: ZXDK_XZZX,
      },
    ],
    reply:
      "【家庭经济困难认定如何申请】\n\n" +
      "为做好我校家庭经济困难学生资助工作，根据《广东省家庭经济困难学生认定实施办法》（粤教助〔2023〕2号）、《广东工业大学家庭经济困难学生认定工作实施办法》（广工大规字〔2023〕16号）等文件精神，现将我校家庭经济困难认定工作安排如下：\n\n" +
      "一、认定对象：就读我校的全日制本科生、全日制研究生和少数民族预科生。\n\n" +
      "二、认定程序\n" +
      "（一）学生申请\n" +
      "学生登陆“学生工作信息管理系统”（http://xsgl.gdut.edu.cn/）点击“事务管理”——“家庭经济困难认定”——“当前学年家庭经济困难学生认定”，提出家庭经济困难认定申请，对照本人纸质材料内容如实填写相关选项。同时向所在学院提交《广东省家庭经济困难学生认定申请表》、户口本复印件及相关证明材料，证明材料提交要求请参照《广东省家庭经济困难学生认定工作指标解释》（以下简称《指标解释》）。\n\n" +
      "（二）年级评议小组评议\n" +
      "年级评议小组应按照《指标解释》，在学工系统对学生申请材料进行严格审核，审核过程中如发现不符合要求的情况，应退回学生申请，通知其修改并重新提交后再次审核。经年级评议后，初步认定是否为家庭经济困难学生，并在本年级公示3天无异议后，报学院认定工作小组审核。评议小组审核与学生申请同时进行，请小组合理安排时间。\n\n" +
      "（三）学院审核公示\n" +
      "学院认定工作小组审核。学院认定工作小组依照职权对年级评议小组提出名单进行审核。初步家庭经济困难学生名单在学院公示3天无异议后，报学校认定工作组复核。\n" +
      "为确保学生材料真实性，各学院应通过电访、家访、函询等方式随机抽查，抽查面不得少于学院申请人数（本科生+研究生总数）的10%，做好抽查记录。\n\n" +
      "（四）学校评审\n" +
      "学院审核完毕后，由学校组织评审小组，通过学生工作信息管理系统进行材料交叉评审。申请学生在此期间应自行留意审核情况，审核不通过的学生，应在交叉评审截止日期前补齐材料，重新提交审核。在截止日期后交叉评审仍不通过的学生，不再进入下一认定环节。\n\n" +
      "（五）名单报送\n" +
      "学校将广东省教育厅学生资助综合管理系统划线认定结果反馈给学院，各学院应将家庭经济困难学生名单及相关认定等级，在年级（专业或班级）、学院内线上线下同时进行公示5个工作日，公示内容包括学生姓名、学院、专业、班级、困难等级等必要信息，但严禁涉及学生个人敏感信息及隐私。\n" +
      "学校汇总各学院家庭经济困难学生名单，提出全校家庭经济困难学生名单，全校公示5个工作日无异议后，报学校资助工作领导小组批准。\n\n" +
      "三、工作要求\n" +
      "1. 加大宣传，不漏一人。确保家庭经济困难学生知晓资助政策、申请流程及申请时间，做到按时申请，按时报送。年级评定小组及学院应留意特殊群体学生，对于未申请的特殊群体学生，应予以提醒申请；已申请但如相关证明缺失，可根据资助中心提供的特殊群体学生名单予以豁免该项证明材料，并且在审核意见备注提醒。特殊群体学生名单后续由资助管理中心发送给各学院参考。\n" +
      "2. 自愿申请，诚实提交。原则上学生应自愿提出申请，不按时申请视为自愿放弃；但原建档立卡、低保户等特殊群体学生放弃申请的，需提供书面放弃说明。\n" +
      "3. 学院做好诚信教育。学生严格按照《指标解释》填写申请材料，不得填写不符合自身情况的选项，不得提交与认定指标无关的证明材料，证明材料应清晰可辨。如发现弄虚作假、骗取资助等情况将追回相关资助，并依据《广东工业大学学生违纪处分办法》第十九条和第二十九条处理。\n" +
      "4. 加强归档，做好留痕。根据相关工作通知文件要求，请各学院将学生申请材料做好归档，相关电子档案及纸质材料按要求保存至少10年。\n\n" +
      "相关文件：\n" +
      "1. 《广东工业大学家庭经济困难学生认定实施办法》\n" +
      "2. 《广东省家庭经济困难学生认定申请表》\n" +
      "3. 《广东省家庭经济困难学生认定工作指标解释》\n" +
      "4. 《放弃说明》模板\n\n" +
      "校级办法正文、指标解释与放弃说明等可在学工处网站或资助中心「下载中心」获取最新版：" +
      ZXDK_XZZX,
  },
  {
    id: "temp_hardship",
    label: "临时困难资助如何申请？",
    attachments: [
      {
        label: "《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）（.docx）",
        filename: "gdut-temporary-hardship-aid.docx",
      },
      { label: "广东工业大学学生临时困难资助申请表（资助中心下载页）", href: ZXDK_TEMP_FORM },
      { label: "学生临时困难资助证明材料清单等（下载中心）", href: ZXDK_XZZX },
    ],
    reply:
      "【临时困难资助如何申请】\n\n" +
      "为帮助学生顺利度过在校期间遇到的临时性或突发性困难，保障学生安心在校学习、顺利完成学业，学校设立学生临时困难资助项目，相关管理办法按《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）执行。\n\n" +
      "一、申请对象：我校在校预科生、本科生及研究生。\n\n" +
      "二、申请条件\n" +
      "（一）热爱祖国，拥护中国共产党的领导；\n" +
      "（二）遵守宪法和法律，遵守学校规章制度；\n" +
      "（三）诚实守信，品学兼优，自立自强；\n" +
      "（四）具有中华人民共和国国籍；\n" +
      "（五）提交申请前，已办理注册手续、缴清学费及住宿费等代收费或办理助学贷款手续；\n" +
      "（六）在校期间出现家庭经济困难并严重影响学生在校基本学习和生活。\n" +
      "（七）新入学家庭经济困难学生。\n\n" +
      "三、评审程序\n" +
      "（一）学生申请：符合申请条件的学生，填写学生临时困难资助申请表，并向学院提交相关证明材料。学生因重病等原因无法本人申请的，由其辅导员或家属代为申请。\n" +
      "（二）学院初审与学院公示：学院须认真审查学生的申请，填写审查意见，经分管学生工作的院领导审批后，在学院范围内公示5个工作日。学院于每月上旬将公示无异议的申报材料加盖公章后报送至学生资助管理中心。\n" +
      "（三）学校复审与学校公示：学校当月学生临时困难资助评审小组评审确定当月申请学生具体资助金额。评审结果在全校范围内公示5个工作日。\n" +
      "（四）发放资助金：学生资助管理中心将公示无异议的受助名单报送财务处，由财务处统一委托银行以划账方式发放到学生个人银行账户。\n\n" +
      "相关文件：\n" +
      "1. 《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）\n" +
      "2. 广东工业大学学生临时困难资助申请表\n" +
      "3. 学生临时困难资助证明材料清单",
  },
  {
    id: "military_funding",
    label: "服义务兵役学费补偿贷款代偿如何申请？",
    attachments: [],
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
      "（一）学生申请材料：学生按照不同类型，需准备《入伍通知书》复印件、登录全国征兵网在线填写打印的《应征入伍服兵役高等学校学生国家教育资助申请表Ⅰ》或《申请表Ⅱ》一式两份（个人基本信息手填或复印无效），并按要求到征兵部门或退役军人事务部门盖章后提交学生资助管理中心审核；毕业生另需提供学位证、毕业证复印件等。退役复学/退役入学另需《退役证》复印件、录取通知书或复学通知书等。\n" +
      "（二）相关要求及说明：申请退役士兵学费资助的学生应完成退役军人服务中心（站）建档立卡或信息更正；材料需先到批准入伍地县级征兵办公室及学校财务处等审核后再报送资助中心；省教育厅审批通过后由财务处统一发放（时间以当年通知为准）。\n\n" +
      "相关文件（表格请按当年通知版本在以下入口获取）：\n" +
      "1. 广东工业大学退役士兵国家助学金申请表等（资助中心下载中心）\n" +
      "2. 广东工业大学退役复学（入学）学生国家教育资助续报申请表（非首次申请学生适用）等（资助中心下载中心）\n" +
      ZXDK_XZZX,
  },
  {
    id: "newborn_temp",
    label: "新生临时困难资助如何申请？",
    attachments: [
      {
        label: "《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）（.docx）",
        filename: "gdut-temporary-hardship-aid.docx",
      },
      { label: "广东工业大学学生临时困难资助申请表（资助中心下载页）", href: ZXDK_TEMP_FORM },
      { label: "学生临时困难资助证明材料清单等（下载中心）", href: ZXDK_XZZX },
    ],
    reply:
      "【新生临时困难资助如何申请】\n\n" +
      "根据《广东工业大学学生临时困难资助管理办法》，新入学家庭经济困难学生符合条件，在校就读期间一次性给予500元/人资助。具体条件及递交的材料于资助中心发布的说明/PDF为准；需要申请的同学请递交申请表+佐证材料的纸质版。材料给辅导员填写学院意见后，交到创新中心203谢崇楷老师处。谢谢！\n\n" +
      "相关文件：\n" +
      "1. 《广东工业大学学生临时困难资助管理办法》（广工大规字〔2024〕14号）\n" +
      "2. 广东工业大学学生临时困难资助申请表\n" +
      "3. 学生临时困难资助证明材料清单",
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
          "1) 侧栏各模块（问策解惑、辨诈防骗、砺心立志、守信立德、暖心润情、政策文件等）\n" +
          "2) 问策解惑内快捷主题按钮（固定回复与相关文件链接）\n\n" +
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

  const pickQuickOption = (opt: QuickOption) => {
    if (loading) return;
    setError(null);
    const atts =
      opt.attachments !== undefined
        ? opt.attachments
        : suggestPolicyDocAttachments(`${opt.label}\n${opt.reply}`);
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
          <span className="sidebar-brand-sub">广东工业大学揭阳校区-资助赋能智能体</span>
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
          <button
            type="button"
            className={`sidebar-link ${mainView === "policy" ? "active" : ""}`}
            onClick={() => navigateView("policy")}
          >
            <span className="sidebar-link-main">政策文件</span>
            <span className="sidebar-link-sub">源于学校相关实施细则</span>
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
            {mainView === "policy" && "政策文件"}
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
                          {msg.attachments.map((a, ai) => {
                            const href =
                              a.href ?? (a.filename ? docHref(a.filename) : undefined);
                            if (!href) {
                              return (
                                <span key={`${a.label}-${ai}`} className="chat-attachment-link">
                                  {a.label}
                                </span>
                              );
                            }
                            return (
                              <a
                                key={href + a.label + ai}
                                className="chat-attachment-link"
                                href={href}
                                {...(a.filename ? { download: true } : {})}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {a.label}
                              </a>
                            );
                          })}
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
              <AgentAvatar className="logo logo-sm" alt="广东工业大学校徽" />
              <h1 className="chat-slim-title">暖心润情</h1>
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
          <AgentAvatar className="logo" alt="广东工业大学校徽" />
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
          <strong>先看「资助文件与政策」再办业务</strong>
        </div>
        <div className="overview-card">
          <span className="overview-label">咨询兜底</span>
          <strong>
            0663-6603294
            <br />
            zhongkyxie@gdut.edu.cn
          </strong>
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
        <IntegrityPanel onBack={() => navigateView("chat")} />
      )}

      {mainView === "admin" && (
        <section className="tool-panel portal-page">
          <h2 className="tool-h2">后台管理平台</h2>
          <p className="tool-intro">
            本应用为<strong>砺志励行小助手演示前端</strong>，不包含独立的管理员后台。若需正式「后台管理平台」，请在服务端单独部署管理端（身份认证、角色权限、审计日志、与学工数据对接），并通过环境变量配置仅内网或 VPN
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
