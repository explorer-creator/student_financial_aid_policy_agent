from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # 云端 / 网关「大脑」：填写 OPENAI_API_KEY 后启用（兼容 OpenAI 接口）
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"

    # 本地「大脑」：不填 OPENAI_API_KEY 时，若填写 OLLAMA_BASE_URL 则走 Ollama
    # 例：OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 ；先 ollama pull deepseek-r1:7b（或其它已下载模型名）
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
