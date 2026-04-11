import { useCallback, useEffect, useState } from "react";

type Item = {
  relative_path: string;
  name: string;
  size_bytes: number;
  ext: string;
};

type ListResponse = {
  root: string;
  root_exists: boolean;
  items: Item[];
  hint: string | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function topFolder(rel: string): string {
  const i = rel.indexOf("/");
  return i === -1 ? "（根目录）" : rel.slice(0, i);
}

type Props = {
  apiBase: string;
  staticSite: boolean;
};

export function LearningMaterialsPanel({ apiBase, staticSite }: Props) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (staticSite) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase}/api/learning-materials`);
      if (!res.ok) {
        if (res.status === 404) {
          setErr(
            "加载失败（HTTP 404）：当前页面所在域名下没有「/api/learning-materials」。若为本机 npm run dev，请启动后端（默认 8000 端口）并拉取含学习材料接口的代码后重启；若为 build 后的静态站，请在构建前设置 VITE_API_BASE 指向后端根地址（例如 http://127.0.0.1:8000）。"
          );
        } else {
          setErr(`加载失败（HTTP ${res.status}）`);
        }
        setData(null);
        return;
      }
      const j = (await res.json()) as ListResponse;
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "网络错误");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase, staticSite]);

  useEffect(() => {
    void load();
  }, [load]);

  const fileUrl = (rel: string) => `${apiBase}/api/learning-materials/file?path=${encodeURIComponent(rel)}`;

  if (staticSite) {
    return (
      <div className="hongfan-materials-card">
        <p className="hongfan-quiz-hint">
          无法从当前站点直接读取教材列表（演示模式、或未配置 <code className="inline-code">VITE_API_BASE</code>
          的生产构建）。请在本地运行后端（默认读取仓库根目录「02教材5本」），使用{" "}
          <code className="inline-code">npm run dev</code> 联调；或构建前端时设置{" "}
          <code className="inline-code">VITE_API_BASE</code> 为后端根地址（如{" "}
          <code className="inline-code">http://127.0.0.1:8000</code>），再部署。
        </p>
      </div>
    );
  }

  return (
    <div className="hongfan-materials-root">
      <div className="hongfan-materials-head">
        <h2 className="hongfan-quiz-title">学习材料</h2>
        <p className="hongfan-quiz-sub">
          文件来自后端配置的目录（默认项目根下 <code className="inline-code">02教材5本</code>
          ）。支持 PDF / EPUB / Markdown / 纯文本；浏览器内打开 PDF 新标签即可阅读。
        </p>
        <button type="button" className="hongfan-materials-refresh" onClick={() => void load()} disabled={loading}>
          {loading ? "刷新中…" : "刷新列表"}
        </button>
      </div>

      {err && <div className="error-banner">{err}</div>}

      {data && (
        <>
          <p className="hongfan-materials-rootpath" title={data.root}>
            根路径：{data.root}
            {!data.root_exists && <span className="hongfan-materials-missing">（目录不存在）</span>}
          </p>
          {data.hint && <p className="hongfan-quiz-hint">{data.hint}</p>}
          {data.items.length === 0 && data.root_exists ? (
            <p className="hongfan-quiz-hint">目录下暂无支持的文件（.pdf / .epub / .md / .txt）。</p>
          ) : null}
          {data.items.length > 0 && (
            <ul className="hongfan-materials-list">
              {data.items.map((it) => (
                <li key={it.relative_path} className="hongfan-materials-row">
                  <span className="hongfan-materials-folder">{topFolder(it.relative_path)}</span>
                  <div className="hongfan-materials-main">
                    <a
                      className="hongfan-materials-link"
                      href={fileUrl(it.relative_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {it.name}
                    </a>
                    <span className="hongfan-materials-meta">
                      {it.ext} · {formatBytes(it.size_bytes)}
                    </span>
                    <span className="hongfan-materials-rel" title={it.relative_path}>
                      {it.relative_path}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
