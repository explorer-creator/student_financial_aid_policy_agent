/**
 * 红帆题库练习：从题干解析选项、定位「书本/编年/题号」等（仅前端，无网络）。
 */

import type { HongfanBankItem, HongfanCourseId } from "./hongfanData";
import { HONGFAN_COURSES } from "./hongfanData";

export type QuizMode = "mc" | "fill";

export type McOption = { letter: string; text: string };

export type ParsedMc = {
  stem: string;
  options: McOption[];
};

/** 从 id 如 kyzz-2009-001 取题号 */
export function parseQuestionIndexFromId(id: string): number | null {
  const m = id.match(/-(\d{1,3})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/** 从题干首行取「第 N 题」 */
export function parseQuestionLineLabel(question: string): string | null {
  const first = question.split("\n")[0]?.trim() ?? "";
  const m = first.match(/第\s*(\d{1,3})\s*题/);
  return m ? `第 ${m[1]} 题` : null;
}

export function courseLabel(courseId: HongfanCourseId): string {
  return HONGFAN_COURSES.find((c) => c.id === courseId)?.full ?? courseId;
}

export function courseShort(courseId: HongfanCourseId): string {
  return HONGFAN_COURSES.find((c) => c.id === courseId)?.short ?? courseId;
}

/** 「书本」进度键：读本 + 编年（tags 中的 4 位年或 unknown） */
export function bookProgressKey(item: HongfanBankItem): string {
  const year = item.tags?.find((t) => /^\d{4}$/.test(t)) ?? "未标年";
  return `${item.courseId}::${year}`;
}

export function bookDisplayName(item: HongfanBankItem): string {
  const y = item.tags?.find((t) => /^\d{4}$/.test(t)) ?? "未标年";
  return `${courseShort(item.courseId)} · ${y}`;
}

/** 用于学习卡片的「章」提示：题号分段 + 标签 */
export function chapterStudyHint(item: HongfanBankItem): string {
  const idx = parseQuestionIndexFromId(item.id);
  const line = parseQuestionLineLabel(item.question);
  const block =
    idx != null
      ? idx <= 16
        ? "一、单项选择题（知识块 1）"
        : idx <= 33
          ? "二、多项选择题（知识块 2）"
          : "三、材料分析题（知识块 3）"
      : "综合练习块";
  const tagHint = (item.tags ?? []).filter((t) => t !== "考研政治" && t !== "真题").join(" · ");
  const lineHint = line ? ` · ${line}` : "";
  return `${block}${lineHint}${tagHint ? ` · ${tagHint}` : ""}`;
}

/** 从 answer 字段尝试解析标准选项字母 */
export function extractOfficialLetter(answer: string): "A" | "B" | "C" | "D" | null {
  const t = answer.replace(/\s/g, "");
  const m1 = t.match(/(?:答案|正确选项|参考答案)[:：]?([ABCD])/i);
  if (m1) return m1[1].toUpperCase() as "A" | "B" | "C" | "D";
  const m2 = t.match(/^([ABCD])[.．]/i);
  if (m2) return m2[1].toUpperCase() as "A" | "B" | "C" | "D";
  return null;
}

function normalizeMcLetter(ch: string): string {
  return ch.toUpperCase();
}

/**
 * 从题干解析选择题选项（覆盖换行/tab/同行多选项等常见版式）。
 */
export function parseMcFromQuestion(question: string): ParsedMc {
  const raw = question.replace(/\r\n/g, "\n").trim();
  const lines = raw.split("\n").map((l) => l.replace(/\u00a0/g, " ").trim());

  let firstOptIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^[ABCDabcd][.．．]/.test(ln)) {
      firstOptIdx = i;
      break;
    }
    if (/\t/.test(ln) && /[ABCD][.．．]/.test(ln)) {
      firstOptIdx = i;
      break;
    }
  }

  const pushSplit = (stemPart: string, tail: string): ParsedMc => {
    const opts: McOption[] = [];
    const parts = tail.split(/(?=[ABCDabcd][.．．])/);
    for (const p of parts) {
      const t = p.trim();
      if (!t) continue;
      const m = t.match(/^([ABCDabcd])[.．．]\s*([\s\S]+)$/);
      if (m) opts.push({ letter: normalizeMcLetter(m[1]), text: m[2].replace(/\s+/g, " ").trim() });
    }
    const dedup: McOption[] = [];
    const seen = new Set<string>();
    for (const o of opts) {
      if (seen.has(o.letter)) continue;
      seen.add(o.letter);
      dedup.push(o);
    }
    dedup.sort((a, b) => a.letter.localeCompare(b.letter));
    return { stem: (stemPart || raw).trim(), options: dedup };
  };

  if (firstOptIdx < 0) {
    if (/[ABCDabcd][.．．]/.test(raw)) {
      const idx = raw.search(/[ABCDabcd][.．．]/);
      return pushSplit(raw.slice(0, idx).trim(), raw.slice(idx));
    }
    return { stem: raw, options: [] };
  }

  const stem = lines.slice(0, firstOptIdx).join("\n").trim();
  const tail = lines.slice(firstOptIdx).join("\n");
  const out = pushSplit(stem, tail);
  if (out.options.length >= 2) return out;

  for (const ln of lines.slice(firstOptIdx)) {
    for (const cell of ln.split(/\t/)) {
      const c = cell.trim();
      const mm = c.match(/^([ABCDabcd])[.．．]\s*(.+)$/);
      if (mm) out.options.push({ letter: normalizeMcLetter(mm[1]), text: mm[2].trim() });
    }
  }
  const seen = new Set<string>();
  const dedup: McOption[] = [];
  for (const o of out.options) {
    if (seen.has(o.letter)) continue;
    seen.add(o.letter);
    dedup.push(o);
  }
  dedup.sort((a, b) => a.letter.localeCompare(b.letter));
  return { stem: out.stem, options: dedup };
}

/** 填空：从题干取一小段作为答案，用 ____ 占位 */
export function buildFillBlank(stem: string): { display: string; answer: string } | null {
  const s = stem.replace(/\s+/g, " ").trim();
  const re = /[\u4e00-\u9fff]{5,12}/g;
  const chunks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) chunks.push(m[0]);
  const pick = chunks[1] ?? chunks[0] ?? null;
  if (!pick) return null;
  const display = s.replace(pick, "________");
  return { display, answer: pick };
}

export const QUIZ_PROGRESS_KEY = "hongfan_quiz_progress_v1";

export type BookProgress = {
  practiced: number;
  score: number;
  total: number;
};

export type ProgressRoot = {
  books: Record<string, BookProgress>;
};

export function loadQuizProgress(): ProgressRoot {
  try {
    const raw = localStorage.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return { books: {} };
    const j = JSON.parse(raw) as ProgressRoot;
    if (!j || typeof j !== "object" || !j.books) return { books: {} };
    return j;
  } catch {
    return { books: {} };
  }
}

export function saveQuizProgress(root: ProgressRoot): void {
  try {
    localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(root));
  } catch {
    /* ignore */
  }
}

export function bumpProgress(
  root: ProgressRoot,
  bookKey: string,
  totalForBook: number,
  deltaScore: number,
): ProgressRoot {
  const prev = root.books[bookKey] ?? { practiced: 0, score: 0, total: totalForBook };
  const next: BookProgress = {
    total: totalForBook,
    practiced: prev.practiced + 1,
    score: prev.score + deltaScore,
  };
  return { books: { ...root.books, [bookKey]: next } };
}
