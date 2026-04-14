import logging

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.brain import BRAIN_API_REVISION, brain_status_dict, resolve_brain
from app.config import ENV_FILE_PATH, settings
from app.hongfan_context import HONGFAN_COURSE_LABELS, HONGFAN_SYSTEM_PROMPT, hongfan_course_line
from app.doc_attachments import suggest_doc_attachments
from app.policy_context import SYSTEM_PROMPT
from app.rag_loader import get_rag_chunks_and_sources
from app.rag_selection import select_relevant_chunks
from app.psyche_context import SOUL_WINDOW_SYSTEM_PROMPT
from app.routers import intelligence, learning_materials


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


app = FastAPI(title="砺志励行小助手 API", version="0.1.0")
app.include_router(intelligence.router, prefix="/api")
app.include_router(learning_materials.router, prefix="/api")

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
        description="policy=资助政策；hongfan=红帆知海；soul_window=心灵之窗（情感心理陪伴）",
    )
    course_tag: str | None = Field(default=None, description="hongfan 时可选读本 id")

    @field_validator("app_scope", mode="before")
    @classmethod
    def normalize_app_scope(cls, v: object) -> str:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return "policy"
        s = str(v).strip().lower()
        return s if s in ("policy", "hongfan", "soul_window") else "policy"

    @field_validator("course_tag", mode="before")
    @classmethod
    def normalize_course_tag(cls, v: object) -> str | None:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return None
        s = str(v).strip()
        return s if s in HONGFAN_COURSE_LABELS else None


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
    return {
        "brain_api_revision": BRAIN_API_REVISION,
        "env_file_exists": ENV_FILE_PATH.is_file(),
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
        {"college": "机电工程学院", "completion_rate": 0.92},
        {"college": "自动化学院", "completion_rate": 0.89},
        {"college": "计算机学院", "completion_rate": 0.94},
        {"college": "管理学院", "completion_rate": 0.86},
        {"college": "材料与能源学院", "completion_rate": 0.9},
    ],
    "pending_appeals": [
        {"ticket_id": "APL-2026-0018", "college": "计算机学院", "days_pending": 2, "status": "待辅导员复核"},
        {"ticket_id": "APL-2026-0021", "college": "管理学院", "days_pending": 4, "status": "待学院评审组意见"},
        {"ticket_id": "APL-2026-0030", "college": "机电工程学院", "days_pending": 1, "status": "待资助中心确认"},
    ],
    "disclaimer": "示例数据。生产环境应来自业务数据库与流程系统。",
}


@app.get("/api/dashboard/summary")
def dashboard_summary():
    """管理看板示例：申请进度、学院完成率、待处理异议。"""
    return _DASHBOARD_SUMMARY_DEMO


@app.get("/api/brain/status")
def brain_status():
    """是否已接通大模型（OpenAI 兼容接口，如 DeepSeek）。"""
    return brain_status_dict()


def _demo_reply(user_text: str) -> str:
    t = user_text.strip().lower()
    lines = [
        "【演示模式】未配置大模型 API 密钥，以下为固定示例回复（广东工业大学资助政策）。",
        "",
        "国家层面：本专科国奖10000元/年、励志6000元/年、助学金平均3700元/年（高校在2500—5000元分档）等为近年常见标准，以财教〔2024〕181号等国家文件及学校执行为准。",
        "本校：申请与审核多通过学生工作信息管理系统 http://xsgl.gdut.edu.cn/ ，资助咨询 xsczdb@gdut.edu.cn。",
        "常用官网（可直接复制到浏览器）：学生资助管理中心 https://zxdk.gdut.edu.cn/index.htm ；学工处 https://xsc.gdut.edu.cn/ ；《学生资助工作实施办法》https://xsc.gdut.edu.cn/info/1039/5358.htm ；《全日制本科学生国家奖助学金实施办法》https://xsc.gdut.edu.cn/info/1039/5367.htm ；通知公告 https://zxdk.gdut.edu.cn/index/tzgg/11.htm ；下载中心 https://zxdk.gdut.edu.cn/xzzx.htm 。",
        "",
        f"您提到的问题摘要：「{user_text[:200]}{'…' if len(user_text) > 200 else ''}」",
        "",
        "配置 OPENAI_API_KEY 与 OPENAI_BASE_URL（如 DeepSeek），重启后端后可获得大模型结合知识库的个性化回答。",
    ]
    if any(k in t for k in ("助学金", "困难", "家庭经济")):
        lines.insert(
            3,
            "广工国家助学金须一般已认定为家庭经济困难学生；同一学年可同时申请国家助学金与国家奖学金或励志奖学金之一，但国奖与励志不能兼得。",
        )
    if any(k in t for k in ("贷款", "生源地", "还款")):
        lines.insert(
            3,
            "生源地信用助学贷款额度本专科生每年最高约20000元、研究生25000元（财教〔2024〕188号），返校后按学校通知提交受理证明。",
        )
    if "广工" in user_text or "工业大" in user_text:
        lines.insert(3, "广东工业大学绿色通道、勤工助学、临时困难资助等见《学生资助工作实施办法》及当年通知。")
    if any(k in user_text for k in ("电话", "联系", "咨询", "办公室", "校区")):
        lines.insert(
            3,
            "人工咨询：学生资助管理中心 020-39322619、020-39322610；邮箱 xsczdb@gdut.edu.cn（大学城校区东十东座202室，以官网为准）。",
        )
    return "\n".join(lines)


def _soul_window_demo_reply(user_text: str) -> str:
    t = user_text.strip()
    head = (
        "【心灵之窗·演示模式】当前未接通大模型（未配置 OPENAI_API_KEY 或大脑不可用），以下为固定说明，无法针对你的具体情况做个性化回应。\n\n"
    )
    body = (
        "你愿意说出来，这本身就很不容易。若你正感到持续低落、焦虑或人际困扰，建议优先联系广东工业大学心理健康教育与咨询中心（预约方式与开放时间以学校官网或学院通知为准），或当地医院心理科/精神科获得专业评估。\n\n"
        "若你此刻有伤害自己或他人的冲动，请立即联系身边可信的人，或拨打 110 / 120；也可拨打全国心理援助热线（如 400-161-9995，以实际公布为准）。\n\n"
    )
    tail = f"你刚才分享的内容摘要：「{t[:200]}{'…' if len(t) > 200 else ''}」\n\n配置 API 密钥并重启后端后，可在此获得由模型生成的倾听与建议（仍不能替代专业心理咨询）。"
    if any(k in t for k in ("睡不着", "失眠", "焦虑", "抑郁", "想哭")):
        body += "\n（提示）演示模式下无法做睡眠或情绪「诊断」；规律作息、适度运动与线下咨询更值得优先考虑。\n\n"
    return head + body + tail


def _hongfan_demo_reply(user_text: str, course_tag: str | None) -> str:
    label = HONGFAN_COURSE_LABELS.get(course_tag or "", "")
    head = "【红帆知海·演示模式】未接通大模型，以下为固定说明。"
    course_line = f"\n你选择的读本侧重：{label}" if label else "\n（未选择读本侧重，可点击上方课本后再提问）"
    tail = (
        "\n\n可在此做概念梳理、易混点对比与复习提纲。配置 OPENAI_API_KEY 并重启后端后，可获得生成式讲解。"
        "\n\n说明：不提供任何教材或题库的逐页电子全文；正式学习与考试请以课堂与正版教材为准。"
        f"\n\n你的提问摘要：「{user_text[:180]}{'…' if len(user_text) > 180 else ''}」"
    )
    return head + course_line + tail


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

    scope = body.app_scope if body.app_scope in ("policy", "hongfan", "soul_window") else "policy"

    brain = resolve_brain()
    if not brain:
        if scope == "hongfan":
            return ChatResponse(
                reply=_hongfan_demo_reply(last_user, body.course_tag),
                mode="demo",
            )
        if scope == "soul_window":
            return ChatResponse(reply=_soul_window_demo_reply(last_user), mode="demo")
        atts = suggest_doc_attachments(last_user)
        return ChatResponse(
            reply=_demo_reply(last_user),
            mode="demo",
            attachments=[ChatAttachment(**a) for a in atts] if atts else None,
        )

    if scope == "hongfan":
        system = HONGFAN_SYSTEM_PROMPT + hongfan_course_line(body.course_tag)
    elif scope == "soul_window":
        system = SOUL_WINDOW_SYSTEM_PROMPT
    else:
        system = SYSTEM_PROMPT
        ch, src = get_rag_chunks_and_sources()
        if ch:
            rag = select_relevant_chunks(last_user, ch, src)
            if rag:
                system = f"{SYSTEM_PROMPT}\n\n{rag}"

    temperature = 0.55 if scope == "soul_window" else 0.4
    payload = {
        "model": brain.model,
        "messages": [{"role": "system", "content": system}]
        + [{"role": m.role, "content": m.content} for m in body.messages],
        "temperature": temperature,
    }
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
        reply = _extract_assistant_text(data)
    except (KeyError, IndexError, TypeError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"解析响应失败: {e!s} 片段={str(data)[:600]}",
        ) from e

    if scope == "policy":
        atts = suggest_doc_attachments(last_user)
        return ChatResponse(
            reply=reply,
            mode="llm",
            attachments=[ChatAttachment(**a) for a in atts] if atts else None,
        )
    return ChatResponse(reply=reply, mode="llm")
