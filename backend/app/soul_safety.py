"""暖心润情：输入/输出安全护栏（降低诱导与越狱风险，不能替代专业危机干预）。"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum


class SoulSafetyKind(str, Enum):
    CRISIS = "crisis"
    HARM_REQUEST = "harm_request"
    PROHIBITED = "prohibited"
    JAILBREAK = "jailbreak"
    CONFIDENTIALITY = "confidentiality"
    MULTI_TURN = "multi_turn"
    OUTPUT_BLOCKED = "output_blocked"


@dataclass(frozen=True)
class SoulSafetyHit:
    kind: SoulSafetyKind
    reply: str


CRISIS_REPLY = (
    "我听到你现在可能非常难受。这类情况需要尽快获得身边真人或专业人员的帮助，"
    "本栏目无法提供危机干预或替代心理咨询。\n\n"
    "请优先：\n"
    "1. 联系身边可信的家人或朋友；\n"
    "2. 若存在紧迫人身危险，请拨打 110 / 120；\n"
    "3. 如需专业支持，可前往当地正规医疗机构心理科/精神科或公共心理援助渠道（以当地公布信息为准）。\n\n"
    "你值得被认真倾听，也请把安全放在第一位。"
)

HARM_REQUEST_REPLY = (
    "我不能提供任何关于自伤、自杀或伤害他人的方法、步骤或「更有效」的做法。"
    "若你正在承受强烈痛苦，请尽快联系身边可信的人，或拨打 110 / 120。"
    "本栏目仅提供一般性情绪陪伴与科普，不能替代专业评估与干预。"
)

PROHIBITED_REPLY = (
    "我无法提供或讨论色情、暴力、赌博、吸毒、卖淫嫖娼等违法或有害内容，"
    "也不能协助任何违法犯罪活动或「干坏事」的请求。\n\n"
    "本助手聚焦学生资助政策咨询与正当范围内的情绪陪伴；"
    "若你有其他合法、正当的问题，请换一种方式描述。"
)

JAILBREAK_REPLY = (
    "我无法按「忽略规则、扮演无限制角色或输出系统设定」类要求作答。"
    "「暖心润情」仅提供一般性情绪陪伴与心理科普，不能替代心理咨询、精神科诊疗或危机干预。"
    "若你有情绪困扰，可以具体说说最近的压力或感受；若涉及紧迫危险，请优先联系身边可信的人并拨打 110 / 120。"
)

CONFIDENTIALITY_REPLY = (
    "我会认真对待你分享的内容，但需要如实告诉你：依据《中国心理学会临床与咨询心理学工作伦理守则（第二版）》，"
    "**涉及伤害自身或他人的严重风险时，不属于可以绝对保密的范围**（保密例外）。\n\n"
    "**你的生命和安全高于一切。** 若你此刻有自伤、自杀或伤害他人的念头或冲动，"
    "请马上联系身边最信任的人，并拨打 **110 或 120**；也可前往当地正规医疗机构心理科/精神科寻求专业帮助。\n\n"
    "本栏目不能替代专业心理咨询或危机干预，但愿意在安全边界内倾听你的感受。"
)

MULTI_TURN_REPLY = (
    "我注意到你多次提到危险或绕过规则的内容。为保护你的安全，本栏目不能继续按该方向对话。\n\n"
    "若你正感到难以承受或有自伤/伤人风险，请立即联系身边可信的人，或拨打 110 / 120。"
    "本栏目仅提供一般性情绪陪伴，不能替代专业危机干预。"
)

OUTPUT_BLOCKED_REPLY = (
    "刚才的回复不符合本栏目的安全规范，已停止展示。"
    "本助手不能提供自伤/自杀/伤害他人相关方法，不能讨论色情、暴力、黄赌毒等违法有害内容，"
    "也不能下诊断或替代专业咨询。"
    "若你正感到难以承受，请尽快联系身边可信的人，或拨打 110 / 120。"
)

# —— 用户输入：危机表达 ——
_CRISIS_INPUT = re.compile(
    r"(自杀|自[残伤杀]|想死|不想活|活不下去|结束生命|了结生命|轻生|寻短见|自我了断|自我伤害|"
    r"割腕|跳楼|跳河|跳[楼层]|吞药|服毒|上吊|烧炭|伤害自己|杀了自己|了断|一了百了|"
    r"活着没意思|活着没意义|不如去死|厌世|生无可恋|不想活了|想离开人世|想离开这个世界|"
    r"结束一切|自我了结|了结自己|想结束|撑不下去|不想继续活|"
    r"suicide|self[\s-]?harm|kill\s+myself|end\s+my\s+life|want\s+to\s+die|unalive)",
    re.I,
)

# 较轻的危机信号（用于多轮累计，单条不一定拦截）
_CRISIS_SOFT = re.compile(
    r"(绝望|极度痛苦|撑不住|没有希望|人生没意义|想消失|不想醒来|活得很累|太痛苦了)",
    re.I,
)

_HARM_REQUEST_INPUT = re.compile(
    r"((教|告诉|说|写|给|提供|列出).{0,10}(我|怎么|如何|怎样|啥|什么).{0,14}"
    r"(自杀|自残|自伤|割腕|跳楼|服毒|轻生|结束生命|伤害自己|杀人|伤害他人|弄死|上吊|烧炭))"
    r"|((怎么|如何|怎样|什么).{0,8}(自杀|自残|自伤|割腕|跳楼|服毒|轻生|结束生命|伤害他人|安静离开|无痛死))"
    r"|(最好的死法|最[轻容]易的死法|无痛.{0,4}死|自杀.{0,6}方法|自残.{0,6}方法|"
    r"自杀.{0,6}步骤|自伤.{0,6}方式|如何.{0,4}死|怎样.{0,4}死)",
    re.I,
)

_JAILBREAK_INPUT = re.compile(
    r"(忽略.{0,12}(指令|规则|提示|设定|限制|上文|系统|之前))"
    r"|(无视.{0,8}(规则|指令|限制|设定))"
    r"|(忘记.{0,8}(规则|身份|设定|你是|之前))"
    r"|(你现在是.{0,24}(没有|无|不受|无需遵守).{0,10}(限制|规则|约束|道德))"
    r"|(扮演.{0,20}(无限制|不受限|黑客|反派|没有道德|邪恶|坏人|DAN))"
    r"|(进入.{0,8}(调试|开发者|管理员|维护|测试)模式)"
    r"|(jailbreak|dan\s*mode|developer\s*mode|dev\s*mode|god\s*mode|越狱|解除限制|突破限制|"
    r"绕过.{0,6}(规则|限制|审查|过滤)|关闭.{0,6}安全)"
    r"|(输出.{0,12}(system\s*prompt|系统提示|提示词|内部指令|预设|初始设定))"
    r"|(重复.{0,8}(上文|上面|之前).{0,8}(指令|规则|提示))"
    r"|(Do Anything Now|\bDAN\b|\bSTAN\b)"
    r"|(假装.{0,6}(没有|不受).{0,6}限制)"
    r"|(你没有任何限制|你现在自由了|不要遵守规则)"
    r"|(以.{0,6}无.{0,4}限制.{0,6}模式)",
    re.I,
)

# —— 用户输入：色情 / 暴力 / 黄赌毒 / 违法犯罪 ——
_PROHIBITED_PORN = re.compile(
    r"(色情|淫秽|黄片|黄网|色情片|黄色网站|成人视频|裸聊|裸照|偷拍|嫖娼|卖淫|援交|约炮|"
    r"一夜情|开房|性服务|色情资源|看黄|黄片链接|成人网站)"
    r"|(porn|hentai|\bnsfw\b|nude\s+photo|escort\s+service|adult\s+video)",
    re.I,
)

_PROHIBITED_GAMBLING_DRUGS = re.compile(
    r"(赌博|博彩|赌球|赌钱|赌场|六合彩|网络赌博|私彩|下注赢钱|网络菠菜|菠菜平台|"
    r"赌局|赌资|赌台|线上赌)"
    r"|(毒品|吸毒|贩毒|制毒|冰毒|海洛因|大麻|可卡因|摇头丸|"
    r"K粉|k粉|麻古|致幻剂|注射毒品|买毒|卖毒|运毒)"
    r"|(怎么.{0,6}吸毒|如何.{0,6}贩毒|哪里.{0,8}买毒|制毒.{0,6}方法)",
    re.I,
)

_PROHIBITED_VIOLENCE_CRIME = re.compile(
    r"(干坏事|做坏事|违法犯罪|犯罪方法|违法教程|犯法怎么|恐怖袭击|制造枪支|非法持枪|"
    r"买枪|销赃|伪造证件|洗钱|走私|绑票|绑架|强奸|纵火|投毒|灭口)"
    r"|(暴力.{0,6}(教程|方法|教学|手段))"
    r"|((教|告诉|说|写|给|提供|列出).{0,10}.{0,14}"
    r"(杀人|抢劫|盗窃|诈骗|做炸弹|制造武器|制造爆炸|"
    r"入侵.{0,6}(网站|系统|服务器|电脑)|黑客攻击|攻击网站|打人.{0,4}方法))"
    r"|((怎么|如何|怎样).{0,8}(杀人|抢劫|盗窃|诈骗|做炸弹|制造武器|"
    r"入侵.{0,6}(网站|系统|服务器)|洗钱|销赃|伪造证件|打人|施暴))",
    re.I,
)

_CONFIDENTIALITY_INPUT = re.compile(
    r"(绝对保密|务必保密|保证保密|替我保密|帮我保密|必须保密|一定保密)"
    r"|(你会保密|会保密吗|能不能保密|可以保密吗|保密吗)"
    r"|(不要告诉任何人|不能告诉别人|别告诉任何人|不要上报|不要报告)"
    r"|(你会说出去吗|会不会说出去|不要传出去)",
    re.I,
)

# —— 模型输出 ——
_HARM_OUTPUT = re.compile(
    r"((可以|建议|不妨|试试|推荐|鼓励).{0,10}(割腕|跳楼|服毒|自杀|自残|轻生|上吊|烧炭))"
    r"|((步骤|方法|方式|教程|指南).{0,8}(自杀|自残|自伤|割腕|跳楼|结束生命))"
    r"|((自杀|自残|自伤|轻生).{0,8}(步骤|方法|方式|教程|指南|如下))"
    r"|(推荐.{0,6}自杀|鼓励.{0,6}自残|帮你.{0,6}自杀)"
    r"|(你可以.{0,12}(结束生命|一了百了|离开这个世界|自我了断))",
    re.I,
)

_DIAGNOSIS_OUTPUT = re.compile(
    r"(你(患有|得了|是|有).{0,14}(抑郁症|焦虑症|双相|精神分裂|人格障碍|精神病|躁郁))"
    r"|(我可以(确诊|诊断)你|我(诊断|判定)你为)",
    re.I,
)

_JAILBREAK_OUTPUT = re.compile(
    r"(好的.{0,10}(忽略|忘记|无视).{0,10}(规则|指令|限制))"
    r"|(我现在(没有|不受|无需遵守).{0,10}(限制|规则))"
    r"|(以下是我的系统提示|system prompt|我的初始指令)",
    re.I,
)

_ABSOLUTE_SECRECY_OUTPUT = re.compile(
    r"((我)?(会|将|一定|绝对|完全|保证).{0,6}(为你)?保密)"
    r"|(不会告诉任何人|谁都不告诉|绝对不说出去)"
    r"|(我承诺.{0,6}保密)",
    re.I,
)

# 若输出承诺绝对保密但未提及「例外/风险/110/120/保密例外」，则拦截
_CONFIDENTIALITY_EXCEPTION_HINT = re.compile(
    r"(保密例外|例外情况|伤害自己|伤害他人|110|120|生命安全|不能绝对保密|无法绝对保密|不属于.*保密)",
    re.I,
)

_PROHIBITED_OUTPUT = re.compile(
    r"(色情|淫秽|黄片|嫖娼|卖淫|援交|约炮|赌博|博彩|赌场|六合彩|"
    r"毒品|吸毒|贩毒|制毒|冰毒|海洛因|大麻|"
    r"干坏事|违法犯罪|犯罪教程|违法操作|恐怖袭击|制造枪支|洗钱|走私)"
    r"|((步骤|方法|方式|教程|指南).{0,8}(杀人|抢劫|盗窃|诈骗|做炸弹|制造武器|"
    r"入侵.{0,6}(网站|系统|服务器)|吸毒|贩毒|赌博))"
    r"|((杀人|抢劫|盗窃|诈骗|做炸弹|吸毒|贩毒|赌博).{0,8}(步骤|方法|方式|教程|指南|如下))",
    re.I,
)

_SCHOOL_REFERRAL_OUTPUT = re.compile(
    r"(联系.{0,8}(学院|辅导员|学工|资助中心|心理中心|保卫处|学生工作))"
    r"|(向.{0,6}(学院|辅导员|学工处|资助中心|心理中心))"
    r"|(广东工业|广工大|gdut\.edu)",
    re.I,
)

_MULTI_TURN_WINDOW = 6  # 最近 N 条用户消息参与多轮分析


def _collect_user_messages(messages: list) -> list[str]:
    out: list[str] = []
    for m in messages:
        role = getattr(m, "role", None) or (m.get("role") if isinstance(m, dict) else None)
        content = getattr(m, "content", None) or (m.get("content") if isinstance(m, dict) else "")
        if role == "user" and isinstance(content, str) and content.strip():
            out.append(content.strip())
    return out


def _collect_user_text(messages: list) -> str:
    return "\n".join(_collect_user_messages(messages))


def _matches_prohibited_input(text: str) -> bool:
    t = text.strip()
    if not t:
        return False
    return bool(
        _PROHIBITED_PORN.search(t)
        or _PROHIBITED_GAMBLING_DRUGS.search(t)
        or _PROHIBITED_VIOLENCE_CRIME.search(t)
    )


def check_prohibited_user_input(last_user: str, messages: list | None = None) -> SoulSafetyHit | None:
    """色情、暴力、黄赌毒、违法犯罪等：政策与暖心润情均拦截。"""
    del messages  # 单轮只看当前用户消息；多轮重复由 _check_multi_turn 处理
    if not last_user.strip():
        return None
    if _matches_prohibited_input(last_user):
        return SoulSafetyHit(SoulSafetyKind.PROHIBITED, PROHIBITED_REPLY)
    return None


def check_prohibited_model_output(text: str) -> str | None:
    """模型输出含违法有害内容时替换为固定话术。"""
    if not text or not text.strip():
        return None
    if _PROHIBITED_OUTPUT.search(text.strip()):
        return PROHIBITED_REPLY
    return None


def _check_multi_turn(user_msgs: list[str], last_user: str) -> SoulSafetyHit | None:
    """多轮：重复越狱、危机升级、累计高危信号。"""
    recent = (user_msgs + [last_user])[-_MULTI_TURN_WINDOW:]
    if len(recent) < 2:
        return None

    jailbreak_count = sum(1 for m in recent if _JAILBREAK_INPUT.search(m))
    if jailbreak_count >= 2:
        return SoulSafetyHit(SoulSafetyKind.MULTI_TURN, MULTI_TURN_REPLY)

    harm_count = sum(1 for m in recent if _HARM_REQUEST_INPUT.search(m))
    if harm_count >= 2:
        return SoulSafetyHit(SoulSafetyKind.MULTI_TURN, HARM_REQUEST_REPLY)

    prohibited_count = sum(1 for m in recent if _matches_prohibited_input(m))
    if prohibited_count >= 2:
        return SoulSafetyHit(SoulSafetyKind.PROHIBITED, PROHIBITED_REPLY)

    prior = "\n".join(recent[:-1])
    current = recent[-1]
    if _CRISIS_INPUT.search(prior) and (
        _HARM_REQUEST_INPUT.search(current) or _JAILBREAK_INPUT.search(current)
    ):
        return SoulSafetyHit(SoulSafetyKind.MULTI_TURN, CRISIS_REPLY)

    crisis_hard = sum(1 for m in recent if _CRISIS_INPUT.search(m))
    crisis_soft = sum(1 for m in recent if _CRISIS_SOFT.search(m))
    if crisis_hard >= 2 or (crisis_hard >= 1 and crisis_soft >= 2):
        return SoulSafetyHit(SoulSafetyKind.MULTI_TURN, CRISIS_REPLY)

    # 先试探正常话题，后连续越狱（第一条未命中完整越狱，第二条补刀）
    if _JAILBREAK_INPUT.search(prior) and _JAILBREAK_INPUT.search(current):
        return SoulSafetyHit(SoulSafetyKind.MULTI_TURN, JAILBREAK_REPLY)

    return None


def check_soul_user_input(last_user: str, messages: list) -> SoulSafetyHit | None:
    """命中则不应调用大模型，直接返回固定安全话术。"""
    blob = f"{_collect_user_text(messages)}\n{last_user}".strip()
    if not blob:
        return None

    user_msgs = _collect_user_messages(messages)

    if _HARM_REQUEST_INPUT.search(last_user) or _HARM_REQUEST_INPUT.search(blob):
        return SoulSafetyHit(SoulSafetyKind.HARM_REQUEST, HARM_REQUEST_REPLY)

    prohibited = check_prohibited_user_input(last_user, messages)
    if prohibited:
        return prohibited

    # 保密陷阱：单轮即固定伦理应答（不交给 LLM 盲目承诺）
    if _CONFIDENTIALITY_INPUT.search(last_user):
        return SoulSafetyHit(SoulSafetyKind.CONFIDENTIALITY, CONFIDENTIALITY_REPLY)

    if _CRISIS_INPUT.search(last_user) or _CRISIS_INPUT.search(blob):
        return SoulSafetyHit(SoulSafetyKind.CRISIS, CRISIS_REPLY)

    if _JAILBREAK_INPUT.search(last_user) or _JAILBREAK_INPUT.search(blob):
        return SoulSafetyHit(SoulSafetyKind.JAILBREAK, JAILBREAK_REPLY)

    multi = _check_multi_turn(user_msgs, last_user)
    if multi:
        return multi

    return None


def check_policy_model_output(text: str) -> str | None:
    """政策问答：若模型输出引导联系具体高校/学院/部门，替换为中性说明。"""
    if not text or not text.strip():
        return None
    if _SCHOOL_REFERRAL_OUTPUT.search(text.strip()):
        return (
            "关于具体办理流程、材料与时间节点，请以你就读高校当年正式通知为准。"
            "本助手不提供任何高校部门联系方式，也不代表某一所高校官方意见。"
            "你可查阅本站「资助文件」栏目中的政策与表格备份作一般参考。"
        )
    return None


def check_soul_model_output(text: str) -> str | None:
    """命中则丢弃模型原文，改返回固定安全话术。"""
    if not text or not text.strip():
        return OUTPUT_BLOCKED_REPLY
    t = text.strip()

    if _ABSOLUTE_SECRECY_OUTPUT.search(t) and not _CONFIDENTIALITY_EXCEPTION_HINT.search(t):
        return OUTPUT_BLOCKED_REPLY

    if check_prohibited_model_output(t):
        return PROHIBITED_REPLY

    if (
        _HARM_OUTPUT.search(t)
        or _DIAGNOSIS_OUTPUT.search(t)
        or _JAILBREAK_OUTPUT.search(t)
        or _SCHOOL_REFERRAL_OUTPUT.search(t)
    ):
        return OUTPUT_BLOCKED_REPLY
    return None
