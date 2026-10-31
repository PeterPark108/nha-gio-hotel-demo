#!/usr/bin/env python3
"""Kiểm tra trang công khai: banner slider (ảnh thuần 16:5), intro gió, noindex/robots khi bật demo, không tràn ngang.
Chạy: python3 tests/e2e_public.py [thư-mục-web]   (mặc định: thư mục repo sau khi chạy build.py)"""
import os, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = sys.argv[1] if len(sys.argv) > 1 else ROOT


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(s, *a): pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=WEB))
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_port}/'
R = []


def ok(n, c):
    R.append((n, bool(c))); print(('PASS ' if c else 'FAIL ') + n)


ACT = "[...document.querySelectorAll('#bvp .slide')].findIndex(s=>s.classList.contains('on'))"
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, h in [(1440, 900), (390, 844)]:
        c = br.new_context(viewport={'width': w, 'height': h}, reduced_motion='no-preference')
        pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(B + 'index.html'); pg.wait_for_timeout(300)
        ok(f'[{w}] intro gió hiện lần đầu', pg.evaluate("!!document.getElementById('intro')"))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        box = pg.locator('#bvp').bounding_box()
        ratio = box['width'] / box['height']
        ok(f'[{w}] khung banner đúng tỉ lệ ({ratio:.2f})', abs(ratio - (16 / 5 if w > 760 else 4 / 3)) < 0.05)
        ok(f'[{w}] banner chỉ có ảnh: không chữ/nút trong slide', pg.evaluate("[...document.querySelectorAll('#bvp .slide')].every(s=>!s.querySelector('h1,h2,p,a,button') && s.innerText.trim()==='')"))
        ok(f'[{w}] tiêu đề + nút nằm dưới banner', pg.evaluate("document.querySelector('.hero-txt h1').getBoundingClientRect().top >= document.querySelector('#bvp').getBoundingClientRect().bottom - 1"))
        n = pg.locator('#bvp .slide').count()
        ok(f'[{w}] có {n} slide (3–6) và {n} chấm', 3 <= n <= 6 and pg.locator('.bdot').count() == n)
        a0 = pg.evaluate(ACT); pg.click('#snext'); pg.wait_for_timeout(200)
        ok(f'[{w}] nút ▶ chuyển slide', pg.evaluate(ACT) == (a0 + 1) % n)
        pg.click('#sprev'); pg.wait_for_timeout(200)
        ok(f'[{w}] nút ◀ quay lại', pg.evaluate(ACT) == a0)
        pg.click(f'.bdot[data-go="{n - 1}"]'); pg.wait_for_timeout(200)
        ok(f'[{w}] bấm chấm → tới slide đó + aria-current', pg.evaluate(ACT) == n - 1 and pg.get_attribute(f'.bdot[data-go="{n - 1}"]', 'aria-current') == 'true')
        ok(f'[{w}] slide ẩn có inert', pg.evaluate("[...document.querySelectorAll('#bvp .slide:not(.on)')].every(s=>s.inert)"))
        pg.mouse.move(0, 0); pg.evaluate("document.activeElement.blur()"); pg.wait_for_timeout(200)  # đang focus trong banner thì slider cố ý dừng
        a = pg.evaluate(ACT); pg.wait_for_timeout(6200)
        ok(f'[{w}] tự chạy sau ~5,5 giây', pg.evaluate(ACT) != a)
        pg.hover('#bvp'); a = pg.evaluate(ACT); pg.wait_for_timeout(6200)
        ok(f'[{w}] dừng khi rê chuột/chạm', pg.evaluate(ACT) == a)
        ok(f'[{w}] không tràn ngang', pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        ok(f'[{w}] không lỗi JS', not errs)
        c.close()
    c = br.new_context(reduced_motion='reduce'); pg = c.new_page(); pg.goto(B + 'index.html'); pg.wait_for_timeout(300)
    a = pg.evaluate(ACT); pg.wait_for_timeout(6200)
    ok('giảm chuyển động: không intro, không tự chạy', pg.evaluate("!document.getElementById('intro')") and pg.evaluate(ACT) == a)
    pages = ['index.html', 'tin-tuc/index.html', 'lien-he.html', 'phong/index.html']
    ok('noindex trên các trang (chế độ demo)', all('noindex' in (pg.goto(B + x) and pg.locator('meta[name=robots]').get_attribute('content') or '') for x in pages))
    ok('thông báo demo hiện ở chân trang', 'Lưu ý bản demo' in pg.inner_text('footer'))
    ok('robots.txt Disallow: /', 'Disallow: /' in open(os.path.join(WEB, 'robots.txt')).read())
    br.close()
bad = [n for n, v in R if not v]
print(f'\n{len(R) - len(bad)}/{len(R)} PASS' + (f' – FAIL: {bad}' if bad else ''))
sys.exit(1 if bad else 0)
