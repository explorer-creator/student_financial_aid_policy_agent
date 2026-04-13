/**
 * 红帆知海：课本标签与题库。
 * 题目数据从 `src/data/hongfan-bank.json` 导入；请仅使用有权发布的材料。
 */

import bankFile from "./data/hongfan-bank.json";

export type HongfanCourseId =
  | "mayuan"
  | "maozhongte"
  | "xinshidai"
  | "gangyao"
  | "sixiu"
  | "shizheng";

const COURSE_IDS: readonly HongfanCourseId[] = [
  "mayuan",
  "maozhongte",
  "xinshidai",
  "gangyao",
  "sixiu",
  "shizheng",
];

function isCourseId(s: string): s is HongfanCourseId {
  return (COURSE_IDS as readonly string[]).includes(s);
}

export type HongfanBankItem = {
  id: string;
  courseId: HongfanCourseId;
  question: string;
  answer: string;
  tags?: string[];
};

type BankFileShape = {
  version: number;
  sourceNote?: string;
  items: Array<{
    id: string;
    courseId: string;
    question: string;
    answer: string;
    tags?: string[];
  }>;
};

function normalizeBank(raw: BankFileShape): HongfanBankItem[] {
  const out: HongfanBankItem[] = [];
  for (const it of raw.items) {
    if (!it.id || !it.question || !it.answer) continue;
    if (!isCourseId(it.courseId)) continue;
    out.push({
      id: String(it.id),
      courseId: it.courseId,
      question: String(it.question),
      answer: String(it.answer),
      tags: it.tags,
    });
  }
  return out;
}

/** 从 hongfan-bank.json 解析后的全部题目（运行时只读这一处数据源） */
export const HONGFAN_BANK_ITEMS: HongfanBankItem[] = normalizeBank(bankFile as BankFileShape);

export function hongfanItemsForCourse(courseId: HongfanCourseId | null): HongfanBankItem[] {
  if (!courseId) return HONGFAN_BANK_ITEMS;
  return HONGFAN_BANK_ITEMS.filter((x) => x.courseId === courseId);
}

export const HONGFAN_COURSES: {
  id: HongfanCourseId;
  short: string;
  full: string;
}[] = [
  { id: "mayuan", short: "马原", full: "马克思主义基本原理概论" },
  { id: "maozhongte", short: "毛中特", full: "毛泽东思想和中国特色社会主义理论体系概论" },
  { id: "xinshidai", short: "新思想", full: "习近平新时代中国特色社会主义思想概论" },
  { id: "gangyao", short: "纲要", full: "中国近现代史纲要" },
  { id: "sixiu", short: "思修", full: "思想道德与法治" },
  { id: "shizheng", short: "时政", full: "形势与政策以及当代世界经济与政治" },
];

export const HONGFAN_INTRO =
  "这里是「红帆知海」专用区：面向思政课相关问题的通识答疑与复习梳理。\n\n" +
  "请先点选一本课本侧重（也可不选，直接提问）。题目可从下方题库插入；正式考试以课堂与正版教材为准。";

