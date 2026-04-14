import { FlipScreenStory, type StorySlide } from "./FlipScreenStory";

const AVATAR_SRC = `${import.meta.env.BASE_URL}gdut-avatar.png`;

export function IntegrityPanel({ onBack }: { onBack: () => void }) {
  const splashSrc = `${import.meta.env.BASE_URL}welcome-splash.png`;
  const integrityImages = [
    `${import.meta.env.BASE_URL}integrity-images/integrity-01.png`,
    `${import.meta.env.BASE_URL}integrity-images/integrity-02.png`,
    `${import.meta.env.BASE_URL}integrity-images/integrity-03.png`,
    `${import.meta.env.BASE_URL}integrity-images/integrity-04.png`,
  ];

  const slides: StorySlide[] = [
    {
      id: "integrity-intro",
      tag: "模块开头",
      title: "守信立德：诚信不是口号，是选择",
      text:
        "在困难来临时，最容易被放下的往往是“承诺”；但真正能托住一个人长期成长的，恰恰是守信。这个模块通过真实案例告诉同学们：诚信不是顺境里的体面，而是逆境中的担当。",
      imageSrc: splashSrc,
      imageAlt: "守信立德开场图",
    },
    {
      id: "zhao-qingxiu",
      tag: "典型案例",
      title: "赵青秀：一诺千金，危难之中守诚信",
      text:
        "父亲重伤住进 ICU、母亲术后未愈，家庭短期失去经济来源。她在网络求助时明确承诺还款期限，并在毕业工作后持续履约，按筹款渠道逐笔归还。即便有人劝其“可不还”，她仍坚持守约，证明了“受助不失责、得助不忘本”的青年品格。",
      imageSrc: integrityImages[0],
      imageAlt: "赵青秀案例配图",
    },
    {
      id: "hu-qihui",
      tag: "典型案例",
      title: "胡奇卉一家：以劳践诺，倾尽心力还善意",
      text:
        "孩子重病期间，家庭通过平台两次筹款近 59 万元。康复后，夫妻二人没有把善款视为“理应所得”，而是通过长期劳动与节省开支，按原路径完成全额退还。这个案例强调：困难求助可以被理解，但承诺兑现更能维护社会信任。",
      imageSrc: integrityImages[1],
      imageAlt: "胡奇卉一家案例配图",
    },
    {
      id: "jiang",
      tag: "典型案例",
      title: "蒋先生：时隔七年，初心不改还善款",
      text:
        "父亲重病时筹集善款渡过难关，他将“受助是恩情，不是理所当然”放在心里。七年后经济条件改善，主动联系平台核对信息并逐笔退还。时间拉长并未稀释承诺，这份长期守信本身就是最有说服力的诚信教育。",
      imageSrc: integrityImages[2],
      imageAlt: "蒋先生案例配图",
    },
    {
      id: "xu-licheng",
      tag: "典型案例",
      title: "许立城：信守约定，善意流转有回音",
      text:
        "妻子重病时接受社会帮助后，他在后续两年内制定计划、分批退还全部善款，并保持沟通反馈。这个案例展示了“有责任、有计划、有交代”的守信路径：诚信不是一次表态，而是可执行、可追踪的持续行动。",
      imageSrc: integrityImages[3],
      imageAlt: "许立城案例配图",
    },
    {
      id: "integrity-outro",
      tag: "模块结尾",
      title: "守住信用，才能守住未来",
      text:
        "诚信不是让人“显得高尚”，而是让彼此合作更可预期、让善意循环更可持续。守信立德想传递的是：困难可以被理解，失信不应被合理化。愿每位同学都把“说到做到”变成长期习惯，让自己成为值得信赖的人。",
      imageSrc: splashSrc,
      imageAlt: "守信立德结尾图",
    },
  ];

  return (
    <>
      <div className="chat-slim-header">
        <div className="chat-slim-brand">
          <img className="logo logo-sm" src={AVATAR_SRC} alt="广东工业大学校徽" loading="eager" decoding="async" />
          <h1 className="chat-slim-title">守信立德</h1>
        </div>
      </div>

      <FlipScreenStory className="flip-story-compact" slides={slides} />

      <p className="tools-back-hint">
        <button type="button" className="text-link" onClick={onBack}>
          ← 返回问策解惑
        </button>
      </p>
    </>
  );
}

