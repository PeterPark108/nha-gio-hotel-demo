/* Nhà Gió – hotel v2. Không gọi mạng; chỉ dùng localStorage. */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0'),iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const nights=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const money=n=>Math.round(n).toLocaleString('vi-VN')+'₫';
const fmt=s=>{const d=parse(s);return d?`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`:'—'};
const RM=matchMedia('(prefers-reduced-motion: reduce)');const still=()=>RM.matches;
// số tạm tính: đếm từ giá trị cũ sang mới
function animTotal(scope,prev){const dd=scope&&scope.querySelector('.tot dd');if(!dd)return;const to=+dd.textContent.replace(/\D/g,'');if(still()||!prev||prev===to){dd.classList.remove('bump');void dd.offsetWidth;dd.classList.add('bump');return}
 const t0=performance.now(),D=400;const step=t=>{const k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);dd.textContent=money(prev+(to-prev)*e);if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
const totOf=el=>{const d=el&&el.querySelector('.tot dd');return d?+d.textContent.replace(/\D/g,''):0};
const ROOMS=(typeof SEED_ROOMS!=='undefined'?SEED_ROOMS:[]);
const room=id=>ROOMS.find(r=>r.id===id);
const quote=(r,ci,co)=>{const n=nights(ci,co),sub=r.price*n,svc=Math.round(sub*0.05/1000)*1000;return{n,sub,clean:r.clean,svc,total:sub+r.clean+svc}};
function toast(msg){const b=$('#toasts');if(!b)return;const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;b.appendChild(t);setTimeout(()=>t.remove(),3000)}
// ngày kín minh họa (cố định theo phòng, tính từ hôm nay)
function booked(id){const s=new Set(),seed=[...id].reduce((a,c)=>a+c.charCodeAt(0),0);const t=today();
 [[6,2],[16,3],[33,2],[47,3]].forEach(([o,l],i)=>{const st=add(t,o+(seed+i)%4);for(let k=0;k<l;k++)s.add(iso(add(st,k)))});return s}
const isFree=(id,ci,co)=>{const b=booked(id);for(let d=parse(ci);d<parse(co);d=add(d,1))if(b.has(iso(d)))return false;return true};

// năm, menu
$$('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
const mb=$('#menuBtn'),nav=$('#nav');
if(mb&&nav){const set=o=>{nav.classList.toggle('open',o);mb.setAttribute('aria-expanded',o);mb.querySelector('.t').textContent=o?'Đóng':'Menu'};
 mb.addEventListener('click',()=>set(!nav.classList.contains('open')));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){set(false);mb.focus()}})}
// ảnh minh họa SVG
$$('.art[data-art]').forEach(el=>{if(typeof artSVG!=='function')return;el.insertAdjacentHTML('afterbegin',artSVG(el.dataset.art,+el.dataset.pal||0,el.dataset.label||'Ảnh minh họa'))});

// thanh đặt phòng nhanh
$$('form.bbar').forEach(f=>{const ci=f.elements.ci,co=f.elements.co,t=today();ci.min=iso(t);co.min=iso(add(t,1));
 if(!ci.value)ci.value=iso(add(t,7));if(!co.value)co.value=iso(add(t,9));
 ci.addEventListener('change',()=>{co.min=iso(add(parse(ci.value)||t,1));if(co.value<=ci.value)co.value=iso(add(parse(ci.value),2))});
 f.addEventListener('submit',e=>{const er=$('.err',f);let m='';if(!parse(ci.value)||parse(ci.value)<t)m='Chọn ngày nhận phòng từ hôm nay trở đi.';else if(!parse(co.value)||co.value<=ci.value)m='Ngày trả phòng phải sau ngày nhận phòng.';
  er.textContent=m;if(m){e.preventDefault();(m.includes('nhận')&&!m.includes('sau')?ci:co).focus()}})});

// danh sách phòng: lọc + sắp xếp
const list=$('#roomList');
if(list){const cards=$$('[data-room]',list),ft=$('#f-type'),fg=$('#f-guests'),fs=$('#f-sort'),cnt=$('#count'),empty=$('#empty');
 const q=new URLSearchParams(location.search);if(q.get('g'))fg.value=q.get('g');
 const run=()=>{const ty=ft.value,g=+fg.value||0;let vis=cards.filter(c=>(!ty||c.dataset.type===ty)&&+c.dataset.guests>=g);
  cards.forEach(c=>c.hidden=!vis.includes(c));
  const k=fs.value;vis.sort((a,b)=>k==='asc'?a.dataset.price-b.dataset.price:k==='desc'?b.dataset.price-a.dataset.price:k==='guests'?b.dataset.guests-a.dataset.guests:a.dataset.order-b.dataset.order);
  vis.forEach(c=>list.appendChild(c));cnt.textContent=`${vis.length} loại phòng`;empty.hidden=vis.length>0;list.hidden=!vis.length};
 [ft,fg,fs].forEach(x=>x.addEventListener('change',run));
 $('#resetF').addEventListener('click',()=>{ft.value='';fg.value='';fs.value='';run();ft.focus()});run()}

// lịch + khung đặt phòng ở trang chi tiết
const box=$('#bbox');
if(box){const r=room(box.dataset.room),bk=booked(r.id),t=today();let ci=null,co=null,view=new Date(t.getFullYear(),t.getMonth(),1);
 const cal=$('#cal'),g=$('#bb-g'),out=$('#bb-calc'),go=$('#bb-go'),msg=$('#bb-msg');
 const MN=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
 function draw(){const y=view.getFullYear(),m=view.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate();
  let h=`<div class="cal-h"><button type="button" id="cp" aria-label="Tháng trước" ${y===t.getFullYear()&&m===t.getMonth()?'disabled':''}>‹</button><b aria-live="polite">${MN[m]} ${y}</b><button type="button" id="cn" aria-label="Tháng sau">›</button></div>
  <div class="wd" aria-hidden="true">${['T2','T3','T4','T5','T6','T7','CN'].map(x=>`<span>${x}</span>`).join('')}</div><div class="days" role="group" aria-label="${MN[m]} ${y}">`;
  for(let i=0;i<first;i++)h+='<span></span>';
  for(let d=1;d<=dim;d++){const dt=new Date(y,m,d),s=iso(dt),past=dt<t,b=bk.has(s);const c=['d'];
   if(past)c.push('past');if(b&&!past)c.push('bk');if(+dt===+t)c.push('td');
   if(s===ci||s===co)c.push('sel');if(s===ci)c.push('st');if(co&&s===ci)c.push('has-en');if(s===co)c.push('en');if(ci&&co&&s>ci&&s<co)c.push('in');
   const lab=`${d} ${MN[m].toLowerCase()}${past?', đã qua':b?', đã kín':''}${s===ci?', ngày nhận phòng':s===co?', ngày trả phòng':''}`;
   h+=`<button type="button" class="${c.join(' ')}" data-d="${s}" aria-label="${lab}" ${past||b?'disabled':''} aria-pressed="${s===ci||s===co}"><span>${d}</span></button>`}
  cal.innerHTML=h+'</div>';
  $('#cp',cal).onclick=()=>{view=new Date(y,m-1,1);draw()};$('#cn',cal).onclick=()=>{view=new Date(y,m+1,1);draw()};
  $$('.d[data-d]:not(:disabled)',cal).forEach(b=>b.onclick=()=>pick(b.dataset.d))}
 function pick(s){if(!ci||co||s<=ci){ci=s;co=null}else{if(!isFree(r.id,ci,s)){msg.textContent='Khoảng ngày có đêm đã kín, vui lòng chọn lại.';ci=s;co=null}else{co=s;msg.textContent=''}}
  draw();const f=$(`.d[data-d="${s}"]`,cal);f&&f.focus();upd()}
 function upd(){$('#bb-ci').textContent=fmt(ci);$('#bb-co').textContent=fmt(co);
  const prev=totOf(out);if(ci&&co){const q=quote(r,ci,co);out.innerHTML=`<div><dt>${money(r.price)} × ${q.n} đêm</dt><dd>${money(q.sub)}</dd></div><div><dt>Phí dọn phòng (minh họa)</dt><dd>${money(q.clean)}</dd></div><div><dt>Phí dịch vụ 5% (minh họa)</dt><dd>${money(q.svc)}</dd></div><div class="tot"><dt>Tạm tính</dt><dd>${money(q.total)}</dd></div>`;
   go.href=`${go.dataset.base}?room=${r.id}&ci=${ci}&co=${co}&g=${g.value}`;go.removeAttribute('aria-disabled');go.textContent='Tiếp tục đặt phòng';animTotal(out,prev)}
  else{out.innerHTML=`<div><dt class="muted">${ci?'Chọn ngày trả phòng':'Chọn ngày nhận phòng trên lịch'}</dt><dd></dd></div>`;go.setAttribute('aria-disabled','true');go.textContent='Chọn ngày để xem tạm tính'}}
 go.addEventListener('click',e=>{if(go.getAttribute('aria-disabled')){e.preventDefault();msg.textContent='Vui lòng chọn ngày nhận và trả phòng.';cal.querySelector('.d:not(:disabled)')?.focus()}});
 g.addEventListener('change',upd);draw();upd()}

// trang đặt phòng
const bf=$('#bookForm');
if(bf){const q=new URLSearchParams(location.search),E=bf.elements,t=today(),sel=E.room;
 sel.innerHTML='<option value="">— Chọn loại phòng —</option>'+ROOMS.map(r=>`<option value="${r.id}">${r.name} · tối đa ${r.guests} khách · ${money(r.price)}/đêm (minh họa)</option>`).join('');
 sel.value=room(q.get('room'))?q.get('room'):'';E.ci.min=iso(t);E.ci.value=parse(q.get('ci'))?q.get('ci'):'';E.co.value=parse(q.get('co'))?q.get('co'):'';E.g.value=Math.max(1,Math.min(8,+q.get('g')||2));
 const sum=$('#sum');
 function est(){const r=room(sel.value),ok=r&&parse(E.ci.value)&&parse(E.co.value)&&E.co.value>E.ci.value;
  if(!ok){sum.innerHTML='<p class="muted">Chọn loại phòng và ngày để xem tạm tính.</p>';return}
  const prev=totOf(sum),x=quote(r,E.ci.value,E.co.value);sum.innerHTML=`<p><b>${r.name}</b><br><span class="muted sm">${fmt(E.ci.value)} → ${fmt(E.co.value)} · ${x.n} đêm · ${E.g.value} khách</span></p><dl class="calc"><div><dt>${money(r.price)} × ${x.n} đêm</dt><dd>${money(x.sub)}</dd></div><div><dt>Phí dọn phòng</dt><dd>${money(x.clean)}</dd></div><div><dt>Phí dịch vụ 5%</dt><dd>${money(x.svc)}</dd></div><div class="tot"><dt>Tạm tính</dt><dd>${money(x.total)}</dd></div></dl>`;if(prev!==x.total)animTotal(sum,prev)}
 const setErr=(el,m)=>{const e=$('#'+el.id+'-err');el.setAttribute('aria-invalid',!!m);if(e)e.textContent=m;return!m};
 function check(){const r=room(sel.value),ci=parse(E.ci.value),co=parse(E.co.value);let ok=true,first=null;const f=(el,m)=>{if(!setErr(el,m)){ok=false;first=first||el}};
  f(sel,r?'':'Vui lòng chọn loại phòng.');
  f(E.ci,!ci?'Chọn ngày nhận phòng.':ci<t?'Ngày nhận phòng không được ở quá khứ.':'');
  f(E.co,!co?'Chọn ngày trả phòng.':ci&&co<=ci?'Ngày trả phòng phải sau ngày nhận phòng.':ci&&nights(E.ci.value,E.co.value)>30?'Tối đa 30 đêm mỗi lần đặt.':r&&ci&&!isFree(r.id,E.ci.value,E.co.value)?'Khoảng ngày này có đêm đã kín (minh họa). Hãy chọn ngày khác.':'');
  f(E.g,!(+E.g.value>=1)?'Số khách tối thiểu là 1.':r&&+E.g.value>r.guests?`Phòng này tối đa ${r.guests} khách.`:'');
  f(E.name,E.name.value.trim().length<2?'Nhập họ tên (ít nhất 2 ký tự).':'');
  f(E.phone,!/^0\d{9}$/.test(E.phone.value.replace(/[\s.]/g,''))?'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.':'');
  f(E.email,E.email.value&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(E.email.value)?'Email chưa đúng định dạng.':'');
  f(E.agree,E.agree.checked?'':'Vui lòng xác nhận đã đọc chính sách.');return{ok,first}}
 ['change','input'].forEach(ev=>bf.addEventListener(ev,est));
 E.ci.addEventListener('change',()=>{E.co.min=E.ci.value?iso(add(parse(E.ci.value),1)):''});
 bf.addEventListener('submit',e=>{e.preventDefault();const{ok,first}=check();const s=$('#formErr');
  if(!ok){s.textContent='Vui lòng kiểm tra các ô được đánh dấu.';first.focus();return}s.textContent='';
  const r=room(sel.value),x=quote(r,E.ci.value,E.co.value),code='DEMO-'+Math.random().toString(36).slice(2,8).toUpperCase();
  const rec={code,room:r.id,roomName:r.name,ci:E.ci.value,co:E.co.value,g:+E.g.value,name:E.name.value.trim(),phone:E.phone.value,email:E.email.value,note:E.note.value,total:x.total,nights:x.n,created:new Date().toISOString(),demo:true};
  let all=[];try{all=JSON.parse(localStorage.getItem('nhagio_hotel_bookings'))||[]}catch(_){}all.push(rec);try{localStorage.setItem('nhagio_hotel_bookings',JSON.stringify(all))}catch(_){}
  showOk(rec)});
 function showOk(b){$('#bkWrap').hidden=true;const o=$('#okBox');o.hidden=false;
  $('#okCode').textContent=b.code;$('#okInfo').innerHTML=`<div><dt>Phòng</dt><dd>${b.roomName}</dd></div><div><dt>Ngày</dt><dd>${fmt(b.ci)} → ${fmt(b.co)} (${b.nights} đêm)</dd></div><div><dt>Số khách</dt><dd>${b.g}</dd></div><div><dt>Khách</dt><dd>${b.name.replace(/[<>&]/g,'')}</dd></div><div class="tot"><dt>Tạm tính (minh họa)</dt><dd>${money(b.total)}</dd></div>`;
  $('#okTitle').focus();scrollTo(0,0)}
 $('#again')?.addEventListener('click',()=>{$('#okBox').hidden=true;$('#bkWrap').hidden=false;bf.reset();est();E.name.focus()});
 est()}

// thư viện ảnh: lọc + lightbox
const lb=$('#lb');
if(lb){const items=()=>$$('[data-lb]').filter(b=>!b.closest('[hidden]'));let i=0,opener=null;
 const show=(n,dir)=>{const it=items();i=(n+it.length)%it.length;const b=it[i];const a=$('.art',lb);a.innerHTML='';if(b.dataset.src){const im=new Image();im.src=b.dataset.src;im.alt=b.dataset.alt||'';a.classList.add('photo');if(dir&&!still())im.className=dir>0?'sl-n':'sl-p';a.appendChild(im)}else{a.classList.remove('photo');a.insertAdjacentHTML('afterbegin',artSVG(b.dataset.art,+b.dataset.pal||0,b.dataset.cap))}$('#lbCap').textContent=b.dataset.cap;$('#lbNum').textContent=`${i+1} / ${it.length}`};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-lb]');if(!b)return;opener=b;show(items().indexOf(b));lb.showModal();$('.x',lb).focus()});
 const shut=()=>{if(!lb.open||lb.classList.contains('closing'))return;if(still()){lb.close();return}lb.classList.add('closing');setTimeout(()=>{lb.classList.remove('closing');lb.close()},150)};
 $('.x',lb).onclick=shut;$('.pv',lb).onclick=()=>show(i-1,-1);$('.nx',lb).onclick=()=>show(i+1,1);
 lb.addEventListener('cancel',e=>{e.preventDefault();shut()});
 lb.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(i-1,-1);if(e.key==='ArrowRight')show(i+1,1)});
 lb.addEventListener('close',()=>opener&&opener.focus());
 lb.addEventListener('click',e=>{if(e.target===lb)shut()})}
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.filter;$$('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x===b));
 $$('[data-cat]').forEach(li=>li.hidden=v!=='all'&&li.dataset.cat!==v)}));

// FAQ accordion
$$('.acc button[aria-controls]').forEach(b=>b.addEventListener('click',()=>{const o=b.getAttribute('aria-expanded')!=='true',pn=$('#'+b.getAttribute('aria-controls'));b.setAttribute('aria-expanded',o);
 if(pn._a)pn._a.cancel();if(still()||!pn.animate){pn.hidden=!o;return}
 if(o){pn.hidden=false;const h=pn.scrollHeight;pn._a=pn.animate([{height:'0px',opacity:0},{height:h+'px',opacity:1}],{duration:250,easing:'cubic-bezier(.22,1,.36,1)'});pn._a.onfinish=()=>pn._a=null}
 else{const h=pn.scrollHeight;pn._a=pn.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0}],{duration:200,easing:'cubic-bezier(.55,0,1,.45)'});pn._a.onfinish=()=>{pn.hidden=true;pn._a=null}}}));

// form liên hệ – không gửi đi đâu
const cf=$('#contactForm');
if(cf){cf.addEventListener('submit',e=>{e.preventDefault();const E=cf.elements;let first=null;
 [[E.cname,E.cname.value.trim().length<2?'Nhập họ tên.':''],[E.cemail,!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(E.cemail.value)?'Nhập email hợp lệ.':''],[E.cmsg,E.cmsg.value.trim().length<10?'Nội dung tối thiểu 10 ký tự.':'']].forEach(([el,m])=>{el.setAttribute('aria-invalid',!!m);$('#'+el.id+'-err').textContent=m;if(m&&!first)first=el});
 if(first){first.focus();return}$('#cfOk').hidden=false;$('#cfOk').focus();cf.reset();toast('Đã ghi nhận (demo) – không có tin nào được gửi đi')})}
// header đổ bóng khi cuộn (listener passive)
const top=$('.top');if(top){let tk=false;const f=()=>{top.classList.toggle('scrolled',scrollY>8);tk=false};addEventListener('scroll',()=>{if(!tk){tk=true;requestAnimationFrame(f)}},{passive:true});f()}
// scroll reveal: chỉ transform/opacity; phần tử đang trong màn hình lúc tải thì hiện ngay
if('IntersectionObserver' in window&&!still()){
 const els=$$('.sec-h,.grid>li,.masonry>li,.split>*,.page-h .wrap>h1,.page-h .wrap>p,.dt-main>section,.panel,.prose>.acc,.toc,.empty,.note');
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
 const vh=innerHeight;
 els.forEach(el=>{if(el.closest('.hero,dialog,#okBox'))return;const r=el.getBoundingClientRect();if(r.top<vh&&r.bottom>0)return;
  const p=el.parentElement;if(p&&(p.matches('.grid,.masonry,.split'))){const idx=[...p.children].indexOf(el);el.style.setProperty('--rv-d',Math.min(idx%4,3)*70+'ms')}
  el.classList.add('rv-up');io.observe(el)})}
})();
