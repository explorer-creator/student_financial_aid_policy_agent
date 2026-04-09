"""
模拟登录广工学生工作系统（示例脚本，需合法授权与测试账号）。

运行前：
1) pip install playwright
2) playwright install chromium
3) 设置环境变量：
   GDUT_XSGL_URL, GDUT_XSGL_USERNAME, GDUT_XSGL_PASSWORD
"""

from __future__ import annotations

import os

from playwright.sync_api import sync_playwright


def main() -> None:
    url = os.getenv("GDUT_XSGL_URL", "http://xsgl.gdut.edu.cn/")
    username = os.getenv("GDUT_XSGL_USERNAME", "")
    password = os.getenv("GDUT_XSGL_PASSWORD", "")

    if not username or not password:
        raise SystemExit("请先设置 GDUT_XSGL_USERNAME / GDUT_XSGL_PASSWORD")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(url, wait_until="domcontentloaded")

        # 注意：以下选择器为示例，需按真实页面结构调整
        page.fill('input[name="username"]', username)
        page.fill('input[name="password"]', password)
        page.click('button[type="submit"]')

        page.wait_for_timeout(3000)
        print("已执行登录流程（请人工确认是否成功、是否触发验证码/统一认证）。")
        browser.close()


if __name__ == "__main__":
    main()

