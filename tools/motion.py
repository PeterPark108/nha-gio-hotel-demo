#!/usr/bin/env python3
"""Bằng chứng chuyển động: khung hình intro (0.3/0.9/1.5/2.2s), trạng thái hover/reveal, video mobile 390x844. Chạy: python3 tools/motion.py"""
import os,threading,http.server,functools,subprocess,glob,shutil
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.environ.get('OUT') or os.path.join(ROOT,'screenshots','hotel-v2')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(s,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8767),functools.partial(Q,directory=ROOT));threading.Thread(target=srv.serve_forever,daemon=True).start()
B='http://127.0.0.1:8767/';errs=[]
def watch(pg):pg.on('console',lambda m:m.type=='error' and errs.append(m.text));pg.on('pageerror',lambda e:errs.append(str(e)))
with sync_playwright() as p:
    br=p.chromium.launch()
    # 1) intro frames (desktop 1440)
    ctx=br.new_context(viewport={'width':1440,'height':900},locale='vi-VN');pg=ctx.new_page();watch(pg)
    pg.goto(B+'index.html',wait_until='commit');pg.wait_for_selector('#intro',state='attached')
    t0=pg.evaluate('performance.now()')
    for i,t in enumerate((300,900,1500,2200),1):
        now=pg.evaluate('performance.now()');pg.wait_for_timeout(max(0,t-(now-t0)))
        pg.screenshot(path=f'{OUT}/intro-0{i}.png')
    pg.wait_for_timeout(800)
    assert pg.evaluate("!document.getElementById('intro')"),'intro not removed'
    pg.reload();pg.wait_for_timeout(300)
    assert pg.evaluate("!document.getElementById('intro')"),'intro replayed in same session'
    # hover card + reveal
    pg.mouse.wheel(0,700);pg.wait_for_timeout(250);pg.screenshot(path=f'{OUT}/reveal-mid.png')
    pg.wait_for_timeout(900);pg.screenshot(path=f'{OUT}/reveal-done.png')
    pg.hover('#h-rooms ~ * .card, .grid .card >> nth=0');pg.wait_for_timeout(500)
    pg.locator('.grid .card').first.screenshot(path=f'{OUT}/hover-card.png')
    pg.goto(B+'phong/villa-ho-boi-eo-gio.html');pg.wait_for_timeout(400)
    pg.click('.gal button >> nth=0');pg.wait_for_timeout(120);pg.screenshot(path=f'{OUT}/lightbox-opening.png')
    pg.keyboard.press('ArrowRight');pg.wait_for_timeout(100);pg.screenshot(path=f'{OUT}/lightbox-slide.png')
    pg.keyboard.press('Escape');pg.wait_for_timeout(400)
    assert not pg.evaluate("document.getElementById('lb').open"),'lightbox not closed by Esc'
    # skip button / Esc in a fresh session
    c2=br.new_context(viewport={'width':390,'height':844});q=c2.new_page();watch(q);q.goto(B+'index.html');q.wait_for_timeout(200)
    assert q.evaluate("document.activeElement.id")=='introSkip','skip not focused'
    q.keyboard.press('Escape');q.wait_for_timeout(400);assert q.evaluate("!document.getElementById('intro')"),'esc did not skip'
    c2.close()
    # reduced motion: no intro
    c3=br.new_context(reduced_motion='reduce');q=c3.new_page();q.goto(B+'index.html');q.wait_for_timeout(200)
    assert q.evaluate("!document.getElementById('intro')"),'intro shown with reduced motion';c3.close()
    # no JS: intro never shows
    c4=br.new_context(java_script_enabled=False);q=c4.new_page();q.goto(B+'index.html')
    assert not q.is_visible('#intro'),'intro visible without JS';c4.close()
    ctx.close()
    # 2) video mobile
    vd=os.path.join(ROOT,'.vid');shutil.rmtree(vd,ignore_errors=True)
    c=br.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,locale='vi-VN',record_video_dir=vd,record_video_size={'width':390,'height':844})
    v=c.new_page();watch(v);v.goto(B+'index.html');v.wait_for_timeout(3000)
    for _ in range(6):v.mouse.wheel(0,350);v.wait_for_timeout(450)
    v.evaluate('scrollTo({top:0,behavior:"smooth"})');v.wait_for_timeout(700)
    v.click('#menuBtn');v.wait_for_timeout(700);v.click('#nav a[href="phong/index.html"]');v.wait_for_timeout(1000)
    v.click('.card h3 a >> nth=2');v.wait_for_timeout(1200)
    v.locator('#cal').scroll_into_view_if_needed();v.wait_for_timeout(500);v.click('#cn');v.wait_for_timeout(300)
    pair=v.evaluate("()=>{const b=[...document.querySelectorAll('#cal .d[data-d]')];for(let i=0;i<b.length-3;i++)if(!b[i].disabled&&!b[i+1].disabled&&!b[i+2].disabled&&!b[i+3].disabled)return [b[i].dataset.d,b[i+3].dataset.d]}")
    v.click(f'#cal [data-d="{pair[0]}"]');v.wait_for_timeout(500);v.click(f'#cal [data-d="{pair[1]}"]');v.wait_for_timeout(900)
    v.click('#bb-go');v.wait_for_timeout(1500);v.mouse.wheel(0,400);v.wait_for_timeout(800)
    c.close();br.close()
    w=glob.glob(vd+'/*.webm')[0];mp4=f'{OUT}/motion-demo.mp4'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',w,'-c:v','libx264','-pix_fmt','yuv420p','-crf','28','-preset','slow','-movflags','+faststart',mp4],check=True)
    shutil.rmtree(vd,ignore_errors=True)
    print('video',mp4,os.path.getsize(mp4)//1024,'KB')
print('console errors:',errs or 0)
