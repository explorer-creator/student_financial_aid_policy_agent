import { FlipScreenStory, type StorySlide } from "./FlipScreenStory";

type FraudCase = {
  id: string;
  title: string;
  summary: string;
};

const AVATAR_SRC = `${import.meta.env.BASE_URL}gdut-avatar.png`;

const FRAUD_CASES: FraudCase[] = [
  {
    id: "new-student-luggage",
    title: "热情帮忙，拎走行李一去不回",
    summary:
      "新生报到时最容易被“热心人”盯上：先快速建立信任，再制造分工场景，把你和行李分开。常见话术是“我带你办手续、同伴帮你看包”，几分钟就可能造成大额损失。防范动作：只认学校统一接待点和正规证件；现金、证件、手机、电脑不离身；遇到陌生人催你“快点走流程”，先停下来核实。",
  },
  {
    id: "dorm-sales",
    title: "路上和宿舍推销，假冒伪劣需防范",
    summary:
      "诈骗者常冒充“学长学姐/社会实践团队”，以返利、兼职、校园合作等名义上门推销。套路核心不是商品，而是让你在“熟人语气+限时优惠”里失去判断。防范动作：校内陌生上门营销一律提高警惕；不现场付款、不扫码授权、不转押金；涉及班级或学院活动必须由辅导员或学院官方渠道可核验。",
  },
  {
    id: "scan-lottery",
    title: "莫贪小利，警惕商家霸王消费",
    summary:
      "“扫码抽奖领礼品”看起来门槛低、收益快，但背后常捆绑下载 App、开通会员、自动续费与信息采集。你以为拿到的是小礼品，对方拿走的可能是支付授权和隐私数据。防范动作：陌生二维码不扫；任何“先授权后领奖”默认高风险；发现异常扣费，立即解绑银行卡、修改支付密码并保留证据投诉。",
  },
  {
    id: "campus-loan",
    title: "校园贷骗局，校园里的借款套路",
    summary:
      "校园贷套路通常从“无抵押、低利率、秒放款”开始，真正放款时却层层扣除中介费、服务费、展期费。表面上借了钱，实际到手金额很少，后续又被滚动收费拖入债务循环。防范动作：远离非正规平台与私人中介；资金紧张优先走学校资助、绿色通道和正规银行渠道；任何借贷合同先找老师或懂法同学复核。",
  },
  {
    id: "mlm",
    title: "高度警戒，远离非法传销",
    summary:
      "非法传销最常用“高回报+内部机会”包装自己，先让你缴费入会，再要求发展下线。它利用的是年轻人想快速改善生活的心理，而不是提供真实价值。识别标准很明确：拉人头返利、缴费入门、收益严重夸大，三者出现任一项都应立即远离。必要时保留聊天记录并及时报警。",
  },
  {
    id: "phone-scam",
    title: "诈骗电话，骗取隐私及财物",
    summary:
      "电话诈骗喜欢打“权威牌”：冒充教育局、财政局、学校部门，说你有助学金或补贴待发放。随后以“核验信息”为名索要验证码、银行卡号，或直接诱导你转账“解冻”。请记住：任何正规机构都不会电话索取验证码。防范动作：挂断后自行拨打官网电话回拨核实，不点陌生链接，不做远程共享。",
  },
  {
    id: "fake-poor-student",
    title: "假装可怜，同情心换来财务损失",
    summary:
      "“小额借钱”诈骗常通过连续、急迫、可怜叙事来降低你的防备，让你在同情中忽略核验。单次金额不大，但高频反复会累计成明显损失。防范动作：借款前先核实身份、用途和归还计划；尽量不现金交易，保留聊天与转账记录；对方若回避核验、反复催促，及时止损并向老师或警方求助。",
  },
];

function LogoSm() {
  return (
    <img className="logo logo-sm" src={AVATAR_SRC} alt="广东工业大学校徽" loading="eager" decoding="async" />
  );
}

export function FraudPreventionPanel({ onBack }: { onBack: () => void }) {
  const splashSrc = `${import.meta.env.BASE_URL}welcome-splash.png`;
  const fraudImages = [
    `${import.meta.env.BASE_URL}fraud-images/fraud-01.png`,
    `${import.meta.env.BASE_URL}fraud-images/fraud-02.png`,
    `${import.meta.env.BASE_URL}fraud-images/fraud-03.png`,
    `${import.meta.env.BASE_URL}fraud-images/fraud-04.png`,
    `${import.meta.env.BASE_URL}fraud-images/fraud-05.png`,
    `${import.meta.env.BASE_URL}fraud-images/fraud-06.png`,
    `${import.meta.env.BASE_URL}fraud-images/fraud-07.png`,
  ];

  return (
    <>
      <div className="chat-slim-header">
        <div className="chat-slim-brand">
          <LogoSm />
          <h1 className="chat-slim-title">辨诈防骗</h1>
        </div>
      </div>

      <FlipScreenStory
        className="flip-story-compact"
        slides={[
          {
            id: "anti-fraud-intro",
            tag: "模块开头",
            title: "先停一下，这两分钟很值钱",
            text:
              "同学，请先停一下，花两分钟看完这段提醒——这两分钟，可能值你一个月生活费。你手里的每一笔助学金、勤工俭学工资、家里凑出的学费，都很沉重。诈骗分子专盯“着急用钱”和“信息不对称”的学生群体，用热心、权威、福利、兼职这些包装让你放下戒备。这个板块不讲空话，只讲真实发生过的陷阱与可执行的避坑动作。",
            imageSrc: splashSrc,
            imageAlt: "识诈防骗开场图",
          },
          ...FRAUD_CASES.map<StorySlide>((c, idx) => ({
            id: c.id,
            tag: "典型案例",
            title: c.title,
            text: c.summary,
            imageSrc: fraudImages[idx] ?? splashSrc,
            imageAlt: `${c.title} 配图`,
          })),
          {
            id: "anti-fraud-outro",
            tag: "模块结尾",
            title: "记住三条铁律",
            text:
              "看完案例你也许会想“我不会被骗”，但很多受害者在转账前一秒也这么想。请记住三条铁律：第一，凡是让你先交钱的“好事”，大概率是坏事；第二，凡是催你立刻转账的“老师/学长/客服”，先挂断再核实；第三，只要觉得不对劲，立刻找辅导员、保卫处或砺行小助手求助。宁可多核验一次，也不要让一次冲动决定带来长期损失。",
            imageSrc: splashSrc,
            imageAlt: "识诈防骗结尾图",
          },
        ]}
      />

      <p className="tools-back-hint">
        <button type="button" className="text-link" onClick={onBack}>
          ← 返回问策解惑
        </button>
      </p>
    </>
  );
}

