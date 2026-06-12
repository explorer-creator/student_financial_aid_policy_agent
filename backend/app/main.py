import logging
import re

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.brain import BRAIN_API_REVISION, brain_status_dict, resolve_brain
from app.config import ENV_FILE_PATH, settings
from app.doc_attachments import suggest_doc_attachments
from app.policy_context import SYSTEM_PROMPT
from app.rag_loader import get_rag_chunks_and_sources
from app.rag_selection import select_relevant_chunks
from app.psyche_context import SOUL_WINDOW_SYSTEM_PROMPT
from app.soul_safety import (
    check_policy_model_output,
    check_prohibited_model_output,
    check_prohibited_user_input,
    check_soul_model_output,
    check_soul_user_input,
)
from app.routers import intelligence


_EXTERNAL_URL_RE = re.compile(r"https?://\S+")


def _strip_external_urls(text: str) -> str:
    """移除回答中的外链，避免平台跳转到站外（投诉整改）。"""
    cleaned = _EXTERNAL_URL_RE.sub("", text)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


class UnhandledExceptionMiddleware(BaseHTTPMiddleware):
    """避免未捕获异常变成纯文本 500；仍让 HTTPException 走框架默认处理。"""

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            logging.exception("未捕获异常 %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=500,
                content={"detail": f"{type(exc).__name__}: {exc!s}"},
            )


app = FastAPI(title="砺志励行小助手 API", version="0.2.0")
app.include_router(intelligence.router, prefix="/api")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(UnhandledExceptionMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    # 与 allow_origins=* 组合时，True 会导致浏览器拒绝跨域；本 API 不依赖 Cookie，用 False 即可
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    app_scope: str = Field(
        default="policy",
        description="policy=资助政策；soul_window=暖心润情（情感心理陪伴）",
    )

    @field_validator("app_scope", mode="before")
    @classmethod
    def normalize_app_scope(cls, v: object) -> str:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return "policy"
        s = str(v).strip().lower()
        return s if s in ("policy", "soul_window") else "policy"


class ChatAttachment(BaseModel):
    label: str
    filename: str  # 相对于站点根 docs/ 下的文件名


class ChatResponse(BaseModel):
    reply: str
    mode: str  # "llm" | "demo"
    attachments: list[ChatAttachment] | None = None


@app.get("/health")
def health():
    return {"status": "ok", "brain_api_revision": BRAIN_API_REVISION}


@app.get("/api/meta")
def api_meta():
    """用于确认当前进程是否已加载最新后端代码（与 brain 无关时也可看 revision）。"""
    p_ch, _ = get_rag_chunks_and_sources("policy")
    m_ch, _ = get_rag_chunks_and_sources("soul_window")
    return {
        "brain_api_revision": BRAIN_API_REVISION,
        "env_file_exists": ENV_FILE_PATH.is_file(),
        "rag_policy_chunks": len(p_ch),
        "rag_mental_health_chunks": len(m_ch),
    }


# 看板示例数据单独挂在 main，避免与 intelligence 路由堆叠时排查困难；与原先 /api/dashboard/summary 行为一致
_DASHBOARD_SUMMARY_DEMO: dict = {
    "apply_progress": [
        {"category": "国家奖学金", "submitted": 186, "approved": 174, "rejected": 12},
        {"category": "国家励志奖学金", "submitted": 912, "approved": 865, "rejected": 47},
        {"category": "国家助学金", "submitted": 3890, "approved": 3621, "rejected": 269},
        {"category": "社会奖助学金", "submitted": 624, "approved": 512, "rejected": 112},
    ],
    "college_completion_rate": [
        {"college": "示例院系A", "completion_rate": 0.92},
        {"college": "示例院系B", "completion_rate": 0.89},
        {"college": "示例院系C", "completion_rate": 0.94},
        {"college": "示例院系D", "completion_rate": 0.86},
        {"college": "示例院系E", "completion_rate": 0.9},
    ],
    "pending_appeals": [
        {"ticket_id": "APL-2026-0018", "college": "示例院系C", "days_pending": 2, "status": "待初审复核"},
        {"ticket_id": "APL-2026-0021", "college": "示例院系D", "days_pending": 4, "status": "待评审组意见"},
        {"ticket_id": "APL-2026-0030", "college": "示例院系A", "days_pending": 1, "status": "待终审确认"},
    ],
    "disclaimer": "示例数据。生产环境应来自业务数据库与流程系统。",
}


@app.get("/api/dashboard/summary")
def dashboard_summary():
    """管理看板示例：申请进度、单位完成率、待处理异议。"""
    return _DASHBOARD_SUMMARY_DEMO


@app.get("/api/brain/status")
def brain_status():
    """是否已接通大模型（OpenAI 兼容接口，如 DeepSeek）。"""
    return brain_status_dict()


def _demo_reply(user_text: str) -> str:
    t = user_text.strip().lower()
    lines = [
        "【演示模式】未配置大模型 API 密钥，以下为固定示例回复（国家及常见高校资助政策归纳）。",
        "",
        "国家层面：本专科国奖10000元/年、励志6000元/年、助学金平均3700元/年（高校在2500—5000元分档）等为近年常见标准，以财教〔2024〕181号等国家文件及就读高校执行为准。",
        "具体申请流程与材料以就读高校当年通知为准。",
        "",
        f"您提到的问题摘要：「{user_text[:200]}{'…' if len(user_text) > 200 else ''}」",
        "",
        "配置 OPENAI_API_KEY 与 OPENAI_BASE_URL（如 DeepSeek），重启后端后可获得大模型结合知识库的个性化回答。",
    ]
    if any(k in t for k in ("助学金", "困难", "家庭经济")):
        lines.insert(
            3,
            "国家助学金一般须已认定为家庭经济困难学生；同一学年可同时申请国家助学金与国家奖学金或励志奖学金之一，但国奖与励志不能兼得。",
        )
    if any(k in t for k in ("贷款", "生源地", "还款")):
        lines.insert(
            3,
            "生源地信用助学贷款额度本专科生每年最高约20000元、研究生25000元（财教〔2024〕188号），返校后按就读高校通知提交受理证明。",
        )
    return "\n".join(lines)


def _soul_window_demo_reply(user_text: str) -> str:
    t = user_text.strip()
    head = (
        "【暖心润情·演示模式】当前未接通大模型（未配置 OPENAI_API_KEY 或大脑不可用），以下为固定说明，无法针对你的具体情况做个性化回应。\n\n"
    )
    body = (
        "你愿意说出来，这本身就很不容易。若你正感到持续低落、焦虑或人际困扰，可优先考虑规律作息、适度运动，"
        "并在需要时前往当地正规医疗机构心理科/精神科获得专业评估。\n\n"
        "若你此刻有伤害自己或他人的冲动，请立即联系身边可信的人，或拨打 110 / 120。\n\n"
    )
    tail = f"你刚才分享的内容摘要：「{t[:200]}{'…' if len(t) > 200 else ''}」\n\n配置 API 密钥并重启后端后，可在此获得由模型生成的倾听与建议（仍不能替代专业心理咨询）。"
    if any(k in t for k in ("睡不着", "失眠", "焦虑", "抑郁", "想哭")):
        body += "\n（提示）演示模式下无法做睡眠或情绪「诊断」；规律作息、适度运动与线下咨询更值得优先考虑。\n\n"
    return head + body + tail


def _extract_assistant_text(data: dict) -> str:
    """解析 OpenAI 兼容 chat/completions JSON；兼容 content 为 str / list、message 非 dict。"""
    choices = data.get("choices")
    if not choices:
        raise KeyError("无 choices")
    msg = choices[0].get("message")
    if msg is None:
        raise KeyError("无 message")
    if isinstance(msg, str):
        s = msg.strip()
        if s:
            return s
        raise KeyError("message 为空字符串")
    if not isinstance(msg, dict):
        raise TypeError(f"message 类型异常: {type(msg)!r}")

    raw = msg.get("content")
    if raw is None:
        text = ""
    elif isinstance(raw, str):
        text = raw
    elif isinstance(raw, list):
        parts: list[str] = []
        for p in raw:
            if isinstance(p, dict) and p.get("type") == "text":
                parts.append(str(p.get("text", "")))
            elif isinstance(p, dict) and "text" in p:
                parts.append(str(p.get("text", "")))
        text = "".join(parts)
    else:
        text = str(raw)
    text = text.strip()
    if not text:
        rc = msg.get("reasoning_content")
        text = (rc if isinstance(rc, str) else str(rc or "")).strip()
    if not text:
        raise KeyError("choices[0].message 无可用文本")
    return text


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    try:
        return await _chat_core(body)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("POST /api/chat 未捕获异常")
        raise HTTPException(
            status_code=502,
            detail=f"服务器处理失败: {type(e).__name__}: {e!s}",
        ) from e


async def _chat_core(body: ChatRequest) -> ChatResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages 不能为空")

    user_messages = [m for m in body.messages if m.role == "user"]
    last_user = user_messages[-1].content if user_messages else ""

    scope = body.app_scope if body.app_scope in ("policy", "soul_window") else "policy"

    prohibited = check_prohibited_user_input(last_user, body.messages)
    if prohibited:
        logging.info("input blocked (prohibited): %s scope=%s", prohibited.kind.value, scope)
        return ChatResponse(
            reply=_strip_external_urls(prohibited.reply),
            mode="safe",
        )

    if scope == "soul_window":
        safety = check_soul_user_input(last_user, body.messages)
        if safety:
            logging.info("soul_window input blocked: %s", safety.kind.value)
            return ChatResponse(
                reply=_strip_external_urls(safety.reply),
                mode="safe",
            )

    brain = resolve_brain()
    if not brain:
        if scope == "soul_window":
            return ChatResponse(
                reply=_strip_external_urls(_soul_window_demo_reply(last_user)),
                mode="demo",
            )
        atts = suggest_doc_attachments(last_user)
        return ChatResponse(
            reply=_strip_external_urls(_demo_reply(last_user)),
            mode="demo",
            attachments=[ChatAttachment(**a) for a in atts] if atts else None,
        )

    if scope == "soul_window":
        system = SOUL_WINDOW_SYSTEM_PROMPT
        ch, src = get_rag_chunks_and_sources("soul_window")
        if ch:
            rag = select_relevant_chunks(last_user, ch, src, top_k=4, max_chars=7000)
            if rag:
                system = f"{SOUL_WINDOW_SYSTEM_PROMPT}\n\n{rag}"
    else:
        system = SYSTEM_PROMPT
        ch, src = get_rag_chunks_and_sources("policy")
        if ch:
            rag = select_relevant_chunks(last_user, ch, src)
            if rag:
                system = f"{SYSTEM_PROMPT}\n\n{rag}"

    temperature = 0.25 if scope == "soul_window" else 0.4
    payload = {
        "model": brain.model,
        "messages": [{"role": "system", "content": system}]
        + [{"role": m.role, "content": m.content} for m in body.messages],
        "temperature": temperature,
    }
    if scope == "soul_window":
        payload["max_tokens"] = 480
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if brain.authorization_bearer:
        headers["Authorization"] = f"Bearer {brain.authorization_bearer}"
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(brain.chat_url, json=payload, headers=headers)
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"无法连接模型服务（检查网络、代理与 OPENAI_BASE_URL）：{e!s}",
        ) from e

    if r.status_code != 200:
        snippet = r.text[:800]
        if r.status_code == 402 or "Insufficient Balance" in snippet:
            raise HTTPException(
                status_code=502,
                detail=(
                    "上游账户余额不足（HTTP 402）：请到 DeepSeek 开放平台充值或检查套餐额度后再试；"
                    "也可暂时清空 OPENAI_API_KEY 走演示模式。"
                    f" 原始响应: {snippet}"
                ),
            )
        raise HTTPException(
            status_code=502,
            detail=f"上游模型错误: {r.status_code} {snippet}",
        )
    try:
        data = r.json()
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail=f"上游返回非 JSON: {r.text[:400]}",
        ) from None

    try:
        reply = _strip_external_urls(_extract_assistant_text(data))
    except (KeyError, IndexError, TypeError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"解析响应失败: {e!s} 片段={str(data)[:600]}",
        ) from e

    if scope == "policy":
        policy_safe = check_policy_model_output(reply)
        if policy_safe:
            reply = policy_safe
        prohibited_out = check_prohibited_model_output(reply)
        if prohibited_out:
            reply = prohibited_out
        atts = suggest_doc_attachments(last_user)
        return ChatResponse(
            reply=_strip_external_urls(reply),
            mode="llm" if not (policy_safe or prohibited_out) else "safe",
            attachments=[ChatAttachment(**a) for a in atts] if atts else None,
        )
    blocked = check_soul_model_output(reply)
    if blocked:
        logging.info("soul_window output blocked")
        reply = blocked
        mode = "safe"
    else:
        mode = "llm"
    return ChatResponse(reply=_strip_external_urls(reply), mode=mode)
