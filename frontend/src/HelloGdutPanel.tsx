const AVATAR_SRC = `${import.meta.env.BASE_URL}gdut-avatar.png`;

type GdutVideo = {
  id: string;
  title: string;
  subtitle: string;
  bvid: string;
  url: string;
};

const VIDEOS: GdutVideo[] = [
  {
    id: "v1",
    title: "【柴桑】2小时，我被电信诈骗了8万",
    subtitle: "反诈真实经历 · 提高警觉",
    bvid: "BV1TM4y1w7oH",
    url: "https://www.bilibili.com/video/BV1TM4y1w7oH/",
  },
  {
    id: "v2",
    title: "广工揭阳校区“十二时辰”招生宣传片",
    subtitle: "广东工业大学官方视频",
    bvid: "BV1HY4y1n78y",
    url: "https://www.bilibili.com/video/BV1HY4y1n78y/",
  },
  {
    id: "v3",
    title: "校园介绍短片（一）",
    subtitle: "广工校园介绍",
    bvid: "BV1BK4y1X7yh",
    url: "https://www.bilibili.com/video/BV1BK4y1X7yh/",
  },
  {
    id: "v4",
    title: "校园介绍短片（二）",
    subtitle: "广工校园介绍",
    bvid: "BV1Ki4y1h7Re",
    url: "https://www.bilibili.com/video/BV1Ki4y1h7Re/",
  },
  {
    id: "v5",
    title: "校园介绍短片（三）",
    subtitle: "广工校园介绍",
    bvid: "BV1kP4y1L78U",
    url: "https://www.bilibili.com/video/BV1kP4y1L78U/",
  },
  {
    id: "v6",
    title: "广工战胜清华！勇夺全国总决赛冠军！！！",
    subtitle: "广东工业大学官方视频",
    bvid: "BV1UN41167bV",
    url: "https://www.bilibili.com/video/BV1UN41167bV/",
  },
];

function bilibiliPlayerSrc(bvid: string): string {
  const id = bvid.startsWith("BV") ? bvid : `BV${bvid}`;
  return `https://player.bilibili.com/player.html?bvid=${id}&page=1&high_quality=1&danmaku=0`;
}

export function HelloGdutPanel({ onBack }: { onBack: () => void }) {
  return (
    <>
      <div className="chat-slim-header">
        <div className="chat-slim-brand">
          <img className="logo logo-sm" src={AVATAR_SRC} alt="广东工业大学校徽" loading="eager" decoding="async" />
          <h1 className="chat-slim-title">你好，广工</h1>
        </div>
      </div>

      <p className="hongge-realm-intro">
        这里汇总校园宣传与反诈相关视频，支持本页观看与跳转 B 站原视频。若部分视频因平台风控或版权限制无法嵌入，请点击“在 B 站打开”观看。
      </p>

      <div className="hongge-song-list">
        {VIDEOS.map((v) => (
          <article key={v.id} className="hongge-song-card">
            <div className="hongge-song-card-head">
              <div>
                <h2 className="hongge-song-title">{v.title}</h2>
                <p className="hongge-song-sub">{v.subtitle}</p>
              </div>
              <a className="hongge-link-btn" href={v.url} target="_blank" rel="noopener noreferrer">
                在 B 站打开
              </a>
            </div>
            <div className="hongge-embed-wrap">
              <iframe
                title={v.title}
                src={bilibiliPlayerSrc(v.bvid)}
                className="hongge-embed"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
              />
            </div>
          </article>
        ))}
      </div>

      <p className="tools-back-hint">
        <button type="button" className="text-link" onClick={onBack}>
          ← 返回问策解惑
        </button>
      </p>
    </>
  );
}

