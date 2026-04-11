"""
解析「大脑」连接方式：云端 OpenAI 兼容 API，或本地 Ollama（无需云密钥）。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.config import settings


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
    2. 未配置密钥但配置了 OLLAMA_BASE_URL → 本地 Ollama（免费本机大脑）
    3. 否则无大脑，走演示文案
    """
    base = settings.openai_base_url.rstrip("/")
    if settings.openai_api_key:
        return ResolvedBrain(
            chat_url=f"{base}/chat/completions",
            authorization_bearer=settings.openai_api_key,
            model=settings.model,
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
    if not b:
        return {
            "has_brain": False,
            "provider": None,
            "model": None,
            "hint": "未配置大模型：请设置 OPENAI_API_KEY，或安装 Ollama 并设置 OLLAMA_BASE_URL（见 .env.example）。",
        }
    return {
        "has_brain": True,
        "provider": b.provider,
        "model": b.model,
        "hint": "大脑已就绪：问答将走真实 LLM + 政策知识库系统提示。",
    }
