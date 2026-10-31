#!/usr/bin/env python3
"""Kiểm tra giao diện quản trị bằng Playwright trên máy chạy thử (127.0.0.1).
Cần: app quản trị đang chạy với NHAGIO_TEST_MODE=1 trên bản sao dữ liệu, tài khoản thử.
Biến môi trường: E2E_ADMIN (vd http://127.0.0.1:8841/<đường-dẫn>), E2E_PUBLIC (vd http://127.0.0.1:8813),
E2E_USER, E2E_PASS, E2E_SHOTS (thư mục ảnh chụp, tùy chọn)."""
import os, sys, io, re, time
from playwright.sync_api import sync_playwright
from PIL import Image

A, PUB = os.environ['E2E_ADMIN'].rstrip('/'), os.environ['E2E_PUBLIC'].rstrip('/')
U, P = os.environ['E2E_USER'], os.environ['E2E_PASS']
SHOTS = os.environ.get('E2E_SHOTS')
R = []


def ok(n, c):
    R.append((n, bool(c))); print(('PASS ' if c else 'FAIL ') + n); sys.stdout.flush()


def img(path, size, color):
    Image.new('RGB', size, color).save(path, 'JPEG', quality=85)


tmp = '/tmp/ng-e2e'; os.makedirs(tmp, exist_ok=True)
img(f'{tmp}/bn1.jpg', (3000, 1400), (14, 116, 144)); img(f'{tmp}/feat.jpg', (1600, 1000), (245, 158, 11))
open(f'{tmp}/x.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg"/>')
open(f'{tmp}/note.jpg', 'w').write('day khong phai anh')


def shot(page, name):
    if SHOTS:
        page.wait_for_timeout(350)
        page.screenshot(path=os.path.join(SHOTS, name + '.png'))  # chụp đúng khung nhìn (thanh dính giữ đúng vị trí)


def clear(page):
    page.evaluate("document.querySelectorAll('#toasts .msg').forEach(e=>e.remove())")


def overflow(page):
    return page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')


def pub(path=''):
    import urllib.request
    return urllib.request.urlopen(PUB + '/' + path + ('?t=%d' % time.time())).read().decode()


def login(page, pw=P):
    page.goto(A + '/dang-nhap')
    page.fill('#user', U); page.fill('#password', pw); page.click('button[type=submit]')


with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 1440, 'height': 900}, locale='vi-VN', bypass_csp=True)  # chỉ để Playwright chạy wait_for_function; CSP được kiểm ở test_security.py
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append(m.text))  # 4xx từ các bước thử lỗi là cố ý

    page.goto(A + '/dang-nhap')
    ok('trang đăng nhập có noindex', 'noindex' in page.locator('meta[name=robots]').get_attribute('content'))
    shot(page, 'dang-nhap-desktop')
    login(page, 'mat-khau-sai')
    ok('sai mật khẩu → báo lỗi tiếng Việt', page.locator('.msg.err').is_visible() and 'không đúng' in page.inner_text('.msg.err'))
    shot(page, 'dang-nhap-sai-mat-khau-desktop')
    login(page)
    page.wait_for_selector('.kpis')
    ok('đăng nhập → Tổng quan', page.locator('h1').inner_text().startswith('Xin chào'))
    shot(page, 'tong-quan-desktop')

    # ---- banner
    page.click('.tabs a[href="#banner"]'); page.wait_for_selector('.bn-item')
    n0 = page.locator('.bn-item').count()
    first_src = page.locator('.bn-item img').first.get_attribute('src')
    clear(page); page.set_input_files('#bnf', f'{tmp}/x.svg'); page.wait_for_selector('#toasts .msg.err')
    ok('tải SVG lên banner → báo lỗi, không thêm', 'JPG' in page.inner_text('#toasts .msg.err') and page.locator('.bn-item').count() == n0)
    clear(page)
    clear(page); page.set_input_files('#bnf', f'{tmp}/note.jpg'); page.wait_for_selector('#toasts .msg.err')
    ok('tệp văn bản đổi đuôi .jpg → bị từ chối', page.locator('.bn-item').count() == n0)
    clear(page)
    page.set_input_files('#bnf', f'{tmp}/bn1.jpg'); page.wait_for_function(f'document.querySelectorAll(".bn-item").length=={n0 + 1}')
    ok('tải JPEG → thêm 1 ảnh, hiện "Chưa lưu"', page.locator('#dirty').is_visible())
    page.fill(f'[data-alt="{n0}"]', 'Ảnh thử nghiệm QA')
    page.click(f'[data-up="{n0}"]')                     # đưa ảnh mới lên vị trí n0-1
    for i in range(n0 - 1, 0, -1):
        page.click(f'[data-up="{i}"]')
    ok('đổi thứ tự: ảnh mới lên đầu', 'Ảnh thử nghiệm QA' == page.locator('[data-alt="0"]').input_value())
    # xóa ảnh cuối (có hộp xác nhận)
    last = page.locator('.bn-item img').last.get_attribute('src')
    page.click(f'[data-del="{n0}"]'); page.wait_for_selector('dialog[open]')
    shot(page, 'banner-xac-nhan-xoa-desktop')
    page.click('dialog[open] button[value=yes]')
    ok('xóa ảnh có hộp xác nhận', page.locator('.bn-item').count() == n0)
    # rời trang khi chưa lưu → cảnh báo
    page.click('.tabs a[href="#chan-trang"]'); page.wait_for_selector('dialog[open]')
    ok('rời trang khi chưa lưu → hỏi lại', 'chưa lưu' in page.inner_text('dialog[open]'))
    page.click('dialog[open] button[value=no]')
    shot(page, 'banner-desktop')
    clear(page); page.click('#bnsave'); page.wait_for_selector('#toasts .msg.ok')
    page.wait_for_timeout(300)
    home = pub('')
    slides = re.findall(r'id="sl\d"[^>]*><picture><source[^>]*><img src="assets/uploads/(bn-[0-9a-f]{16})\.webp', home)
    newid = re.search(r'bn-[0-9a-f]{16}', page.locator('.bn-item img').first.get_attribute('src')).group(0)
    lastid = re.search(r'bn-[0-9a-f]{16}', last).group(0)
    ok('trang chủ công khai: ảnh mới là slide 1, ảnh đã xóa không còn', slides and slides[0] == newid and lastid not in home and len(slides) == n0 or print(slides, newid, lastid))
    ok('banner công khai chỉ có ảnh (không chữ/nút trên ảnh)', not re.search(r'<div class="slide[^"]*"[^>]*>(?:(?!</div>).)*<(h1|h2|a|button|p|span)[ >]', home, re.S))
    # ---- chân trang
    page.click('.tabs a[href="#chan-trang"]'); page.wait_for_selector('#ff')
    page.fill('[name=phone]', '0901 234 567'); page.fill('[name=s_zalo]', 'https://zalo.me/0901234567'); page.fill('[name=copyright]', '© 2026 Nhà Gió – kiểm thử QA')
    page.fill('[name=s_facebook]', 'facebook.com/khong-https')
    clear(page); page.click('#fsave'); page.wait_for_selector('#toasts .msg.err')
    ok('liên kết MXH sai → báo lỗi rõ ràng', 'https' in page.inner_text('#toasts .msg.err'))
    page.fill('[name=s_facebook]', '')
    shot(page, 'chan-trang-desktop')
    clear(page); page.click('#fsave'); page.wait_for_selector('#toasts .msg.ok')
    pages = ['', 'lien-he.html', 'uu-dai.html', 'tin-tuc/', 'phong/' + 'bungalow-dua.html']
    ok('chân trang mới hiện trên mọi trang', all('kiểm thử QA' in pub(x) and 'zalo.me/0901234567' in pub(x) for x in pages))

    # ---- tin tức
    page.click('.tabs a[href="#tin-tuc"]'); page.wait_for_selector('h1')
    shot(page, 'tin-tuc-danh-sach-desktop')
    page.click('a[href="#tin-tuc/moi"] >> nth=0'); page.wait_for_selector('#body')
    page.fill('[name=title]', 'Ưu đãi mùa thu QA'); page.fill('[name=summary]', 'Giảm giá phòng cuối tuần (mẫu).')
    page.fill('#body', 'Đoạn mở đầu.\n\n'); page.click('[data-fmt=h2]'); page.keyboard.type('Điểm nổi bật')
    page.keyboard.press('End'); page.keyboard.type('\n\nGiá tốt '); page.click('[data-fmt=b]')
    page.wait_for_function("document.querySelector('#pv h2') && document.querySelector('#pv strong')")
    ok('thanh công cụ + xem trước trực tiếp (H2, in đậm)', 'Điểm nổi bật' in page.inner_text('#pv h2'))
    page.set_input_files('#fimgf', f'{tmp}/feat.jpg'); page.wait_for_selector('#falt')
    page.fill('#falt', 'Ảnh minh họa ưu đãi')
    shot(page, 'bai-viet-soan-thao-desktop')
    clear(page); page.click('#pdraft'); page.wait_for_selector('#toasts .msg.ok')
    slug = page.locator('[name=slug]').input_value()
    ok('lưu nháp → không có trên web', slug == 'uu-dai-mua-thu-qa' and 'Ưu đãi mùa thu QA' not in pub('tin-tuc/'))
    clear(page)
    clear(page); page.click('#ppub'); page.wait_for_selector('#toasts .msg.ok'); page.wait_for_selector('#punpub')
    art = pub(f'tin-tuc/{slug}/')
    ok('xuất bản → có trang /tin-tuc/<slug>/ + danh sách + sitemap', 'Ưu đãi mùa thu QA' in pub('tin-tuc/') and '<h2' in art and slug in pub('sitemap.xml'))
    ok('bài viết có canonical + og:title + noindex (demo)', 'rel="canonical"' in art and 'og:title' in art and 'noindex' in art)
    page.fill('[name=title]', 'Ưu đãi mùa thu QA (đã sửa)')
    clear(page); page.click('#ppub'); page.wait_for_selector('#toasts .msg.ok >> nth=0')
    page.wait_for_timeout(300)
    ok('sửa bài đã đăng → web cập nhật', '(đã sửa)' in pub(f'tin-tuc/{slug}/'))
    clear(page)
    clear(page); page.click('#punpub'); page.click('dialog[open] button[value=yes]'); page.wait_for_selector('#toasts .msg.ok')
    page.wait_for_timeout(300)
    import urllib.error
    try:
        pub(f'tin-tuc/{slug}/'); gone = False
    except urllib.error.HTTPError:
        gone = True
    ok('gỡ xuống → trang bài biến mất', gone and '(đã sửa)' not in pub('tin-tuc/'))
    page.goto(A + '/#tin-tuc'); page.wait_for_selector('.plist')
    shot(page, 'tin-tuc-desktop')
    clear(page); page.locator('.pitem', has_text='(đã sửa)').locator('[data-del]').click(); page.click('dialog[open] button[value=yes]')
    page.wait_for_selector('#toasts .msg.ok')
    ok('xóa bài → không còn trong danh sách', page.locator('.pitem', has_text='(đã sửa)').count() == 0)

    # ---- cài đặt
    page.click('.tabs a[href="#cai-dat"]'); page.wait_for_selector('.tbl')
    shot(page, 'cai-dat-desktop')
    ok('chế độ demo mặc định BẬT', page.is_checked('#demo'))
    ok('không tràn ngang ở 1440px', overflow(page) <= 0)

    # ---- di động 390
    m = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='vi-VN', bypass_csp=True)  # chỉ để Playwright chạy wait_for_function; CSP được kiểm ở test_security.py
    mp = m.new_page()
    mp.goto(A + '/dang-nhap'); shot(mp, 'dang-nhap-mobile')
    mp.fill('#user', U); mp.fill('#password', P); mp.click('button[type=submit]'); mp.wait_for_selector('.kpis')
    ovs = {}
    for h, name in [('tong-quan', 'tong-quan'), ('banner', 'banner'), ('chan-trang', 'chan-trang'), ('tin-tuc', 'tin-tuc'), ('tin-tuc/moi', 'bai-viet-soan-thao'), ('cai-dat', 'cai-dat')]:
        mp.goto(A + '/#' + h); mp.wait_for_selector('#main h1'); mp.wait_for_timeout(400)
        ovs[h] = overflow(mp)
        shot(mp, name + '-mobile')
    ok('không tràn ngang ở 390px (mọi mục)', all(v <= 0 for v in ovs.values()) or print(ovs))
    ok('thanh điều hướng dưới hiện trên di động', mp.locator('.bottomnav').is_visible())
    bh = mp.evaluate("Math.min(...[...document.querySelectorAll('.actions .btn')].map(b=>b.getBoundingClientRect().height))")
    ok('nút hành động đủ lớn để chạm (≥44px)', bh >= 44)

    # ---- đăng xuất & hết hạn
    page.click('.tabs a[href="#cai-dat"]'); page.wait_for_selector('#lo'); page.click('#lo')
    page.wait_for_url('**/dang-nhap**')
    page.goto(A + '/'); ok('đăng xuất → không vào lại được', '/dang-nhap' in page.url)
    tok = mp.locator('meta[name=csrf]').get_attribute('content')
    mp.evaluate("t=>fetch(location.pathname.replace(/\\/$/,'')+'/__test/expire',{method:'POST',headers:{'X-CSRF-Token':t}})", tok)
    mp.goto(A + '/'); ok('phiên hết hạn → về trang đăng nhập', '/dang-nhap' in mp.url)
    ok('không có lỗi JavaScript trên trang quản trị', not errs or print(errs))
    br.close()

bad = [n for n, v in R if not v]
print(f'\n{len(R) - len(bad)}/{len(R)} PASS' + (f' – FAIL: {bad}' if bad else ''))
sys.exit(1 if bad else 0)
