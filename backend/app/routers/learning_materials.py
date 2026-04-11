"""列目录与只读下载「02教材5本」等学习材料（防路径穿越）。"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.learning_materials_fs import materials_root

router = APIRouter(prefix="/learning-materials", tags=["learning-materials"])

ALLOWED_SUFFIX = {".pdf", ".epub", ".md", ".txt"}


def _under_root(full: Path, root: Path) -> bool:
    try:
        full.relative_to(root)
        return True
    except ValueError:
        return False


def _safe_relative_path(path_param: str) -> Path:
    if not path_param or path_param.strip() == "":
        raise HTTPException(status_code=400, detail="path 不能为空")
    if "\x00" in path_param or path_param.startswith("/"):
        raise HTTPException(status_code=400, detail="path 非法")
    rel = Path(path_param.replace("\\", "/"))
    if rel.is_absolute():
        raise HTTPException(status_code=400, detail="path 非法")
    parts = rel.parts
    if ".." in parts:
        raise HTTPException(status_code=400, detail="path 非法")
    return rel


@router.get("", summary="列出学习材料")
def list_learning_materials():
    root = materials_root()
    if not root.is_dir():
        return {
            "root": str(root),
            "root_exists": False,
            "items": [],
            "hint": "目录不存在或为空。请在仓库根创建「02教材5本」并放入 PDF/EPUB/MD/TXT，或设置环境变量 LEARNING_MATERIALS_DIR 指向你的教材文件夹。",
        }
    items: list[dict] = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        if p.name.startswith("."):
            continue
        if ".baiduyun." in p.name or p.suffix.lower() == ".downloading":
            continue
        suf = p.suffix.lower()
        if suf not in ALLOWED_SUFFIX:
            continue
        try:
            rel = p.relative_to(root).as_posix()
        except ValueError:
            continue
        try:
            sz = p.stat().st_size
        except OSError:
            continue
        items.append(
            {
                "relative_path": rel,
                "name": p.name,
                "size_bytes": sz,
                "ext": suf,
            }
        )
    return {
        "root": str(root),
        "root_exists": True,
        "items": items,
        "hint": None,
    }


@router.get("/file")
def get_learning_file(path: str = Query(..., description="相对 materials 根的路径，用 / 分隔")):
    root = materials_root()
    if not root.is_dir():
        raise HTTPException(status_code=404, detail="学习材料根目录不存在")
    rel = _safe_relative_path(path)
    full = (root / rel).resolve()
    if not _under_root(full, root):
        raise HTTPException(status_code=400, detail="path 越界")
    if not full.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")
    suf = full.suffix.lower()
    if suf not in ALLOWED_SUFFIX:
        raise HTTPException(status_code=400, detail="不支持的文件类型")
    media = {
        ".pdf": "application/pdf",
        ".epub": "application/epub+zip",
        ".md": "text/markdown; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }.get(suf, "application/octet-stream")
    return FileResponse(full, media_type=media, filename=full.name)
