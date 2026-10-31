"""Dựng lại trang tĩnh (build.py) và, nếu có NHAGIO_WEB_ROOT, phát hành bản mới bằng cách đổi symlink nguyên tử."""
import os, sys, subprocess, shutil, threading, time, glob, fcntl

_lock = threading.Lock()
# Những thứ KHÔNG được đưa ra thư mục web công khai
EXCLUDE = {'admin', 'data', 'tools', 'tests', 'var', 'screenshots', '.git', '.github', '__pycache__', 'deploy'}
EXCLUDE_EXT = ('.py', '.pyc', '.md', '.txt', '.example', '.env', '.sh', '.toml', '.cfg', '.ini', '.log')
KEEP_TXT = {'robots.txt'}
KEEP_MD_UNDER = ('assets/photos/CREDITS.md',)


def _ignore(root):
    def ign(d, names):
        rel = os.path.relpath(d, root).replace('\\', '/')
        out = []
        for n in names:
            full = n if rel == '.' else f'{rel}/{n}'
            if rel == '.' and n in EXCLUDE:
                out.append(n)
            elif n.startswith('.') and n != '.well-known':
                out.append(n)
            elif n.endswith(EXCLUDE_EXT) and n not in KEEP_TXT and full not in KEEP_MD_UNDER:
                out.append(n)
        return out
    return ign


def build(cfg):
    with _lock:
        lockf = open(os.path.join(cfg.var, 'build.lock'), 'w')
        fcntl.flock(lockf, fcntl.LOCK_EX)
        try:
            t = time.time()
            r = subprocess.run([sys.executable, os.path.join(cfg.site_root, 'build.py')], cwd=cfg.site_root,
                               capture_output=True, text=True, timeout=180)
            if r.returncode != 0:
                raise RuntimeError('Dựng trang thất bại: ' + (r.stderr or r.stdout)[-500:])
            rel = None
            if cfg.web_root:
                rel = release(cfg)
            return {'seconds': round(time.time() - t, 2), 'release': rel}
        finally:
            fcntl.flock(lockf, fcntl.LOCK_UN)
            lockf.close()


def release(cfg):
    rdir = cfg.releases
    os.makedirs(rdir, exist_ok=True)
    name = time.strftime('%Y%m%d-%H%M%S')
    dst = os.path.join(rdir, name)
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(cfg.site_root, dst, ignore=_ignore(cfg.site_root))
    for d, _, files in os.walk(dst):
        os.chmod(d, 0o755)
        for f in files:
            os.chmod(os.path.join(d, f), 0o644)
    os.chmod(rdir, 0o755)
    link = cfg.web_root
    tmp = link + '.new'
    if os.path.lexists(tmp):
        os.remove(tmp)
    os.symlink(dst, tmp)
    os.replace(tmp, link)                     # đổi nguyên tử: khách không bao giờ thấy trang dở dang
    for old in sorted(glob.glob(os.path.join(rdir, '*')))[:-cfg.keep_releases]:
        if os.path.realpath(old) != os.path.realpath(link):
            shutil.rmtree(old, ignore_errors=True)
    return name
