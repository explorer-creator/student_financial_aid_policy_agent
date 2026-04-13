import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"

# 先注入 os.environ，再交给 pydantic-settings（Windows 下双保险）
if _ENV_FILE.is_file():
    load_dotenv(_ENV_FILE, encoding="utf-8-sig")

# 供 /api/brain/status 诊断（不暴露密钥）
ENV_FILE_PATH = _ENV_FILE


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )

    # 云端 / 网关「大脑」：OPENAI_API_KEY 或 DEEPSEEK_API_KEY（二选一，兼容命名）
    openai_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENAI_API_KEY", "DEEPSEEK_API_KEY"),
    )
    openai_base_url: str = "https://api.openai.com/v1"
    # 勿用字段名 model：与 Pydantic「模型配置」命名空间易冲突，导致 MODEL 环境变量读不到
    llm_model: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices("MODEL", "llm_model"),
    )

    # 可选：本机 Ollama。不填 OPENAI_API_KEY 且填写 OLLAMA_BASE_URL 时走本地模型（多数部署只用 DeepSeek，可忽略）
    # 例：OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 ；先 ollama pull deepseek-r1:7b
    ollama_base_url: str | None = None
    ollama_model: str = "deepseek-r1:7b"
    ollama_api_key: str | None = None  # 一般留空；若反向代理需要 Bearer 再填

    cors_origins: str = "*"

    # 思政学习材料根目录（相对路径默认指向仓库根下「02教材5本」；可用绝对路径覆盖）
    learning_materials_dir: str | None = None

    @field_validator("openai_api_key", mode="before")
    @classmethod
    def strip_api_key(cls, v: object) -> object:
        if v is None or not isinstance(v, str):
            return v
        s = v.strip().strip("\ufeff")  # 去掉空格与 UTF-8 BOM，避免鉴权莫名失败
        return s if s else None

    @field_validator("openai_base_url", mode="before")
    @classmethod
    def strip_base_url(cls, v: object) -> object:
        if v is None or not isinstance(v, str):
            return v
        return v.strip().strip("\ufeff") or "https://api.openai.com/v1"


settings = Settings()


def _strip_key(v: str) -> str:
    return v.strip().strip("\ufeff")


def _read_env_file_text() -> str:
    """兼容 UTF-8（含 BOM）、UTF-16 LE/BE（记事本另存为）。"""
    try:
        raw = _ENV_FILE.read_bytes()
    except OSError:
        return ""
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return raw.decode("utf-16-sig", errors="replace")
    return raw.decode("utf-8-sig", errors="replace")


def _env_file_kv() -> dict[str, str]:
    """直接解析 backend/.env（兜底：与运行目录、Settings 无关）。"""
    if not _ENV_FILE.is_file():
        return {}
    text = _read_env_file_text()
    out: dict[str, str] = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if "=" not in s:
            continue
        k, _, v = s.partition("=")
        k = k.strip().strip("\ufeff")
        v = v.strip().strip('"').strip("'")
        if k:
            out[k] = v
    return out


def effective_openai_api_key() -> str | None:
    """settings → 环境变量 → 直接读 .env 文件。"""
    if settings.openai_api_key:
        return settings.openai_api_key
    for env_name in ("OPENAI_API_KEY", "DEEPSEEK_API_KEY"):
        raw = os.environ.get(env_name)
        if raw:
            s = _strip_key(str(raw))
            if s:
                return s
    fv = _env_file_kv()
    for name in ("OPENAI_API_KEY", "DEEPSEEK_API_KEY"):
        val = fv.get(name)
        if val:
            s = _strip_key(val)
            if s:
                return s
    return None


def effective_openai_base_url() -> str:
    fv = _env_file_kv()
    b = (
        (os.environ.get("OPENAI_BASE_URL") or "").strip()
        or (fv.get("OPENAI_BASE_URL") or "").strip()
        or (settings.openai_base_url or "").strip()
    )
    return (b or "https://api.openai.com/v1").rstrip("/")


def effective_llm_model() -> str:
    fv = _env_file_kv()
    m = (os.environ.get("MODEL") or "").strip() or (fv.get("MODEL") or "").strip()
    if m:
        return m
    return settings.llm_model
