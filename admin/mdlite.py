"""Markdown tối giản và an toàn: mọi ký tự HTML đều bị escape trước, sau đó chỉ chuyển một số cú pháp
(# tiêu đề, **đậm**, *nghiêng*, danh sách, [liên kết](url), ![ảnh](url), đoạn văn). Không bao giờ cho HTML thô."""
import html, re

E = lambda s: html.escape(s, quote=True)
_url_ok = re.compile(r'^(https?://[^\s"<>]+|/[^\s"<>]*|assets/uploads/[A-Za-z0-9._-]+)$')


def safe_url(u, img=False):
    u = u.strip()
    if not _url_ok.match(u) or u.startswith('//'):
        return None
    if img and not (u.startswith('https://') or u.startswith('/assets/uploads/') or u.startswith('assets/uploads/')):
        return None
    return u


def inline(t, root=''):
    t = E(t)
    def img(m):
        alt, u = m.group(1), html.unescape(m.group(2))
        s = safe_url(u, img=True)
        if not s:
            return alt
        if s.startswith('/assets/'):
            s = s[1:]
        if s.startswith('assets/'):
            s = root + s
        return f'<img src="{E(s)}" alt="{alt}" loading="lazy" decoding="async">'
    t = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)\)', img, t)
    def link(m):
        txt, u = m.group(1), html.unescape(m.group(2))
        s = safe_url(u)
        if not s:
            return txt
        ext = s.startswith('http')
        if s.startswith('/') and root and not root.startswith('/'):
            s = root + s[1:]              # /phong/... -> ../../phong/... để chạy được cả khi web nằm trong thư mục con
        return f'<a href="{E(s)}"' + (' rel="noopener nofollow ugc" target="_blank"' if ext else '') + f'>{txt}</a>'
    t = re.sub(r'(?<!!)\[([^\]]+)\]\(([^)\s]+)\)', link, t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])', r'<em>\1</em>', t)
    return t


def render(md: str, root='') -> str:
    lines = (md or '').replace('\r\n', '\n').replace('\r', '\n').split('\n')
    out, para, lst = [], [], None
    def flush():
        nonlocal para, lst
        if para:
            out.append('<p>' + '<br>'.join(inline(x, root) for x in para) + '</p>'); para = []
        if lst:
            out.append(f'<{lst[0]}>' + ''.join(f'<li>{inline(x, root)}</li>' for x in lst[1]) + f'</{lst[0]}>'); lst = None
    for ln in lines:
        s = ln.rstrip()
        m = re.match(r'^(#{1,3})\s+(.+)$', s)
        ul = re.match(r'^\s*[-*+]\s+(.+)$', s)
        ol = re.match(r'^\s*\d+[.)]\s+(.+)$', s)
        if not s.strip():
            flush()
        elif m:
            flush(); lvl = max(2, len(m.group(1)))     # # và ## -> h2, ### -> h3 (h1 là tiêu đề bài)
            out.append(f'<h{lvl}>{inline(m.group(2), root)}</h{lvl}>')
        elif ul or ol:
            kind = 'ul' if ul else 'ol'
            if para:
                out.append('<p>' + '<br>'.join(inline(x, root) for x in para) + '</p>'); para = []
            if lst and lst[0] != kind:
                flush()
            lst = lst or (kind, [])
            lst[1].append((ul or ol).group(1))
        else:
            if lst:
                flush()
            para.append(s)
    flush()
    return '\n'.join(out)


def plain(md: str, n=160) -> str:
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', md or '')
    t = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', t)
    t = re.sub(r'[#*>`_-]+', ' ', t)
    t = ' '.join(t.split())
    return t if len(t) <= n else t[:n - 1].rsplit(' ', 1)[0] + '…'
