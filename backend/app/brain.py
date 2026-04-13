"""
解析「大脑」连接方式：优先云端 OpenAI 兼容 API（如 DeepSeek）；可选本机 Ollama。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.config import (
    ENV_FILE_PATH,
    effective_llm_model,
    effective_openai_api_key,
    effective_openai_base_url,
    settings,
)

# 调大数字表示 brain/status 响应结构或读密钥逻辑有更新（便于确认已重启到新代码）
BRAIN_API_REVISION = 3


@dataclass(frozen=True)
class ResolvedBrain:
    """可调用的大模型端点。"""

    chat_url: str
    authorization_bearer: str | None
    model: str
    provider: str  # "openai" | "ollama"


def resolve_brain() -> ResolvedBrain | None:
    """
    优先级：
    1. 配置了 OPENAI_API_KEY → 使用 OPENAI_BASE_URL + MODEL（云端或任意兼容网关）
    2. 未配置 OPENAI_API_KEY 但配置了 OLLAMA_BASE_URL → 本机 Ollama（可选，不部署可忽略）
    3. 否则无大脑，走演示文案
    """
    key = effective_openai_api_key()
    base = effective_openai_base_url()
    if key:
        return ResolvedBrain(
            chat_url=f"{base}/chat/completions",
            authorization_bearer=key,
            model=effective_llm_model(),
            provider="openai",
        )
    if settings.ollama_base_url:
        ob = settings.ollama_base_url.rstrip("/")
        bearer = settings.ollama_api_key or "ollama"
        return ResolvedBrain(
            chat_url=f"{ob}/chat/completions",
            authorization_bearer=bearer,
            model=settings.ollama_model,
            provider="ollama",
        )
    return None


def brain_status_dict() -> dict:
    b = resolve_brain()
    key_ok = bool(effective_openai_api_key())
    if not b:
        return {
            "has_brain": False,
            "provider": None,
            "model": None,
            "hint": "未配置大模型：请在 backend/.env 设置 OPENAI_API_KEY，以及 OPENAI_BASE_URL（如 DeepSeek：https://api.deepseek.com/v1）与 MODEL（如 deepseek-chat）。可选本机 Ollama 时另设 OLLAMA_BASE_URL（见 .env.example）。",
            "env_file_exists": ENV_FILE_PATH.is_file(),
            "openai_key_configured": key_ok,
            "api_revision": BRAIN_API_REVISION,
        }
    return {
        "has_brain": True,
        "provider": b.provider,
        "model": b.model,
        "hint": "大脑已就绪：问答将走真实 LLM + 政策知识库系统提示。",
        "env_file_exists": ENV_FILE_PATH.is_file(),
        "openai_key_configured": key_ok,
        "api_revision": BRAIN_API_REVISION,
    }
