import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { HongfanBankItem } from "./hongfanData";
import {
  bookDisplayName,
  bookProgressKey,
  buildFillBlank,
  bumpProgress,
  chapterStudyHint,
  courseLabel,
  extractOfficialLetter,
  loadQuizProgress,
  parseMcFromQuestion,
  saveQuizProgress,
  type QuizMode,
} from "./hongfanQuizUtils";

const TIME_LIMIT_SEC = 60;
const POINTS_CORRECT = 5;
const POINTS_PARTICIPATE = 1;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Phase = "pick" | "learn" | "quiz" | "feedback";

type Props = {
  pool: HongfanBankItem[];
};

export function HongfanQuizPanel({ pool }: Props) {
  const [mode, setMode] = useState<QuizMode | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [queue, setQueue] = useState<HongfanBankItem[]>([]);
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SEC);
  const [selected, setSelected] = useState<string | null>(null);
  const [fillValue, setFillValue] = useState("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastExplain, setLastExplain] = useState("");
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [starBurst, setStarBurst] = useState(false);
  const [progress, setProgress] = useState(loadQuizProgress);
  const tickRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const current = queue[index] ?? null;
  const parsed = useMemo(() => (current ? parseMcFromQuestion(current.question) : null), [current]);
  const fill = useMemo(() => {
    if (!parsed?.stem || mode !== "fill") return null;
    return buildFillBlank(parsed.stem);
  }, [parsed, mode]);

  const bookTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of pool) {
      const k = bookProgressKey(it);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [pool]);

  const official = current ? extractOfficialLetter(current.answer) : null;

  const clearTick = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const finishQuestion = useCallback((correct: boolean, points: number, explain: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setLastCorrect(correct);
    setLastPoints(points);
    setLastExplain(explain);
    const it = queue[index];
    if (it) {
      const bk = bookProgressKey(it);
      const total = bookTotals.get(bk) ?? 1;
      setProgress((prev) => {
        const next = bumpProgress(prev, bk, total, points);
        saveQuizProgress(next);
        return next;
      });
    }
    setSessionAnswered((s) => {
      const nextCount = s + 1;
      if (nextCount > 0 && nextCount % 10 === 0) {
        setStarBurst(true);
        window.setTimeout(() => setStarBurst(false), 3200);
      }
      return nextCount;
    });
    setPhase("feedback");
    clearTick();
  }, [queue, index, bookTotals]);

  useEffect(() => () => clearTick(), []);

  useEffect(() => {
    if (phase === "learn" || phase === "quiz") submittedRef.current = false;
  }, [index, phase]);

  useEffect(() => {
    clearTick();
    if (phase !== "quiz" || !current) return;
    setTimeLeft(TIME_LIMIT_SEC);
    tickRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTick();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearTick();
  }, [phase, current, index]);

  useEffect(() => {
    if (phase !== "quiz" || timeLeft !== 0 || !current) return;
    finishQuestion(false, 0, "时间到，本题未得分。");
  }, [phase, timeLeft, current, finishQuestion]);

  const startRound = useCallback(() => {
    if (!mode || pool.length === 0) return;
    const cap = Math.min(50, pool.length);
    setQueue(shuffle(pool).slice(0, cap));
    setIndex(0);
    setSelected(null);
    setFillValue("");
    setSessionAnswered(0);
    setPhase("learn");
  }, [mode, pool]);

  const goQuiz = () => {
    setSelected(null);
    setFillValue("");
    setTimeLeft(TIME_LIMIT_SEC);
    setPhase("quiz");
  };

  const submitMc = () => {
    if (!current || !parsed) return;
    if (!selected) {
      setLastExplain("请先选择一个选项。");
      return;
    }
    if (official) {
      const ok = selected === official;
      finishQuestion(ok, ok ? POINTS_CORRECT : 0, ok ? `回答正确，+${POINTS_CORRECT} 分。` : `正确选项为 ${official}。`);
      return;
    }
    finishQuestion(
      false,
      POINTS_PARTICIPATE,
      `本题未标注标准答案，无法判定对错；参与练习 +${POINTS_PARTICIPATE} 分，请对照教材自核。`,
    );
  };

  const submitFill = () => {
    if (!fill) return;
    const ok = fillValue.trim() === fill.answer;
    finishQuestion(
      ok,
      ok ? POINTS_CORRECT : 0,
      ok ? `填空正确，+${POINTS_CORRECT} 分。` : `未完全匹配；参考答案：「${fill.answer}」。`,
    );
  };

  const nextQuestion = () => {
    if (index + 1 >= queue.length) {
      setPhase("pick");
      setMode(null);
      setQueue([]);
      setIndex(0);
      setSessionAnswered(0);
      setTimeLeft(TIME_LIMIT_SEC);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFillValue("");
    setTimeLeft(TIME_LIMIT_SEC);
    setPhase("learn");
  };

  if (pool.length === 0) {
    return <p className="hongfan-quiz-empty">当前筛选下无题目，请切换「不限」读本或同步题库后再试。</p>;
  }

  return (
    <div className="hongfan-quiz-root">
      {starBurst && (
        <div className="hongfan-star-burst" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="hongfan-star-bit"
              style={
                {
                  animationDelay: `${i * 0.07}s`,
                  left: `${38 + (i % 9) * 3}%`,
                  transform: `rotate(${i * 26}deg)`,
                } as CSSProperties
              }
            >
              ✦
            </span>
          ))}
        </div>
      )}

      <div className="hongfan-quiz-head">
        <h2 className="hongfan-quiz-title">题库练习</h2>
        <p className="hongfan-quiz-sub">
          每题限时 {TIME_LIMIT_SEC} 秒 · 答对 +{POINTS_CORRECT} 分 · 先快速学习再答题 · 每完成 10 题有星星动画
          {sessionAnswered > 0 ? ` · 本轮已累计 ${sessionAnswered} 题` : ""}
        </p>
      </div>

      <div className="hongfan-quiz-progress-wrap" aria-label="各书本练习进度">
        {Array.from(bookTotals.entries()).map(([key, total]) => {
          const p = progress.books[key] ?? { practiced: 0, score: 0, total };
          const pct = total > 0 ? Math.min(100, Math.round((p.practiced / total) * 100)) : 0;
          return (
            <div key={key} className="hongfan-quiz-book">
              <div className="hongfan-quiz-book-label">
                <span>{key.split("::")[1] ?? key}</span>
                <span className="hongfan-quiz-book-meta">
                  已练 {p.practiced}/{total} · 累计 {p.score} 分
                </span>
              </div>
              <div className="hongfan-quiz-bar">
                <div className="hongfan-quiz-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {phase === "pick" && (
        <div className="hongfan-quiz-card">
          <p className="hongfan-quiz-prompt">你想用哪种方式练习？</p>
          <div className="hongfan-quiz-mode-row">
            <button
              type="button"
              className={`hongfan-quiz-mode-btn ${mode === "mc" ? "active" : ""}`}
              onClick={() => setMode("mc")}
            >
              选择题
            </button>
            <button
              type="button"
              className={`hongfan-quiz-mode-btn ${mode === "fill" ? "active" : ""}`}
              onClick={() => setMode("fill")}
            >
              填空题
            </button>
          </div>
          <button type="button" className="hongfan-quiz-primary" disabled={!mode} onClick={startRound}>
            开始本轮（最多 50 题）
          </button>
          <p className="hongfan-quiz-hint">题目来自当前「读本侧重」筛选；进度保存在本机浏览器。</p>
        </div>
      )}

      {(phase === "learn" || phase === "quiz" || phase === "feedback") && current && (
        <div className="hongfan-quiz-card">
          <div className="hongfan-quiz-meta-row">
            <span className="hongfan-quiz-badge">{bookDisplayName(current)}</span>
            <span className="hongfan-quiz-badge dim">{current.id}</span>
            <span className="hongfan-quiz-badge accent">
              {mode === "mc" ? "选择题" : "填空题"} · {index + 1}/{queue.length}
            </span>
          </div>

          {phase === "learn" && (
            <>
              <h3 className="hongfan-quiz-learn-title">先学习（请记住章节定位）</h3>
              <p className="hongfan-quiz-chapter">{chapterStudyHint(current)}</p>
              <p className="hongfan-quiz-course-line">读本：{courseLabel(current.courseId)}</p>
              <div className="hongfan-quiz-learn-box">
                {(parsed?.stem ?? current.question).length > 420
                  ? `${(parsed?.stem ?? current.question).slice(0, 420)}…`
                  : (parsed?.stem ?? current.question)}
              </div>
              <p className="hongfan-quiz-hint">浏览要点后进入限时答题。</p>
              <button type="button" className="hongfan-quiz-primary" onClick={goQuiz}>
                已浏览，开始限时答题
              </button>
            </>
          )}

          {phase === "quiz" && (
            <>
              <div className="hongfan-quiz-timer">
                <span>剩余时间</span>
                <strong className={timeLeft <= 10 ? "warn" : ""}>{timeLeft}s</strong>
              </div>

              {mode === "mc" && parsed && (
                <>
                  <p className="hongfan-quiz-stem">{parsed.stem}</p>
                  {parsed.options.length > 0 ? (
                    <div className="hongfan-quiz-options">
                      {parsed.options.map((o) => (
                        <button
                          key={o.letter}
                          type="button"
                          className={`hongfan-quiz-opt ${selected === o.letter ? "picked" : ""}`}
                          onClick={() => setSelected(o.letter)}
                        >
                          <span className="hongfan-quiz-opt-letter">{o.letter}</span>
                          <span className="hongfan-quiz-opt-text">{o.text}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="hongfan-quiz-warn">本题未能自动拆出选项，请返回选题模式或换一题。</p>
                  )}
                  <button type="button" className="hongfan-quiz-primary" onClick={submitMc} disabled={parsed.options.length === 0}>
                    提交答案
                  </button>
                </>
              )}

              {mode === "fill" && fill && (
                <>
                  <p className="hongfan-quiz-stem">{fill.display}</p>
                  <label className="hongfan-quiz-fill-label">
                    填入空缺
                    <input
                      className="hongfan-quiz-fill-input"
                      value={fillValue}
                      onChange={(e) => setFillValue(e.target.value)}
                      placeholder="汉字与题干一致"
                      autoComplete="off"
                    />
                  </label>
                  <button type="button" className="hongfan-quiz-primary" onClick={submitFill}>
                    提交答案
                  </button>
                </>
              )}

              {mode === "fill" && !fill && (
                <p className="hongfan-quiz-warn">本题不适合自动填空，请改用选择题或跳过。</p>
              )}
            </>
          )}

          {phase === "feedback" && (
            <div className="hongfan-quiz-feedback">
              <p className={lastCorrect || lastPoints > 0 ? "ok" : "bad"}>
                {lastCorrect ? "太棒了！" : lastPoints > 0 ? "练习已记录" : "继续加油"}
              </p>
              <p className="hongfan-quiz-feedback-detail">{lastExplain}</p>
              <p className="hongfan-quiz-score">本题得分：{lastPoints}</p>
              {official && mode === "mc" && <p className="hongfan-quiz-hint">标准答案键：{official}</p>}
              <button type="button" className="hongfan-quiz-primary" onClick={nextQuestion}>
                {index + 1 >= queue.length ? "本轮结束" : "下一题"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
