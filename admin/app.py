"""Trang quản trị Nhà Gió – Flask, chạy sau nginx. Mọi đường dẫn nằm dưới /<NHAGIO_ADMIN_PATH>/ (lấy từ file env trên máy chủ)."""
import os, re, json, hmac, secrets, time, unicodedata, html
from flask import Flask, request, abort, jsonify, make_response, redirect, send_from_directory, Blueprint, g
from werkzeug.utils import safe_join
from .config import Config
from .store import Data, Auth, iso_now
from . import imaging, mdlite, publish

E = lambda s: html.escape(str(s), quote=True)
HERE = os.path.dirname(os.path.abspath(__file__))
COOKIE = 'ng_sid'
PRE = 'ng_pre'
SOCIAL_KEYS = ('facebook', 'zalo', 'instagram', 'tiktok', 'youtube')
MAX_BANNERS = 6


def create_app(cfg=None):
    cfg = cfg or Config()
    cfg.check()
    data = Data(cfg.site_root, cfg.var, cfg.keep_backups)
    auth = Auth(cfg)
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = imaging.MAX_BYTES + 512 * 1024
    if cfg.trust_proxy:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    base = '/' + cfg.admin_path
    bp = Blueprint('admin', __name__, url_prefix=base)
    uploads = os.path.join(cfg.site_root, 'assets', 'uploads')

    def ip():
        return request.remote_addr or '?'

    def cookie_kw(max_age=None):
        return dict(httponly=True, secure=cfg.cookie_secure, samesite='Strict', path=base + '/', max_age=max_age)

    # ---------- bảo mật chung
    @app.after_request
    def headers(r):
        r.headers['Content-Security-Policy'] = ("default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; "
                                                "connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        r.headers['X-Frame-Options'] = 'DENY'
        r.headers['X-Content-Type-Options'] = 'nosniff'
        r.headers['Referrer-Policy'] = 'same-origin'
        r.headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive'
        r.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        r.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
        r.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        if cfg.cookie_secure:
            r.headers['Strict-Transport-Security'] = 'max-age=31536000'
        if not request.path.startswith(base + '/static/') and not request.path.startswith(base + '/media/'):
            r.headers['Cache-Control'] = 'no-store'
        return r

    @app.errorhandler(413)
    def too_big(e):
        return err('Tệp quá lớn (tối đa 8 MB).', 413)

    @app.route('/robots.txt')
    def robots():
        return app.response_class('User-agent: *\nDisallow: /\n', mimetype='text/plain')

    def err(msg, code=400):
        return jsonify(ok=False, error=msg), code

    def same_origin():
        o = request.headers.get('Origin')
        if o is None:
            ref = request.headers.get('Referer')
            if ref is None:
                return True              # một số trình duyệt không gửi; vẫn còn token CSRF
            o = ref
        exp = request.host_url.rstrip('/')
        return o == exp or o.startswith(exp + '/')

    def current():
        if 'sess' not in g:
            g.sess = auth.get_session(request.cookies.get(COOKIE))
        return g.sess

    def need_login(api=False):
        s = current()
        if not s:
            if api:
                abort(make_response(err('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401)))
            abort(make_response(redirect(base + '/dang-nhap')))
        return s

    def need_csrf(s):
        if request.method in ('GET', 'HEAD'):
            return
        tok = request.headers.get('X-CSRF-Token') or request.form.get('csrf') or ''
        if not same_origin() or not hmac.compare_digest(tok.encode(), s['csrf'].encode()):
            auth.audit(ip(), s['user'], 'csrf_reject', request.path)
            abort(make_response(err('Yêu cầu không hợp lệ (mã bảo vệ CSRF sai). Hãy tải lại trang.', 403)))

    def api():
        s = need_login(True)
        need_csrf(s)
        acc = auth.account() or {}
        if acc.get('must_change') and request.endpoint not in ('admin.api_state',):
            abort(make_response(err('Bạn cần đổi mật khẩu trước khi tiếp tục.', 403)))
        return s

    # ---------- trang HTML (render phía máy chủ, không có script inline)
    def shell(title, body, csrf='', cls=''):
        return f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="same-origin"><meta name="color-scheme" content="light"><meta name="theme-color" content="#ffffff">
<title>{E(title)} · Quản trị Nhà Gió</title><meta name="csrf" content="{E(csrf)}"><meta name="base" content="{E(base)}"><meta name="public" content="{E(cfg.public_url)}">
<link rel="stylesheet" href="{base}/static/admin.css"></head><body class="{cls}">{body}</body></html>'''

    def login_page(msg='', user='', code=200):
        pre = secrets.token_urlsafe(24)
        body = f'''<main class="auth"><div class="auth-card"><div class="brand"><span class="lg" aria-hidden="true">⌂</span><div><b>Nhà Gió</b><small>Trang quản trị</small></div></div>
<h1>Đăng nhập</h1>{f'<p class="msg err" role="alert">{E(msg)}</p>' if msg else ''}
<form method="post" action="{base}/dang-nhap" class="stack" autocomplete="on"><input type="hidden" name="csrf" value="{pre}">
<label>Tên đăng nhập<input id="user" name="user" autocomplete="username" required value="{E(user)}" autocapitalize="none" spellcheck="false"></label>
<label>Mật khẩu<input id="password" name="password" type="password" autocomplete="current-password" required></label>
<button class="btn primary big" type="submit">Đăng nhập</button></form>
<p class="hint">Trang này chỉ dành cho chủ khách sạn. Quên mật khẩu: liên hệ người quản lý máy chủ để đặt lại.</p></div></main>'''
        r = make_response(shell('Đăng nhập', body, cls='authbody'), code)
        r.set_cookie(PRE, pre, **cookie_kw(900))
        return r

    @bp.route('/dang-nhap', methods=['GET'])
    def login_get():
        if current():
            return redirect(base + '/')
        return login_page()

    @bp.route('/dang-nhap', methods=['POST'])
    def login_post():
        a = ip()
        user = (request.form.get('user') or '')[:64]
        pre_c, pre_f = request.cookies.get(PRE) or '', request.form.get('csrf') or ''
        if not pre_c or not same_origin() or not hmac.compare_digest(pre_c.encode(), pre_f.encode()):
            auth.audit(a, user, 'login_csrf_reject')
            return login_page('Phiên trang đăng nhập đã hết hạn. Vui lòng thử lại.', user, 403)
        wait = auth.locked(a)
        if wait:
            auth.audit(a, user, 'login_locked')
            return login_page(f'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau khoảng {max(1, round(wait / 60))} phút.', user, 429)
        time.sleep(0.25)
        if not auth.verify(user, request.form.get('password') or ''):
            auth.fail(a)
            auth.audit(a, user, 'login_fail')
            left = cfg.ip_max_fail - _fails_recent(a)
            hint = f' Còn {left} lần thử trước khi bị tạm khóa.' if 0 < left <= 3 else ''
            return login_page('Tên đăng nhập hoặc mật khẩu không đúng.' + hint, user, 401)
        auth.clear_fails(a)
        tok = auth.new_session(user, a)
        auth.audit(a, user, 'login_ok')
        acc = auth.account() or {}
        r = redirect(base + ('/doi-mat-khau' if acc.get('must_change') else '/'))
        r.set_cookie(COOKIE, tok, **cookie_kw(cfg.absolute))
        r.delete_cookie(PRE, path=base + '/')
        return r

    def _fails_recent(a):
        with auth._db() as c:
            return c.execute('select count(*) from fails where ip=? and ts>?', (a, time.time() - cfg.ip_window)).fetchone()[0]

    @bp.route('/dang-xuat', methods=['POST'])
    def logout():
        s = need_login()
        need_csrf(s)
        auth.end_session(request.cookies.get(COOKIE))
        auth.audit(ip(), s['user'], 'logout')
        r = redirect(base + '/dang-nhap')
        r.delete_cookie(COOKIE, path=base + '/')
        return r

    def pw_page(s, msg='', ok=False, code=200):
        acc = auth.account() or {}
        body = f'''<main class="auth"><div class="auth-card"><div class="brand"><span class="lg" aria-hidden="true">⌂</span><div><b>Nhà Gió</b><small>Trang quản trị</small></div></div>
<h1>Đổi mật khẩu</h1>{'<p class="msg info">Đây là lần đăng nhập đầu tiên. Hãy đặt mật khẩu mới chỉ mình bạn biết.</p>' if acc.get('must_change') else ''}
{f'<p class="msg {"ok" if ok else "err"}" role="alert">{E(msg)}</p>' if msg else ''}
<form method="post" action="{base}/doi-mat-khau" class="stack"><input type="hidden" name="csrf" value="{E(s['csrf'])}">
<input type="text" name="user" value="{E(s['user'])}" autocomplete="username" hidden>
<label>Mật khẩu hiện tại<input name="old" type="password" autocomplete="current-password" required></label>
<label>Mật khẩu mới <small>(ít nhất 12 ký tự; nên dùng cụm 3–4 từ dễ nhớ)</small><input name="new" type="password" autocomplete="new-password" minlength="12" required></label>
<label>Nhập lại mật khẩu mới<input name="new2" type="password" autocomplete="new-password" minlength="12" required></label>
<button class="btn primary big" type="submit">Lưu mật khẩu mới</button></form>
{'' if acc.get('must_change') else f'<p class="hint"><a href="{base}/">← Về trang quản trị</a></p>'}</div></main>'''
        return make_response(shell('Đổi mật khẩu', body, s['csrf'], 'authbody'), code)

    @bp.route('/doi-mat-khau', methods=['GET'])
    def pw_get():
        return pw_page(need_login())

    @bp.route('/doi-mat-khau', methods=['POST'])
    def pw_post():
        s = need_login()
        need_csrf(s)
        a = ip()
        if auth.locked(a):
            return pw_page(s, 'Thử sai quá nhiều lần, vui lòng đợi rồi thử lại.', code=429)
        old, new, new2 = (request.form.get(k) or '' for k in ('old', 'new', 'new2'))
        if not auth.verify(s['user'], old):
            auth.fail(a)
            auth.audit(a, s['user'], 'password_change_fail')
            return pw_page(s, 'Mật khẩu hiện tại không đúng.', code=400)
        if new != new2:
            return pw_page(s, 'Hai lần nhập mật khẩu mới không giống nhau.', code=400)
        if len(new) < 12 or new == old or new.lower() in ('nhagio123456', '123456789012'):
            return pw_page(s, 'Mật khẩu mới cần ít nhất 12 ký tự và khác mật khẩu cũ.', code=400)
        auth.set_password(s['user'], new, False)
        auth.end_all()                                    # đăng xuất mọi thiết bị khác
        tok = auth.new_session(s['user'], a)
        auth.audit(a, s['user'], 'password_changed')
        r = pw_page(auth.get_session(tok), 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.', ok=True)
        r.set_cookie(COOKIE, tok, **cookie_kw(cfg.absolute))
        return r

    @bp.route('/', methods=['GET'])
    def home():
        s = need_login()
        if (auth.account() or {}).get('must_change'):
            return redirect(base + '/doi-mat-khau')
        body = f'''<div id="app" class="app" data-user="{E(s['user'])}"><noscript><p class="msg err">Trang quản trị cần bật JavaScript.</p></noscript><p class="loading">Đang tải…</p></div>
<form id="logoutForm" method="post" action="{base}/dang-xuat" hidden><input type="hidden" name="csrf" value="{E(s['csrf'])}"></form>
<script src="{base}/static/admin.js" defer></script>'''
        return shell('Quản trị', body, s['csrf'])

    @bp.route('/static/<path:f>')
    def static_f(f):
        if f not in ('admin.css', 'admin.js'):
            abort(404)
        r = send_from_directory(os.path.join(HERE, 'static'), f, max_age=300)
        return r

    @bp.route('/media/<path:f>')
    def media(f):
        need_login()
        if not re.fullmatch(r'(uploads|photos)/[A-Za-z0-9_./-]+\.(webp|jpg|jpeg|png)', f) or '..' in f:
            abort(404)
        p = safe_join(os.path.join(cfg.site_root, 'assets'), f)
        if not p or not os.path.isfile(p):
            abort(404)
        return send_from_directory(os.path.join(cfg.site_root, 'assets'), f, max_age=3600)

    # ---------- API
    def posts_all():
        return data.read('posts.json').get('posts', [])

    @bp.route('/api/state')
    def api_state():
        s = need_login(True)
        st = data.read('site.json')
        return jsonify(ok=True, user=s['user'], site=st, banners=data.read('banners.json').get('banners', []),
                       posts=posts_all(), last_publish=_last_publish(), public=cfg.public_url)

    def _last_publish():
        try:
            with open(os.path.join(cfg.var, 'last_publish.json'), encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return None

    def rebuild(s, why):
        try:
            r = publish.build(cfg)
        except Exception as e:  # noqa
            auth.audit(ip(), s['user'], 'build_fail', str(e)[:200])
            abort(make_response(err('Đã lưu nhưng chưa cập nhật được trang web. Bấm "Xuất bản lại" hoặc báo người quản lý máy chủ.', 500)))
        from .store import atomic_write
        atomic_write(os.path.join(cfg.var, 'last_publish.json'), json.dumps({'when': iso_now(), 'why': why}, ensure_ascii=False))
        return r

    def body_json():
        j = request.get_json(silent=True)
        if not isinstance(j, dict):
            abort(make_response(err('Dữ liệu gửi lên không hợp lệ.'), 400))
        return j

    def text(j, k, mx, req=False, label=''):
        v = j.get(k, '')
        if not isinstance(v, str):
            abort(make_response(err(f'Ô "{label or k}" không hợp lệ.'), 400))
        v = v.strip()
        if req and not v:
            abort(make_response(err(f'Vui lòng nhập "{label or k}".'), 400))
        if len(v) > mx:
            abort(make_response(err(f'Ô "{label or k}" quá dài (tối đa {mx} ký tự).'), 400))
        if re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', v):
            abort(make_response(err(f'Ô "{label or k}" có ký tự không hợp lệ.'), 400))
        return v

    @bp.route('/api/site', methods=['POST'])
    def api_site():
        s = api()
        j = body_json()
        cur = data.read('site.json')
        out = dict(cur)
        out['name'] = text(j, 'name', 120, True, 'Tên khách sạn')
        out['address'] = text(j, 'address', 250, False, 'Địa chỉ')
        ph = text(j, 'phone', 30, False, 'Số điện thoại')
        if ph and not re.fullmatch(r'[0-9+ ().-]{6,30}', ph):
            return err('Số điện thoại chỉ gồm số, dấu cách, dấu + ( ) . -')
        out['phone'] = ph
        em = text(j, 'email', 120, False, 'Email')
        if em and not re.fullmatch(r'[^@\s<>"]+@[^@\s<>"]+\.[A-Za-z]{2,}', em):
            return err('Email chưa đúng định dạng (ví dụ: ten@khachsan.vn).')
        out['email'] = em
        soc = {}
        js = j.get('social') if isinstance(j.get('social'), dict) else {}
        for k in SOCIAL_KEYS:
            v = text(js, k, 300, False, k)
            if v and not re.fullmatch(r'https://[^\s"<>]+', v):
                return err(f'Liên kết {k.capitalize()} phải bắt đầu bằng https://')
            soc[k] = v
        out['social'] = soc
        out['copyright'] = text(j, 'copyright', 200, False, 'Dòng bản quyền')
        if 'demo_mode' in j:
            out['demo_mode'] = bool(j['demo_mode'])
        data.write('site.json', out)
        auth.audit(ip(), s['user'], 'site_save', f"demo_mode={out.get('demo_mode')}")
        rebuild(s, 'site')
        return jsonify(ok=True, site=out, msg='Đã lưu và cập nhật trang web.')

    @bp.route('/api/banners/upload', methods=['POST'])
    def api_banner_upload():
        s = api()
        f = request.files.get('file')
        if not f:
            return err('Chưa chọn ảnh.')
        try:
            d, m, warn = imaging.make_banner(f.read(imaging.MAX_BYTES + 1), uploads)
        except imaging.BadImage as e:
            auth.audit(ip(), s['user'], 'upload_reject', str(e))
            return err(str(e), 415)
        auth.audit(ip(), s['user'], 'banner_upload', d)
        return jsonify(ok=True, banner={'id': 'b' + secrets.token_hex(4), 'd': 'assets/uploads/' + d, 'm': 'assets/uploads/' + m, 'alt': ''}, warn=warn,
                       msg='Đã tải ảnh lên và cắt theo tỉ lệ 16:5. Nhớ nhập mô tả ảnh rồi bấm "Lưu & xuất bản".')

    def valid_upload_path(p, prefix=r'(bn|img)-'):
        return isinstance(p, str) and re.fullmatch(r'assets/uploads/' + prefix + r'[0-9a-f]{16}(-m|-sm)?\.webp', p) and os.path.isfile(os.path.join(cfg.site_root, p))

    def valid_asset_path(p):
        return isinstance(p, str) and '..' not in p and re.fullmatch(r'assets/(uploads|photos)/[A-Za-z0-9_./-]+\.(webp|jpg|jpeg|png)', p) and os.path.isfile(os.path.join(cfg.site_root, p))

    @bp.route('/api/banners', methods=['POST'])
    def api_banners():
        s = api()
        j = body_json()
        lst = j.get('banners')
        if not isinstance(lst, list):
            return err('Danh sách banner không hợp lệ.')
        if len(lst) < 1:
            return err('Cần ít nhất 1 ảnh banner (nên dùng 3–4 ảnh).')
        if len(lst) > MAX_BANNERS:
            return err(f'Tối đa {MAX_BANNERS} ảnh banner.')
        out = []
        for i, b in enumerate(lst):
            if not isinstance(b, dict) or not valid_upload_path(b.get('d'), r'bn-') or not valid_upload_path(b.get('m'), r'bn-'):
                return err(f'Ảnh banner số {i + 1} không hợp lệ.')
            alt = text(b, 'alt', 200, False, f'Mô tả ảnh {i + 1}')
            if not alt:
                return err(f'Vui lòng nhập mô tả cho ảnh banner số {i + 1} (giúp người khiếm thị và Google hiểu ảnh).')
            bid = b.get('id') if isinstance(b.get('id'), str) and re.fullmatch(r'[A-Za-z0-9]{1,20}', b.get('id')) else 'b' + secrets.token_hex(4)
            out.append({'id': bid, 'd': b['d'], 'm': b['m'], 'alt': alt})
        data.write('banners.json', {'banners': out})
        auth.audit(ip(), s['user'], 'banners_save', f'{len(out)} ảnh')
        rebuild(s, 'banners')
        return jsonify(ok=True, banners=out, msg='Đã lưu banner và cập nhật trang web.')

    @bp.route('/api/upload-image', methods=['POST'])
    def api_upload_image():
        s = api()
        f = request.files.get('file')
        if not f:
            return err('Chưa chọn ảnh.')
        try:
            big, sm, size = imaging.make_photo(f.read(imaging.MAX_BYTES + 1), uploads)
        except imaging.BadImage as e:
            auth.audit(ip(), s['user'], 'upload_reject', str(e))
            return err(str(e), 415)
        auth.audit(ip(), s['user'], 'image_upload', big)
        return jsonify(ok=True, f='assets/uploads/' + big, t='assets/uploads/' + sm, w=size[0], h=size[1], msg='Đã tải ảnh lên.')

    @bp.route('/api/preview', methods=['POST'])
    def api_preview():
        api()
        j = body_json()
        b = text(j, 'body', 50000, False, 'Nội dung')
        html_ = mdlite.render(b, base + '/media/').replace('src="' + base + '/media/assets/', 'src="' + base + '/media/')
        return jsonify(ok=True, html=html_)

    def slugify(t):
        t = t.replace('đ', 'd').replace('Đ', 'D')
        t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
        t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
        return t[:80].strip('-') or 'bai-viet'

    @bp.route('/api/posts', methods=['POST'])
    def api_post_save():
        s = api()
        j = body_json()
        posts = posts_all()
        pid = j.get('id')
        cur = next((p for p in posts if p['id'] == pid), None) if pid else None
        if pid and not cur:
            return err('Không tìm thấy bài viết (có thể đã bị xóa).', 404)
        title = text(j, 'title', 150, True, 'Tiêu đề')
        slug = text(j, 'slug', 80, False, 'Đường dẫn') or slugify(title)
        slug = slugify(slug)
        if any(p['slug'] == slug and p['id'] != pid for p in posts):
            slug = f'{slug}-{secrets.token_hex(2)}'
        status = j.get('status')
        if status not in ('draft', 'published'):
            return err('Trạng thái không hợp lệ.')
        img = j.get('image') or {}
        image = None
        if isinstance(img, dict) and img.get('f'):
            if not valid_asset_path(img.get('f')) or (img.get('t') and not valid_asset_path(img.get('t'))):
                return err('Ảnh đại diện không hợp lệ.')
            image = {'f': img['f'], 't': img.get('t') or img['f'], 'alt': text(img, 'alt', 200, False, 'Mô tả ảnh đại diện')}
            if not image['alt']:
                return err('Vui lòng nhập mô tả cho ảnh đại diện.')
        t = iso_now()
        p = dict(cur or {'id': 'p' + secrets.token_hex(6), 'created': t})
        p.update({'slug': slug, 'title': title, 'summary': text(j, 'summary', 300, False, 'Mô tả ngắn'), 'body': text(j, 'body', 50000, False, 'Nội dung'),
                  'image': image, 'status': status, 'updated': t})
        if status == 'published' and not p.get('published'):
            p['published'] = t
        if cur:
            posts = [p if x['id'] == pid else x for x in posts]
        else:
            posts.insert(0, p)
        data.write('posts.json', {'posts': posts})
        auth.audit(ip(), s['user'], 'post_save', f"{p['id']} {status} {slug}")
        was_pub = cur and cur.get('status') == 'published'
        if status == 'published' or was_pub:
            rebuild(s, 'post')
            msg = 'Đã xuất bản bài viết lên trang web.' if status == 'published' else 'Đã chuyển bài về nháp và gỡ khỏi trang web.'
        else:
            msg = 'Đã lưu nháp (chưa hiện trên trang web).'
        return jsonify(ok=True, post=p, msg=msg)

    @bp.route('/api/posts/<pid>/delete', methods=['POST'])
    def api_post_delete(pid):
        s = api()
        posts = posts_all()
        cur = next((p for p in posts if p['id'] == pid), None)
        if not cur:
            return err('Không tìm thấy bài viết.', 404)
        data.write('posts.json', {'posts': [p for p in posts if p['id'] != pid]})
        auth.audit(ip(), s['user'], 'post_delete', f"{pid} {cur.get('slug')}")
        if cur.get('status') == 'published':
            rebuild(s, 'post_delete')
        return jsonify(ok=True, msg='Đã xóa bài viết. Có thể khôi phục trong mục Cài đặt → Sao lưu.')

    @bp.route('/api/publish', methods=['POST'])
    def api_publish():
        s = api()
        r = rebuild(s, 'manual')
        auth.audit(ip(), s['user'], 'publish', r)
        return jsonify(ok=True, msg=f'Đã xuất bản lại toàn bộ trang web ({r["seconds"]} giây).')

    @bp.route('/api/backups')
    def api_backups():
        s = api()
        return jsonify(ok=True, backups=data.backups()[:60], audit=[x for x in auth.audit_tail(30)])

    @bp.route('/api/backups/restore', methods=['POST'])
    def api_restore():
        s = api()
        j = body_json()
        try:
            which = data.restore(j.get('id'))
        except (ValueError, FileNotFoundError):
            return err('Không tìm thấy bản sao lưu này.', 404)
        auth.audit(ip(), s['user'], 'restore', j.get('id'))
        rebuild(s, 'restore')
        return jsonify(ok=True, msg='Đã khôi phục và cập nhật trang web.')

    if cfg.allow_test_routes:
        @bp.route('/__test/expire', methods=['POST'])
        def t_expire():                    # chỉ bật bằng NHAGIO_TEST_MODE=1 khi chạy test tự động
            with auth._db() as c:
                c.execute('update sessions set seen=seen-?', (cfg.idle + 5,))
            return jsonify(ok=True)

    app.register_blueprint(bp)

    @app.route('/')
    def root():
        abort(404)

    @app.errorhandler(404)
    def nf(e):
        return app.response_class('Không tìm thấy.', 404, mimetype='text/plain; charset=utf-8')

    return app


def main():
    import sys
    from .config import Config
    cfg = Config()
    app = create_app(cfg)
    port = int(os.environ.get('NHAGIO_PORT') or 8840)
    app.run('127.0.0.1', port, debug=False, threaded=True)


if __name__ == '__main__':
    main()
