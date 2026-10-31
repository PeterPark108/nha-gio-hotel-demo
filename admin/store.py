"""Lưu trữ: JSON ghi nguyên tử + sao lưu tự động, phiên đăng nhập/giới hạn đăng nhập (SQLite), nhật ký thao tác."""
import json, os, sqlite3, time, threading, hashlib, hmac, secrets, glob, re, datetime

_lock = threading.RLock()
DATA_FILES = ('site.json', 'banners.json', 'posts.json')


def now():
    return time.time()


def iso_now():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).replace(microsecond=0).isoformat()


def atomic_write(path, text):
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    tmp = os.path.join(d, f'.{os.path.basename(path)}.{secrets.token_hex(4)}.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


class Data:
    def __init__(self, site_root, var, keep):
        self.dir = os.path.join(site_root, 'data')
        self.bak = os.path.join(var, 'backups')
        self.keep = keep
        os.makedirs(self.bak, exist_ok=True)

    def read(self, name):
        assert name in DATA_FILES
        with open(os.path.join(self.dir, name), encoding='utf-8') as f:
            return json.load(f)

    def write(self, name, obj):
        assert name in DATA_FILES
        with _lock:
            src = os.path.join(self.dir, name)
            if os.path.exists(src):
                stamp = time.strftime('%Y%m%d-%H%M%S') + f'-{secrets.token_hex(2)}'
                with open(src, encoding='utf-8') as f:
                    atomic_write(os.path.join(self.bak, f'{name[:-5]}.{stamp}.json'), f.read())
                olds = sorted(glob.glob(os.path.join(self.bak, f'{name[:-5]}.*.json')))
                for o in olds[:-self.keep]:
                    os.remove(o)
            atomic_write(src, json.dumps(obj, ensure_ascii=False, indent=1))

    def backups(self):
        out = []
        for p in sorted(glob.glob(os.path.join(self.bak, '*.json')), reverse=True):
            b = os.path.basename(p)
            m = re.fullmatch(r'(site|banners|posts)\.(\d{8})-(\d{6})-[0-9a-f]{4}\.json', b)
            if m:
                out.append({'id': b, 'file': m.group(1), 'when': f'{m.group(2)[6:8]}/{m.group(2)[4:6]}/{m.group(2)[:4]} {m.group(3)[:2]}:{m.group(3)[2:4]}:{m.group(3)[4:]}'})
        return out

    def restore(self, bid):
        m = re.fullmatch(r'(site|banners|posts)\.\d{8}-\d{6}-[0-9a-f]{4}\.json', bid or '')
        if not m:
            raise ValueError('Bản sao lưu không hợp lệ.')
        p = os.path.join(self.bak, bid)
        with open(p, encoding='utf-8') as f:
            obj = json.load(f)
        self.write(m.group(1) + '.json', obj)
        return m.group(1)


class Auth:
    """Mật khẩu (argon2id), phiên phía máy chủ, giới hạn đăng nhập sai."""
    def __init__(self, cfg):
        from argon2 import PasswordHasher
        self.ph = PasswordHasher()                # argon2id, tham số mặc định của argon2-cffi
        self.cfg = cfg
        os.makedirs(cfg.var, exist_ok=True)
        try:
            os.chmod(cfg.var, 0o700)
        except OSError:
            pass
        self.auth_file = os.path.join(cfg.var, 'auth.json')
        self.db_path = os.path.join(cfg.var, 'admin.db')
        self.audit_path = os.path.join(cfg.var, 'audit.log')
        with self._db() as c:
            c.execute('create table if not exists sessions(sid text primary key, user text, csrf text, created real, seen real, ip text)')
            c.execute('create table if not exists fails(ip text, ts real)')
            c.execute('create index if not exists fails_ts on fails(ts)')
        self._dummy = self.ph.hash(secrets.token_urlsafe(16))

    def _db(self):
        c = sqlite3.connect(self.db_path, timeout=10, isolation_level=None)
        c.execute('pragma journal_mode=wal')
        return c

    # --- tài khoản
    def account(self):
        try:
            with open(self.auth_file, encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return None

    def set_password(self, user, pw, must_change):
        if len(pw) < 12:
            raise ValueError('Mật khẩu cần ít nhất 12 ký tự.')
        atomic_write(self.auth_file, json.dumps({'user': user, 'hash': self.ph.hash(pw), 'must_change': bool(must_change), 'changed': iso_now()}))
        os.chmod(self.auth_file, 0o600)

    def verify(self, user, pw):
        acc = self.account()
        ok_user = acc is not None and hmac.compare_digest((acc.get('user') or '').encode(), (user or '').encode())
        h = acc['hash'] if acc else self._dummy
        try:
            ok = self.ph.verify(h, pw or '')
        except Exception:
            ok = False
        if ok and ok_user and self.ph.check_needs_rehash(h):
            self.set_password(acc['user'], pw, acc.get('must_change'))
        return bool(ok and ok_user)

    # --- giới hạn đăng nhập
    def locked(self, ip):
        t = now()
        with self._db() as c:
            c.execute('delete from fails where ts<?', (t - 86400,))
            n_ip, last = c.execute('select count(*),max(ts) from fails where ip=? and ts>?', (ip, t - self.cfg.ip_window)).fetchone()
            n_all, last_all = c.execute('select count(*),max(ts) from fails where ts>?', (t - self.cfg.ip_window,)).fetchone()
        if n_ip >= self.cfg.ip_max_fail:
            return int(last + self.cfg.ip_window - t) + 1
        if n_all >= self.cfg.global_max_fail:          # nhiều IP cùng dò: tạm khóa chung 10 phút
            return max(1, int(last_all + 600 - t) + 1)
        return 0

    def fail(self, ip):
        with self._db() as c:
            c.execute('insert into fails values(?,?)', (ip, now()))

    def clear_fails(self, ip):
        with self._db() as c:
            c.execute('delete from fails where ip=?', (ip,))

    # --- phiên
    def _h(self, token):
        return hmac.new(self.cfg.secret.encode(), token.encode(), hashlib.sha256).hexdigest()

    def new_session(self, user, ip):
        token = secrets.token_urlsafe(32)
        csrf = secrets.token_urlsafe(32)
        t = now()
        with self._db() as c:
            c.execute('insert into sessions values(?,?,?,?,?,?)', (self._h(token), user, csrf, t, t, ip))
        return token

    def get_session(self, token):
        if not token or len(token) > 200:
            return None
        t = now()
        sid = self._h(token)
        with self._db() as c:
            c.execute('delete from sessions where seen<? or created<?', (t - self.cfg.idle, t - self.cfg.absolute))
            row = c.execute('select user,csrf,created,seen from sessions where sid=?', (sid,)).fetchone()
            if not row:
                return None
            c.execute('update sessions set seen=? where sid=?', (t, sid))
        return {'user': row[0], 'csrf': row[1], 'created': row[2], 'sid': sid}

    def end_session(self, token):
        if token:
            with self._db() as c:
                c.execute('delete from sessions where sid=?', (self._h(token),))

    def end_all(self):
        with self._db() as c:
            c.execute('delete from sessions')

    # --- nhật ký (không bao giờ ghi mật khẩu)
    def audit(self, ip, user, action, detail=''):
        line = json.dumps({'ts': iso_now(), 'ip': ip, 'user': user, 'action': action, 'detail': str(detail)[:300]}, ensure_ascii=False)
        with _lock:
            with open(self.audit_path, 'a', encoding='utf-8') as f:
                f.write(line + '\n')
            try:
                os.chmod(self.audit_path, 0o600)
            except OSError:
                pass

    def audit_tail(self, n=50):
        try:
            with open(self.audit_path, encoding='utf-8') as f:
                lines = f.readlines()[-n:]
        except FileNotFoundError:
            return []
        return [json.loads(x) for x in reversed(lines)]
