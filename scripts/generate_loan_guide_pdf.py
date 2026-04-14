from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas


def main() -> None:
    out = Path("frontend/public/docs/student-origin-loan-guide.pdf")
    out.parent.mkdir(parents=True, exist_ok=True)

    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    c = canvas.Canvas(str(out), pagesize=A4)
    c.setTitle("生源地助学贷款申请指南")

    w, h = A4
    x = 48
    y = h - 56

    c.setFont("STSong-Light", 16)
    c.drawString(x, y, "生源地助学贷款申请指南")
    y -= 30

    c.setFont("STSong-Light", 11)
    lines = [
        "一、学生申请",
        "有贷款需求学生请在入学前到当地区县教育局或资助中心办理国家助学贷款，签订贷款合同，",
        "领取《生源地信用助学贷款受理证明》（以下简称《受理证明》）。国家助学贷款额度为本科生",
        "最高20000元，研究生最高25000元，可用于缴纳学费、住宿费和弥补生活费等。续贷学生可按",
        "国家开发银行线上流程办理，办理成功后打印《受理证明》并在入学后提交。",
        "",
        "二、信息收集",
        "国家开发银行助学贷款学生返校后需提交《受理证明》，空白处请注明学院、学号和联系方式。",
        "老生可提交至学院辅导员处，由学院统一提交资助中心；新生可在各校区绿色通道接待点提交。",
        "",
        "三、缴费处理",
        "1. 贷款学生原则上只需缴纳超出贷款金额部分的欠费，剩余欠款待贷款到账后由学校统一抵扣。",
        "2. 超出贷款部分请在“广东工业大学财务处”微信公众号“学生缴费”栏查询后缴纳。",
        "3. 助学贷款预计在11月由贷款银行拨付到学校对公账号，再由学校财务处抵扣欠费。",
        "4. 抵扣后如有贷款结余，第一学期末退回至学生银行卡，请确保绑定本人有效银行卡（建议一类卡）。",
        "",
        "提示：具体时间、材料和流程以学校当年正式通知为准。",
    ]

    for line in lines:
        if y < 56:
            c.showPage()
            c.setFont("STSong-Light", 11)
            y = h - 56
        c.drawString(x, y, line)
        y -= 18

    c.save()


if __name__ == "__main__":
    main()

