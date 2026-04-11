/** 红歌灵境：外链至哔哩哔哩等公开页面，便于试听与学唱（版权归属原作者与平台）。 */

export type HonggeSong = {
  id: string;
  title: string;
  subtitle: string;
  /** B 站 BV 号，用于官方播放器嵌入 */
  bvid: string;
  /** 在 B 站打开完整页 */
  watchUrl: string;
  /** 学唱 / 简谱 / 教唱检索 */
  learnUrl: string;
};

export const HONGGE_SONGS: HonggeSong[] = [
  {
    id: "wo-he-zu-guo",
    title: "1. 我和我的祖国",
    subtitle: "经典爱国歌曲 · 张藜词 · 秦咏诚曲",
    bvid: "BV1md4y1q7Bf",
    watchUrl: "https://www.bilibili.com/video/BV1md4y1q7Bf/",
    learnUrl:
      "https://search.bilibili.com/all?keyword=" +
      encodeURIComponent("我和我的祖国 教唱 简谱"),
  },
  {
    id: "zi-jing-hua",
    title: "2. 紫荆花盛开",
    subtitle: "李荣浩 / 梁咏琪 · 庆祝香港回归祖国主题作品",
    bvid: "BV1Jr421n7PM",
    watchUrl: "https://www.bilibili.com/video/BV1Jr421n7PM/",
    learnUrl:
      "https://search.bilibili.com/all?keyword=" + encodeURIComponent("紫荆花盛开 简谱 教唱"),
  },
  {
    id: "ru-yuan",
    title: "3. 如愿",
    subtitle: "电影《我和我的父辈》主题推广曲 · 周深现场版（示例）",
    bvid: "BV1i34y157Le",
    watchUrl: "https://www.bilibili.com/video/BV1i34y157Le/",
    learnUrl: "https://search.bilibili.com/all?keyword=" + encodeURIComponent("如愿 周深 教唱"),
  },
  {
    id: "yi-lu-sheng-hua",
    title: "4. 一路生花",
    subtitle: "温奕心 · 励志传唱",
    bvid: "BV1i341187kL",
    watchUrl: "https://www.bilibili.com/video/BV1i341187kL/",
    learnUrl: "https://search.bilibili.com/all?keyword=" + encodeURIComponent("一路生花 温奕心 教唱"),
  },
  {
    id: "bao-wei-huang-he",
    title: "5. 保卫黄河",
    subtitle: "《黄河大合唱》第七乐章 · 冼星海曲 · 中央乐团合唱（示例）",
    bvid: "BV1hb411B7Dv",
    watchUrl: "https://www.bilibili.com/video/BV1hb411B7Dv/",
    learnUrl: "https://search.bilibili.com/all?keyword=" + encodeURIComponent("保卫黄河 合唱 指挥 教学"),
  },
];

export function bilibiliPlayerSrc(bvid: string): string {
  const id = bvid.startsWith("BV") ? bvid : `BV${bvid}`;
  return `https://player.bilibili.com/player.html?bvid=${id}&page=1&high_quality=1&danmaku=0`;
}
