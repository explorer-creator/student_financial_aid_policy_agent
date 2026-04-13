import { useCallback, useState } from "react";
import { HONGGE_SONGS, bilibiliPlayerSrc, type HonggeSong } from "./honggeLingjingData";

const AVATAR_SRC = `${import.meta.env.BASE_URL}gdut-avatar.png`;

function LogoSm() {
  return (
    <img className="logo logo-sm" src={AVATAR_SRC} alt="广东工业大学校徽" loading="eager" decoding="async" />
  );
}

type Props = {
  onBack: () => void;
};

export function HonggeLingjingPanel({ onBack }: Props) {
  const [openId, setOpenId] = useState<string | null>(HONGGE_SONGS[0]?.id ?? null);

  const toggle = useCallback((id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
  }, []);

  return (
    <>
      <div className="chat-slim-header">
        <div className="chat-slim-brand">
          <LogoSm />
          <h1 className="chat-slim-title">红歌灵境</h1>
        </div>
      </div>

      <p className="hongge-realm-intro">
        以下曲目通过<strong>外链</strong>跳转至哔哩哔哩等平台公开资源，便于<strong>听、学、唱</strong>。请点击「本页试听」在下方播放器中观看；学唱可打开「学唱 / 简谱检索」在 B
        站搜索教唱与曲谱类视频。版权与播放规则以各平台及版权方为准。
      </p>

      <div className="hongge-song-list">
        {HONGGE_SONGS.map((song) => (
          <HonggeSongCard key={song.id} song={song} expanded={openId === song.id} onToggle={() => toggle(song.id)} />
        ))}
      </div>

      <p className="tools-back-hint">
        <button type="button" className="text-link" onClick={onBack}>
          ← 返回政策问答
        </button>
      </p>
    </>
  );
}

function HonggeSongCard({
  song,
  expanded,
  onToggle,
}: {
  song: HonggeSong;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="hongge-song-card">
      <div className="hongge-song-card-head">
        <div>
          <h2 className="hongge-song-title">{song.title}</h2>
          <p className="hongge-song-sub">{song.subtitle}</p>
        </div>
        <button type="button" className="hongge-toggle-btn" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? "收起试听" : "本页试听"}
        </button>
      </div>
      <div className="hongge-song-actions">
        <a className="hongge-link-btn" href={song.watchUrl} target="_blank" rel="noopener noreferrer">
          B 站打开
        </a>
        <a className="hongge-link-btn secondary" href={song.learnUrl} target="_blank" rel="noopener noreferrer">
          学唱 / 简谱检索
        </a>
      </div>
      {expanded && (
        <div className="hongge-embed-wrap">
          <iframe
            title={`${song.title} 试听`}
            src={bilibiliPlayerSrc(song.bvid)}
            className="hongge-embed"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          />
        </div>
      )}
    </article>
  );
}
