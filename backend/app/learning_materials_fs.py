"""解析学习材料目录根路径（仓库根下「02教材5本」或可配置）。"""

from pathlib import Path

from app.config import settings


def project_root() -> Path:
    # backend/app/learning_materials_fs.py -> app -> backend -> repo root
    return Path(__file__).resolve().parent.parent.parent


def materials_root() -> Path:
    if settings.learning_materials_dir and str(settings.learning_materials_dir).strip():
        return Path(str(settings.learning_materials_dir).strip()).expanduser().resolve()
    return (project_root() / "02教材5本").resolve()
