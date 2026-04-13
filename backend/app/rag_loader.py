"""从仓库 docs / public/docs 加载文本，切块后供政策对话 RAG 使用（启动时缓存）。"""

from __future__ import annotations

import logging
import os
import re
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)


def _read_text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _read_docx(path: Path) -> str:
    from docx import Document

    doc = Document(str(path))
    parts: list[str] = []
    for p in doc.paragraphs:
        if p.text.strip():
            parts.append(p.text)
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if any(cells):
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def _chunk_text(text: str, source_label: str, *, max_len: int = 1800, overlap: int = 200) -> list[tuple[str, str]]:
    t = text.strip()
    if not t:
        return []
    if len(t) <= max_len:
        return [(source_label, t)]
    out: list[tuple[str, str]] = []
    start = 0
    while start < len(t):
        end = min(start + max_len, len(t))
        out.append((source_label, t[start:end]))
        if end >= len(t):
            break
        start = max(0, end - overlap)
    return out


def _discover_doc_roots() -> list[Path]:
    """兼容：本地 monorepo、Docker（/app/docs）与自定义环境变量。"""
    here = Path(__file__).resolve().parent
    backend = here.parent
    repo = backend.parent
    roots: list[Path] = []

    # Docker：WORKDIR /app，COPY docs -> /app/docs
    if (backend / "docs").is_dir():
        roots.append(backend / "docs")
    if (backend / "public_docs").is_dir():
        roots.append(backend / "public_docs")

    # 本地：repo/docs、repo/frontend/public/docs
    if (repo / "docs").is_dir():
        roots.append(repo / "docs")
    if (repo / "frontend" / "public" / "docs").is_dir():
        roots.append(repo / "frontend" / "public" / "docs")

    for raw in os.environ.get("RAG_EXTRA_DIRS", "").split(","):
        raw = raw.strip()
        if not raw:
            continue
        p = Path(raw).expanduser()
        if p.is_dir():
            roots.append(p)

    seen: set[str] = set()
    out: list[Path] = []
    for r in roots:
        key = str(r.resolve())
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def _load_raw_chunks() -> tuple[list[str], list[str]]:
    """返回 (chunks, source_labels)，一一对应。"""
    chunks: list[str] = []
    sources: list[str] = []
    for root in _discover_doc_roots():
        try:
            paths = sorted(root.rglob("*"))
        except OSError as e:
            logger.warning("RAG 无法遍历 %s: %s", root, e)
            continue
        for path in paths:
            if not path.is_file():
                continue
            suf = path.suffix.lower()
            if suf not in (".md", ".docx", ".txt"):
                continue
            try:
                rel = path.relative_to(root)
            except ValueError:
                continue
            label = f"{root.name}/{rel.as_posix()}"
            try:
                if suf == ".docx":
                    text = _read_docx(path)
                else:
                    text = _read_text_file(path)
            except Exception:
                logger.exception("RAG 跳过文件（读取失败）: %s", path)
                continue
            for src, ch in _chunk_text(text, label):
                sources.append(src)
                chunks.append(ch)
    if chunks:
        logger.info("RAG 已加载 %s 个文本块，来自目录 %s", len(chunks), [str(r) for r in _discover_doc_roots()])
    else:
        logger.info("RAG 未加载任何文档块（未找到 docs 目录或目录为空）")
    return chunks, sources


@lru_cache(maxsize=1)
def get_rag_chunks_and_sources() -> tuple[tuple[str, ...], tuple[str, ...]]:
    """进程内缓存；修改文档后需重启后端生效。"""
    c, s = _load_raw_chunks()
    return tuple(c), tuple(s)
