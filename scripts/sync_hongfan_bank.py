"""
将「01历年真题及解析/hongfan-bank.json」复制到 frontend/src/data/hongfan-bank.json，
供 Vite 打包进红帆知海题库。

用法（在项目根目录）:
  python scripts/sync_hongfan_bank.py

若不存在源文件，会提示并保留目标处现有文件不动。
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path


def find_source_bank(root: Path) -> Path | None:
    """匹配项目根下以 01 开头的目录内的 hongfan-bank.json（兼容中文文件夹名）。"""
    if not root.is_dir():
        return None
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if not child.name.startswith("01"):
            continue
        candidate = child / "hongfan-bank.json"
        if candidate.is_file():
            return candidate
    return None


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    dest = root / "frontend" / "src" / "data" / "hongfan-bank.json"
    src = find_source_bank(root)

    if src is None:
        print(
            "未找到题库源文件：请在「01历年真题及解析」目录下放置 hongfan-bank.json\n"
            "（目录名需以 01 开头，与仓库内该文件夹一致）。",
            file=sys.stderr,
        )
        return 1

    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    try:
        data = json.loads(dest.read_text(encoding="utf-8"))
        n = len(data.get("items", []))
    except (json.JSONDecodeError, OSError) as e:
        print(f"已复制，但解析失败: {e}", file=sys.stderr)
        return 1

    print(f"已同步: {src} -> {dest}（items 约 {n} 条）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
