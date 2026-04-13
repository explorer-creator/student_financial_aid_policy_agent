"""无向量库时的轻量 RAG：按用户问题与文本块的字面重合度选取若干块。"""

from __future__ import annotations

import re


def _query_terms(query: str) -> set[str]:
    q = query.strip()
    if not q:
        return set()
    terms: set[str] = set()
    for m in re.finditer(r"[\u4e00-\u9fff]{2,12}", q):
        s = m.group(0)
        terms.add(s)
        if len(s) > 4:
            for i in range(len(s) - 1):
                terms.add(s[i : i + 2])
    for m in re.finditer(r"[A-Za-z][A-Za-z0-9_-]{2,24}", q):
        terms.add(m.group(0).lower())
    for m in re.finditer(r"\d{4,}", q):
        terms.add(m.group(0))
    return terms


def select_relevant_chunks(
    user_message: str,
    chunks: tuple[str, ...],
    sources: tuple[str, ...],
    *,
    top_k: int = 6,
    max_chars: int = 9000,
) -> str:
    if not chunks:
        return ""
    if len(sources) != len(chunks):
        sources = tuple("" for _ in chunks)

    terms = _query_terms(user_message)
    scored: list[tuple[int, int]] = []
    for i, ch in enumerate(chunks):
        if not terms:
            score = 0
        else:
            score = sum(1 for t in terms if t in ch)
        scored.append((score, i))
    scored.sort(key=lambda x: (-x[0], x[1]))

    picked: list[int] = []
    for sc, i in scored:
        if sc > 0:
            picked.append(i)
        if len(picked) >= top_k:
            break
    if not picked:
        picked = [i for _, i in scored[:top_k]]

    parts: list[str] = []
    total = 0
    for i in picked:
        src = sources[i] if i < len(sources) else ""
        block = f"### 文档：{src}\n{chunks[i].strip()}"
        if total + len(block) > max_chars:
            remain = max_chars - total
            if remain < 200:
                break
            block = block[:remain] + "…"
        parts.append(block)
        total += len(block)
        if total >= max_chars:
            break

    if not parts:
        return ""
    return (
        "【以下为知识库文档摘录（RAG），请结合上文政策摘要作答；若与摘要冲突，以摘录原文为准】\n\n"
        + "\n\n---\n\n".join(parts)
    )
