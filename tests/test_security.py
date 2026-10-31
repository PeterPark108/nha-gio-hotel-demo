#!/usr/bin/env python3
"""Kiểm tra các hành vi bảo mật của trang quản trị (Flask test client, không cần mạng).
Chạy: python3 tests/test_security.py   (cần Flask, argon2-cffi, Pillow – xem admin/requirements.txt)
Dùng thư mục tạm + tài khoản thử tạo ngẫu nhiên; không đụng dữ liệu thật."""
import os, sys, io, json, re, shutil, tempfile, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from PIL import Image

tmp = tempfile.mkdtemp(prefix='ngsec-')
site = os.path.join(tmp, 'site')
shutil.copytree(ROOT, site, ignore=shutil.ignore_patterns('.git', 'screenshots', 'var', 'homestay-v1'))
PATH = 'quan-tri-test-' + os.urandom(6).hex()
env = dict(NHAGIO_ADMIN_PATH=PATH, NHAGIO_SECRET=os.urandom(24).hex(), NHAGIO_SITE_ROOT=site, NHAGIO_VAR=os.path.join(tmp, 'var'),
           NHAGIO_COOKIE_SECURE='1', NHAGIO_IP_MAX_FAIL='5', NHAGIO_GLOBAL_MAX_FAIL='30', NHAGIO_TEST_MODE='1')
from admin.config import Config
from admin.app import create_app
from admin.store import Auth
cfg = Config(env)
USER, PW = 'tester', 'thu-nghiem-' + os.urandom(8).hex()
Auth(cfg).set_password(USER, PW, False)
app = create_app(cfg)
from flask.testing import FlaskClient


class HttpsClient(FlaskClient):          # mọi request đi qua https://localhost như sau proxy TLS
    def open(self, *a, **kw):
        kw.setdefault('base_url', 'https://localhost')
        return super().open(*a, **kw)


app.test_client_class = HttpsClient
B = '/' + PATH
R = []


def ok(name, cond):
    R.append((name, bool(cond)))
    print(('PASS ' if cond else 'FAIL ') + name)


def client():
    return app.test_client()


def pre_token(c):
    r = c.get(B + '/dang-nhap')
    return re.search(r'name="csrf" value="([^"]+)"', r.get_data(as_text=True)).group(1)


def login(c, pw=PW, ip='10.0.0.1', user=USER):
    t = pre_token(c)
    return c.post(B + '/dang-nhap', data={'user': user, 'password': pw, 'csrf': t}, environ_base={'REMOTE_ADDR': ip})


def csrf(c):
    r = c.get(B + '/')
    return re.search(r'<meta name="csrf" content="([^"]+)"', r.get_data(as_text=True)).group(1)


def png(fmt='PNG', size=(2400, 1000)):
    b = io.BytesIO()
    im = Image.new('RGB', size, (30, 120, 160))
    ex = Image.Exif(); ex[0x010F] = 'CameraMaker'; ex[0x0110] = 'SECRET-MODEL'
    im.save(b, fmt, exif=ex) if fmt in ('JPEG', 'WEBP', 'PNG') else im.save(b, fmt)
    return b.getvalue()


# 1. đường dẫn & header
c = client()
r = c.get('/')
ok('gốc / trả 404 (không lộ trang quản trị)', r.status_code == 404)
r = c.get(B + '/')
ok('chưa đăng nhập → chuyển tới trang đăng nhập', r.status_code == 302 and r.headers['Location'].endswith('/dang-nhap'))
r = c.get(B + '/api/state')
ok('API chưa đăng nhập → 401', r.status_code == 401)
r = c.get(B + '/dang-nhap')
h = r.headers
ok('header CSP chặn script ngoài/inline', "script-src 'self'" in h.get('Content-Security-Policy', '') and "frame-ancestors 'none'" in h['Content-Security-Policy'])
ok('X-Frame-Options DENY + nosniff + Referrer-Policy', h.get('X-Frame-Options') == 'DENY' and h.get('X-Content-Type-Options') == 'nosniff' and h.get('Referrer-Policy') == 'same-origin')
ok('X-Robots-Tag noindex + meta robots', 'noindex' in h.get('X-Robots-Tag', '') and 'name="robots" content="noindex' in r.get_data(as_text=True))
ok('robots.txt của app chặn tất cả', 'Disallow: /' in c.get('/robots.txt').get_data(as_text=True))
ok('Cache-Control no-store', h.get('Cache-Control') == 'no-store')

# 2. đăng nhập
r = login(client(), pw='sai-mat-khau')
ok('sai mật khẩu → 401, không tạo phiên', r.status_code == 401 and 'ng_sid' not in (r.headers.get('Set-Cookie') or ''))
c = client(); t = pre_token(c)
r = c.post(B + '/dang-nhap', data={'user': USER, 'password': PW, 'csrf': 'sai'}, environ_base={'REMOTE_ADDR': '10.0.0.9'})
ok('form đăng nhập thiếu/sai mã CSRF → 403', r.status_code == 403)
c = client(); t = pre_token(c)
r = c.post(B + '/dang-nhap', data={'user': USER, 'password': PW, 'csrf': t}, headers={'Origin': 'https://ke-xau.example'}, environ_base={'REMOTE_ADDR': '10.0.0.9'})
ok('Origin lạ → 403', r.status_code == 403)
c = client()
r = login(c, ip='10.0.0.2')
sc = r.headers.get('Set-Cookie', '')
ok('đăng nhập đúng → 302 + cookie phiên', r.status_code == 302 and 'ng_sid=' in sc)
ok('cookie HttpOnly + Secure + SameSite=Strict + Path riêng', 'HttpOnly' in sc and 'Secure' in sc and 'SameSite=Strict' in sc and f'Path={B}/' in sc)
ok('đăng nhập rồi vào được API', c.get(B + '/api/state').status_code == 200)

# 3. khóa khi sai nhiều lần (theo IP)
c2 = client()
codes = [login(c2, pw='sai', ip='10.9.9.9').status_code for _ in range(6)]
ok('sai 5 lần → lần 6 bị khóa 429', codes[:5] == [401] * 5 and codes[5] == 429)
ok('khi bị khóa, mật khẩu đúng cũng bị từ chối', login(client(), ip='10.9.9.9').status_code == 429)
ok('IP khác vẫn đăng nhập được', login(client(), ip='10.9.9.8').status_code == 302)
# khóa chung khi nhiều IP cùng dò
for i in range(30):
    login(client(), pw='sai', ip=f'10.50.{i}.1')
ok('quá 30 lần sai toàn hệ thống → khóa chung', login(client(), ip='10.77.0.1').status_code == 429)
import sqlite3
sqlite3.connect(os.path.join(cfg.var, 'admin.db')).execute('delete from fails').connection.commit()

# 4. CSRF trên API
c = client(); login(c, ip='10.0.0.3'); tok = csrf(c)
r = c.post(B + '/api/publish', json={})
ok('API POST không có token CSRF → 403', r.status_code == 403)
r = c.post(B + '/api/publish', json={}, headers={'X-CSRF-Token': 'sai'})
ok('API POST token sai → 403', r.status_code == 403)
r = c.post(B + '/api/publish', json={}, headers={'X-CSRF-Token': tok, 'Origin': 'https://ke-xau.example'})
ok('API POST token đúng nhưng Origin lạ → 403', r.status_code == 403)
r = c.post(B + '/api/publish', json={}, headers={'X-CSRF-Token': tok, 'Origin': 'https://localhost'})
ok('API POST token đúng → 200', r.status_code == 200)
H = {'X-CSRF-Token': tok}

# 5. tải ảnh
r = c.post(B + '/api/banners/upload', data={'file': (io.BytesIO(b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'a.svg')}, headers=H)
ok('SVG bị từ chối', r.status_code == 415)
r = c.post(B + '/api/banners/upload', data={'file': (io.BytesIO(b'GIF89a' + b'\0' * 100), 'a.jpg')}, headers=H)
ok('tệp giả đuôi .jpg bị từ chối (kiểm tra theo nội dung)', r.status_code == 415)
b = io.BytesIO(); Image.new('RGB', (50, 50)).save(b, 'GIF')
r = c.post(B + '/api/banners/upload', data={'file': (io.BytesIO(b.getvalue()), 'a.png')}, headers=H)
ok('GIF thật bị từ chối', r.status_code == 415)
r = c.post(B + '/api/banners/upload', data={'file': (io.BytesIO(b'\0' * (9 * 1024 * 1024)), 'big.jpg')}, headers=H)
ok('tệp > 8 MB bị từ chối (413)', r.status_code == 413)
r = c.post(B + '/api/banners/upload', data={'file': (io.BytesIO(png('JPEG')), '../../etc/passwd.jpg')}, headers=H)
j = r.get_json()
ok('JPEG hợp lệ được nhận, tên file ngẫu nhiên (bỏ tên gốc)', r.status_code == 200 and re.fullmatch(r'assets/uploads/bn-[0-9a-f]{16}\.webp', j['banner']['d']))
fp = os.path.join(site, j['banner']['d'])
im = Image.open(fp)
ok('banner desktop 1920×600 (16:5) WebP', im.size == (1920, 600) and im.format == 'WEBP')
ok('banner mobile 1200×900', Image.open(os.path.join(site, j['banner']['m'])).size == (1200, 900))
raw = open(fp, 'rb').read()
ok('EXIF bị loại bỏ', b'SECRET-MODEL' not in raw and not im.getexif())
NEWB = j['banner']

# 6. dữ liệu banner: chặn đường dẫn lạ
st = c.get(B + '/api/state').get_json()
bad = st['banners'] + [{'d': '../../../etc/passwd', 'm': 'x', 'alt': 'x'}]
r = c.post(B + '/api/banners', json={'banners': bad}, headers=H)
ok('đường dẫn ảnh banner lạ (path traversal) bị từ chối', r.status_code == 400)
r = c.post(B + '/api/banners', json={'banners': [dict(NEWB, alt='')]}, headers=H)
ok('thiếu mô tả ảnh → báo lỗi', r.status_code == 400)
r = c.post(B + '/api/banners', json={'banners': [dict(NEWB, alt='Ảnh thử')] + st['banners']}, headers=H)
ok('lưu banner hợp lệ → 200 + trang chủ có ảnh mới', r.status_code == 200 and NEWB['d'] in open(os.path.join(site, 'index.html'), encoding='utf-8').read())
r = c.get(B + '/media/../data/site.json')
ok('media không cho đọc ngoài assets', r.status_code == 404)
r = c.get(B + '/media/uploads/' + os.path.basename(NEWB['d']))
ok('media phục vụ ảnh đã tải', r.status_code == 200)

# 7. bài viết: chống XSS
evil = '# Tiêu đề <script>alert(1)</script>\n[bấm](javascript:alert(1)) <img src=x onerror=alert(1)> ![x](javascript:alert(2)) [ok](https://vi-du.vn)'
r = c.post(B + '/api/posts', json={'title': '<img src=x onerror=alert(1)>Bài XSS', 'summary': '"><script>x</script>', 'slug': '../../etc', 'body': evil, 'status': 'published'}, headers=H)
p = r.get_json()['post']
ok('slug được làm sạch', re.fullmatch(r'[a-z0-9-]+', p['slug']) and '..' not in p['slug'])
out = open(os.path.join(site, 'tin-tuc', p['slug'], 'index.html'), encoding='utf-8').read()
main = out.split('<main', 1)[1].split('</main>', 1)[0]
ok('trang bài viết không có <script> / onerror / javascript:', '<script' not in main.lower() and 'onerror=' not in main.replace('&lt;img src=x onerror', '') and 'javascript:' not in main)
ok('tiêu đề được escape trong <title> và h1', '&lt;img src=x onerror=alert(1)&gt;Bài XSS' in out)
ok('liên kết https hợp lệ được giữ', 'href="https://vi-du.vn"' in main)
r = c.post(B + '/api/preview', json={'body': evil}, headers=H)
ok('xem trước cũng đã làm sạch', '<script' not in r.get_json()['html'] and 'javascript:' not in r.get_json()['html'])
r = c.post(B + '/api/posts', json={'title': 'x', 'body': '', 'status': 'published', 'image': {'f': '../../admin/app.py', 'alt': 'a'}}, headers=H)
ok('ảnh đại diện ngoài thư mục ảnh bị từ chối', r.status_code == 400)

# 8. chân trang: kiểm tra liên kết
r = c.post(B + '/api/site', json={'name': 'KS', 'social': {'facebook': 'javascript:alert(1)'}}, headers=H)
ok('liên kết MXH không phải https bị từ chối', r.status_code == 400)
r = c.post(B + '/api/site', json={'name': 'KS', 'email': 'a"><script>@x.vn'}, headers=H)
ok('email bất thường bị từ chối', r.status_code == 400)

# 9. sao lưu & khôi phục
bk = c.get(B + '/api/backups').get_json()['backups']
ok('có bản sao lưu tự động', any(x['file'] == 'banners' for x in bk))
r = c.post(B + '/api/backups/restore', json={'id': '../../etc/passwd'}, headers=H)
ok('khôi phục với tên lạ bị từ chối', r.status_code == 404)
r = c.post(B + '/api/backups/restore', json={'id': [x for x in bk if x['file'] == 'banners'][0]['id']}, headers=H)
ok('khôi phục bản banner trước → ảnh mới biến mất khỏi trang chủ', r.status_code == 200 and NEWB['d'] not in open(os.path.join(site, 'index.html'), encoding='utf-8').read())

# 10. hết hạn phiên & đăng xuất
c.post(B + '/__test/expire', headers=H)
ok('phiên quá 12 giờ không hoạt động → 401', c.get(B + '/api/state').status_code == 401)
c = client(); login(c, ip='10.0.0.4'); tok = csrf(c)
r = c.post(B + '/dang-xuat', data={'csrf': 'sai'})
ok('đăng xuất cần CSRF', r.status_code == 403)
r = c.post(B + '/dang-xuat', data={'csrf': tok})
ok('đăng xuất → phiên bị hủy', r.status_code == 302 and c.get(B + '/api/state').status_code == 401)
# phiên tuyệt đối 7 ngày
c = client(); login(c, ip='10.0.0.5')
sqlite3.connect(os.path.join(cfg.var, 'admin.db')).execute('update sessions set created=created-?', (8 * 86400,)).connection.commit()
ok('phiên quá 7 ngày → 401 dù đang hoạt động', c.get(B + '/api/state').status_code == 401)

# 11. bắt đổi mật khẩu lần đầu + đổi mật khẩu
Auth(cfg).set_password(USER, PW, True)
c = client(); r = login(c, ip='10.0.0.6')
ok('lần đầu đăng nhập → chuyển tới đổi mật khẩu', r.headers['Location'].endswith('/doi-mat-khau'))
tok = csrf_pw = re.search(r'name="csrf" value="([^"]+)"', c.get(B + '/doi-mat-khau').get_data(as_text=True)).group(1)
ok('API bị chặn khi chưa đổi mật khẩu', c.post(B + '/api/publish', json={}, headers={'X-CSRF-Token': tok}).status_code == 403)
NEW = 'moi-' + os.urandom(8).hex()
r = c.post(B + '/doi-mat-khau', data={'csrf': tok, 'old': PW, 'new': NEW, 'new2': NEW})
ok('đổi mật khẩu thành công', r.status_code == 200 and 'Đã đổi mật khẩu' in r.get_data(as_text=True))
ok('mật khẩu cũ không còn dùng được', login(client(), pw=PW, ip='10.0.0.7').status_code == 401)
ok('mật khẩu mới dùng được', login(client(), pw=NEW, ip='10.0.0.8').status_code == 302)

# 12. không lộ mật khẩu
acc = json.load(open(os.path.join(cfg.var, 'auth.json')))
ok('auth.json chỉ chứa hash argon2id', acc['hash'].startswith('$argon2id$') and NEW not in json.dumps(acc))
ok('auth.json chmod 600', oct(os.stat(os.path.join(cfg.var, 'auth.json')).st_mode)[-3:] == '600')
log = open(os.path.join(cfg.var, 'audit.log'), encoding='utf-8').read()
ok('nhật ký có login_ok/login_fail, không chứa mật khẩu', 'login_ok' in log and 'login_fail' in log and PW not in log and NEW not in log)

shutil.rmtree(tmp, ignore_errors=True)
bad = [n for n, v in R if not v]
print(f'\n{len(R) - len(bad)}/{len(R)} PASS' + (f' – FAIL: {bad}' if bad else ''))
sys.exit(1 if bad else 0)
