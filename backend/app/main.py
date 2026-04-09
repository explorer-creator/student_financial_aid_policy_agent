import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.policy_context import SYSTEM_PROMPT
from app.routers import intelligence

app = FastAPI(title="广东工业大学学生资助政策智能体 API", version="0.1.0")
app.include_router(intelligence.router, prefix="/api")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    mode: str  # "llm" | "demo"


@app.get("/health")
def health():
    return {"status": "ok"}


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
        "配置环境变量 OPENAI_API_KEY 并重启后端后，可获得由大模型结合知识库的个性化回答。",
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


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages 不能为空")

    user_messages = [m for m in body.messages if m.role == "user"]
    last_user = user_messages[-1].content if user_messages else ""

    if not settings.openai_api_key:
        return ChatResponse(reply=_demo_reply(last_user), mode="demo")

    payload = {
        "model": settings.model,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}]
        + [{"role": m.role, "content": m.content} for m in body.messages],
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, json=payload, headers=headers)
    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"上游模型错误: {r.status_code} {r.text[:500]}",
        )
    data = r.json()
    try:
        reply = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=502, detail=f"解析响应失败: {e}") from e
    return ChatResponse(reply=reply.strip(), mode="llm")
