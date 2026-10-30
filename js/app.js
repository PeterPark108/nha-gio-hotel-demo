// Phía khách: router, trang chủ, danh sách, chi tiết, đặt phòng
const $=(s,el=document)=>el.querySelector(s), $$=(s,el=document)=>[...el.querySelectorAll(s)];
function toast(msg,type='ok'){const box=$('#toasts');while(box.children.length>=3)box.firstChild.remove();const t=document.createElement('div');t.className='toast '+type;t.setAttribute('role','status');t.textContent=msg;box.appendChild(t);setTimeout(()=>t.remove(),3000)}
function parseHash(){const h=location.hash.slice(1)||'/';const[path,qs]=h.split('?');return{parts:path.split('/').filter(Boolean),q:Object.fromEntries(new URLSearchParams(qs||''))}}
const go=(path,q)=>{const s=q?new URLSearchParams(Object.entries(q).filter(([k,v])=>v!==''&&v!=null)).toString():'';location.hash='#'+path+(s?'?'+s:'')};
const stars=a=>`<span class="star">★</span> ${a.n?a.avg.toFixed(1).replace('.',','):'Mới'}${a.n?` <span class="muted">(${a.n})</span>`:''}`;
const catName=id=>(CATS.find(c=>c.id===id)||{}).name||id;

function card(r,q={}){const a=DB.rating(r.id),fav=Fav.has(r.id);const n=q.ci&&q.co?nightsBetween(q.ci,q.co):0;
 return `<article class="card"><a href="#/phong/${r.id}${q.ci?`?ci=${q.ci}&co=${q.co}&g=${q.g||''}`:''}" class="card-link" aria-label="${esc(r.name)}">
 <div class="ph">${artSVG(r.scene,r.pal,r.name)}${r.status!=='Hoạt động'?'<span class="badge gray">Tạm ngưng</span>':r.price>=2000000?'<span class="badge">Được yêu thích</span>':''}</div>
 <div class="cb"><div class="row"><h3 title="${esc(r.name)}">${esc(r.name)}</h3><span class="rt">${stars(a)}</span></div>
 <p class="muted meta">${esc(r.type)} · ${r.guests} khách · ${esc(r.beds)}</p>
 <p class="price"><b>${money(r.price)}</b> <span class="muted per">/ đêm</span>${n>0?` <span class="muted">· ${money(DB.quote(r,q.ci,q.co).total)} cho ${n} đêm</span>`:''}</p></div></a>
 <button class="fav ${fav?'on':''}" data-fav="${r.id}" aria-label="${fav?'Bỏ yêu thích':'Yêu thích'}" title="${fav?'Bỏ yêu thích':'Lưu vào yêu thích'}">${fav?'♥':'♡'}</button></article>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-fav]');if(!b)return;e.preventDefault();const on=Fav.toggle(b.dataset.fav);b.classList.toggle('on',on);b.textContent=on?'♥':'♡';b.setAttribute('aria-label',on?'Bỏ yêu thích':'Yêu thích');toast(on?'Đã lưu vào yêu thích':'Đã bỏ khỏi yêu thích');updFavCount();if(parseHash().q.fav)render()});
function updFavCount(){const n=Fav.get().length;$('#favCount').textContent=n||'';$('#favCount').hidden=!n}

function searchBox(q={}){const t=iso(today());return `<form class="search" id="searchForm">
 <label><span>Nhận phòng</span><input type="date" name="ci" min="${t}" value="${q.ci||''}"></label>
 <label><span>Trả phòng</span><input type="date" name="co" min="${t}" value="${q.co||''}"></label>
 <label><span>Số khách</span><select name="g">${[1,2,3,4,5,6,7,8].map(n=>`<option ${+q.g===n?'selected':''} value="${n}">${n} khách</option>`).join('')}</select></label>
 <button class="btn primary">🔍 Tìm phòng</button><p class="err" id="searchErr"></p></form>`}
function bindSearch(){const f=$('#searchForm');if(!f)return;f.onsubmit=e=>{e.preventDefault();const q=Object.fromEntries(new FormData(f));
 if((q.ci&&!q.co)||(!q.ci&&q.co)){$('#searchErr').textContent='Vui lòng chọn đủ ngày nhận và trả phòng (hoặc để trống cả hai).';return}
 if(q.ci&&q.co&&q.co<=q.ci){$('#searchErr').textContent='Ngày trả phòng phải sau ngày nhận phòng.';return}
 go('/phong',{...parseHash().q,...q})}}

function pageHome(){const rooms=DB.data.rooms.filter(r=>r.status==='Hoạt động');const all=DB.data.reviews;const avg=(all.reduce((a,b)=>a+b.stars,0)/all.length).toFixed(1).replace('.',',');
 const top=[...rooms].sort((a,b)=>DB.rating(b.id).avg-DB.rating(a.id).avg).slice(0,6);
 return `<section class="hero"><div class="hero-art">${artSVG('sea',0,'Biển Quy Nhơn – tranh minh họa')}</div><div class="hero-in wrap">
 <p class="eyebrow">Quy Nhơn · Bình Định</p><h1>Nhà Gió Homestay<br><span>ngủ giữa gió biển và đồi thông</span></h1>
 <p class="lead">7 phòng & căn nhỏ xinh cách bãi biển vài bước chân. Đặt nhanh, xác nhận trong ngày.</p>${searchBox()}</div></section>
 <section class="wrap"><h2>Khám phá nhanh</h2><div class="cats">${CATS.map(c=>`<a class="cat" href="#/phong?cat=${c.id}"><span>${c.ico}</span>${c.name}<small>${DB.data.rooms.filter(r=>r.cats.includes(c.id)).length} chỗ ở</small></a>`).join('')}</div></section>
 <section class="wrap"><div class="sec-h"><h2>Phòng nổi bật</h2><a href="#/phong" class="link">Xem tất cả →</a></div><div class="grid">${top.map(r=>card(r)).join('')}</div></section>
 <section class="wrap about"><div class="ab"><h2>Vị trí</h2><p>Nằm trên cung đường ven biển Quy Nhơn, gần Ghềnh Ráng – Tiên Sa, Eo Gió và chợ hải sản. 15 phút tới trung tâm thành phố.</p>${mapSVG()}</div>
 <div class="ab"><h2>Tiện ích chung</h2><ul class="amen">${['wifi','breakfast','parking','bbq','washer','pool'].map(k=>`<li><span>${AMEN[k][0]}</span>${AMEN[k][1]}</li>`).join('')}<li><span>🛵</span>Cho thuê xe máy</li><li><span>🧭</span>Tư vấn lịch trình</li></ul></div>
 <div class="ab"><h2>Khách nói gì</h2><p class="big">★ ${avg}<small> / 5 từ ${all.length} đánh giá mẫu</small></p>${all.slice(0,3).map(rv).join('')}</div></section>`}
function rv(r){return `<div class="rv"><div class="av">${esc(r.name[0])}</div><div><b>${esc(r.name)}</b> <span class="star">${'★'.repeat(r.stars)}</span><div class="muted sm">${fmtD(r.date)}</div><p>${esc(r.text)}</p></div></div>`}
function mapSVG(){return `<svg class="map" viewBox="0 0 400 240" role="img" aria-label="Bản đồ minh họa vị trí"><rect width="400" height="240" fill="#e9f3ea"/><path d="M260 0 Q230 60 270 110 T250 240 L400 240 L400 0z" fill="#9fd3e6"/><g stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"><path d="M0 70 Q120 90 240 60"/><path d="M60 240 Q120 150 245 130"/><path d="M150 0 L180 240"/></g><g fill="#c9dfc0"><circle cx="70" cy="160" r="30"/><circle cx="40" cy="30" r="20"/></g>
 ${[[70,60,'Chợ Quy Nhơn'],[300,45,'Ghềnh Ráng'],[300,200,'Eo Gió'],[70,165,'Đồi thông']].map(([x,y,t])=>`<circle cx="${x}" cy="${y}" r="5" fill="#3d405b"/><text x="${x+9}" y="${y+4}" font-size="12" fill="#3d405b">${t}</text>`).join('')}
 <g transform="translate(232 128)"><path d="M0 0 C-14 -18 -14 -36 0 -36 C14 -36 14 -18 0 0z" fill="#e76f51"/><circle cy="-24" r="5" fill="#fff"/><rect x="10" y="-36" width="74" height="20" rx="10" fill="#fff"/><text x="47" y="-22" font-size="12" text-anchor="middle" font-weight="700" fill="#e76f51">Nhà Gió</text></g><text x="8" y="232" font-size="10" fill="#666">Bản đồ minh họa – không theo tỉ lệ</text></svg>`}

function pageList(q){const cats=q.cat?q.cat.split(','):[],amen=q.amen?q.amen.split(','):[];
 let rs=DB.data.rooms.filter(r=>r.status==='Hoạt động'||q.all);
 if(q.fav)rs=rs.filter(r=>Fav.has(r.id));
 if(q.g)rs=rs.filter(r=>r.guests>=+q.g);
 if(q.type)rs=rs.filter(r=>r.type===q.type);
 if(q.price){const[a,b]=q.price.split('-').map(Number);rs=rs.filter(r=>r.price>=a&&(!b||r.price<=b))}
 cats.forEach(c=>rs=rs.filter(r=>r.cats.includes(c)));amen.forEach(a=>rs=rs.filter(r=>r.amen.includes(a)));
 if(q.ci&&q.co)rs=rs.filter(r=>DB.free(r.id,q.ci,q.co));
 const s=q.sort||'goi-y';rs.sort(s==='gia-tang'?(a,b)=>a.price-b.price:s==='gia-giam'?(a,b)=>b.price-a.price:s==='danh-gia'?(a,b)=>DB.rating(b.id).avg-DB.rating(a.id).avg:s==='suc-chua'?(a,b)=>b.guests-a.guests:()=>0);
 const active=['cat','amen','type','price','g','ci','fav'].filter(k=>q[k]).length;
 const chk=(name,val,list,label)=>`<label class="chk"><input type="checkbox" data-multi="${name}" value="${val}" ${list.includes(val)?'checked':''}>${label}</label>`;
 return `<div class="wrap list-page"><div class="list-top">${searchBox(q)}</div>
 <div class="list-head"><h1>${q.fav?'♥ Phòng yêu thích':'Tất cả phòng'} <small class="muted">${rs.length} kết quả${q.ci&&q.co?` · ${fmtD(q.ci)} → ${fmtD(q.co)}`:''}</small></h1>
 <div class="lh-r"><button class="btn ghost only-m" id="toggleF">⚙️ Bộ lọc${active?` (${active})`:''}</button><label class="sort"><span>Sắp xếp</span> <select id="sort">${[['goi-y','Gợi ý'],['gia-tang','Giá thấp → cao'],['gia-giam','Giá cao → thấp'],['danh-gia','Đánh giá cao'],['suc-chua','Sức chứa lớn']].map(([v,t])=>`<option value="${v}" ${s===v?'selected':''}>${t}</option>`).join('')}</select></label></div></div>
 <div class="list-body"><aside class="filters" id="filters"><h3>Bộ lọc</h3>
 <div class="fg"><b>Khoảng giá / đêm</b><select data-one="price"><option value="">Mọi mức giá</option>${[['0-800000','Dưới 800.000₫'],['800000-1500000','800.000₫ – 1.500.000₫'],['1500000-','Trên 1.500.000₫']].map(([v,t])=>`<option value="${v}" ${q.price===v?'selected':''}>${t}</option>`).join('')}</select></div>
 <div class="fg"><b>Số khách tối thiểu</b><select data-one="g"><option value="">Bất kỳ</option>${[1,2,3,4,6,8].map(n=>`<option ${+q.g===n?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="fg"><b>Loại phòng</b><select data-one="type"><option value="">Tất cả</option>${TYPES.map(t=>`<option ${q.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
 <div class="fg"><b>Danh mục</b>${CATS.map(c=>chk('cat',c.id,cats,c.ico+' '+c.name)).join('')}</div>
 <div class="fg"><b>Tiện nghi</b>${['wifi','ac','kitchen','pool','view','bbq','washer','bath','pet'].map(k=>chk('amen',k,amen,AMEN[k][0]+' '+AMEN[k][1])).join('')}</div>
 <label class="chk"><input type="checkbox" data-one-chk="fav" ${q.fav?'checked':''}> ♥ Chỉ phòng yêu thích</label>
 <button class="btn ghost full" id="clearF">Xóa tất cả bộ lọc</button></aside>
 <section>${rs.length?`<div class="grid">${rs.map(r=>card(r,q)).join('')}</div>`:`<div class="empty">${artSVG('hill',3,'Không có kết quả')}<h2>Chưa tìm thấy phòng phù hợp</h2><p>Thử một trong các cách sau:</p><ul><li>Bỏ bớt tiện nghi hoặc danh mục đã chọn</li><li>Đổi sang ngày khác – ${q.ci?'các phòng có thể đã kín lịch trong khoảng này':'hoặc giảm số khách'}</li>${q.fav?'<li>Bấm ♡ trên thẻ phòng để thêm vào yêu thích</li>':''}</ul><button class="btn primary" id="clearF2">Xóa bộ lọc & xem tất cả</button></div>`}</section></div></div>`}
function bindList(){const q=parseHash().q;bindSearch();
 $$('[data-one]').forEach(el=>el.onchange=()=>go('/phong',{...q,[el.dataset.one]:el.value}));
 $$('[data-one-chk]').forEach(el=>el.onchange=()=>go('/phong',{...q,[el.dataset.oneChk]:el.checked?'1':''}));
 $$('[data-multi]').forEach(el=>el.onchange=()=>{const k=el.dataset.multi;go('/phong',{...q,[k]:$$(`[data-multi="${k}"]:checked`).map(x=>x.value).join(',')})});
 $('#sort').onchange=e=>go('/phong',{...q,sort:e.target.value});
 const clr=()=>go('/phong',{});['#clearF','#clearF2'].forEach(s=>{const b=$(s);if(b)b.onclick=clr});
 $('#toggleF').onclick=()=>$('#filters').classList.toggle('open')}

// ---- Lịch tự vẽ ----
function Calendar(el,room,state,onChange){const blocked=DB.blocked(room.id),t=today();let m=state.ci?parseD(state.ci):new Date(t);m=new Date(m.getFullYear(),m.getMonth(),1);
 const WD=['T2','T3','T4','T5','T6','T7','CN'];
 function okEnd(d){if(!state.ci||state.co)return false;const s=parseD(state.ci);if(d<=s)return false;for(let x=s;x<d;x=addDays(x,1))if(blocked.has(iso(x)))return false;return true}
 function month(mm){const first=new Date(mm.getFullYear(),mm.getMonth(),1),off=(first.getDay()+6)%7,dim=new Date(mm.getFullYear(),mm.getMonth()+1,0).getDate();let h='';
  for(let i=0;i<off;i++)h+='<span></span>';
  for(let i=1;i<=dim;i++){const d=new Date(mm.getFullYear(),mm.getMonth(),i),s=iso(d),past=d<t,bl=blocked.has(s);
   const picking=state.ci&&!state.co, end=picking&&okEnd(d);
   const dis=past||(picking?!(end||!bl):bl);
   const rng=state.ci&&state.co;const cls=[past?'past':bl?'bk':'avail',s===state.ci?'sel st':'',s===state.co?'sel en':'',rng?'rg':'',rng&&s>state.ci&&s<state.co?'in':'',s===iso(t)?'td':''].join(' ');
   h+=`<button type="button" class="d ${cls}" data-d="${s}" ${dis?'disabled':''} aria-label="${fmtD(s)}${past?' – đã qua':bl?' – đã kín':''}${s===state.ci?' – nhận phòng':s===state.co?' – trả phòng':''}"><span>${i}</span></button>`}
  return `<div class="mo"><div class="mt">Tháng ${mm.getMonth()+1}/${mm.getFullYear()}</div><div class="wd">${WD.map(w=>`<span>${w}</span>`).join('')}</div><div class="days">${h}</div></div>`}
 function draw(){const canPrev=m>new Date(t.getFullYear(),t.getMonth(),1);
  el.innerHTML=`<div class="cal-nav"><button type="button" class="ic" data-nav="-1" ${canPrev?'':'disabled'} aria-label="Tháng trước">‹</button><span class="sm muted">${!state.ci||state.co?'Chọn ngày nhận phòng':'Chọn ngày trả phòng'}</span><button type="button" class="ic" data-nav="1" aria-label="Tháng sau">›</button></div><div class="mos">${month(m)}</div>
  <div class="legend sm"><span><i class="lg av"></i>Còn trống</span><span><i class="lg td"></i>Hôm nay</span><span><i class="lg sel"></i>Đã chọn</span><span><i class="lg in"></i>Trong khoảng</span><span><i class="lg past"></i>Đã qua</span><span><i class="lg bk"></i>Đã kín</span>${state.ci?'<button type="button" class="link" data-clear>Xóa ngày</button>':''}</div>`;
  $$('[data-nav]',el).forEach(b=>b.onclick=()=>{m=new Date(m.getFullYear(),m.getMonth()+ +b.dataset.nav,1);draw()});
  const c=$('[data-clear]',el);if(c)c.onclick=()=>{state.ci=state.co='';draw();onChange()};
  $$('[data-d]',el).forEach(b=>b.onclick=()=>{const s=b.dataset.d;if(state.ci&&!state.co&&okEnd(parseD(s)))state.co=s;else{state.ci=s;state.co=''}draw();onChange()})}
 draw();return{draw}}

function pageDetail(id,q){const r=DB.room(id);if(!r)return notFound();const a=DB.rating(r.id),g=gallery(r),revs=DB.data.reviews.filter(x=>x.room===r.id);
 return `<div class="wrap detail"><a href="#/phong" class="link sm">← Danh sách phòng</a><div class="dt-h"><div><h1>${esc(r.name)}</h1><p class="muted">${stars(a)} · ${esc(r.type)} · Quy Nhơn, Bình Định</p></div><button class="btn ghost fav-big" data-fav="${r.id}">${Fav.has(r.id)?'♥':'♡'}</button></div>
 <div class="carousel" id="car"><div class="track">${g.map(([k,l],i)=>`<figure>${artSVG(k,r.pal,l)}<figcaption>${l} · ${i+1}/${g.length}</figcaption></figure>`).join('')}</div><button class="cv prev" aria-label="Ảnh trước">‹</button><button class="cv next" aria-label="Ảnh sau">›</button></div>
 <div class="thumbs">${g.map(([k,l],i)=>`<button data-i="${i}" class="${i?'':'on'}" aria-label="${l}">${artSVG(k,r.pal,l)}</button>`).join('')}</div>
 <div class="dt-body"><div class="dt-main">
 <div class="facts"><span>👥 Tối đa ${r.guests} khách</span><span>🛏️ ${esc(r.beds)}</span><span>📐 ${r.size} m²</span></div>
 <section><h2>Giới thiệu</h2><p>${esc(r.desc)}</p></section>
 <section><h2>Tiện nghi</h2><ul class="amen">${r.amen.map(k=>`<li><span>${AMEN[k][0]}</span>${AMEN[k][1]}</li>`).join('')}</ul></section>
 <section><h2>Nội quy</h2><ul class="rules">${RULES.map(x=>`<li>${x}</li>`).join('')}<li>Hủy miễn phí trước 3 ngày (chính sách mẫu)</li></ul></section>
 <section><h2>Đánh giá <span class="muted">${stars(a)}</span></h2><div class="revs">${revs.map(rv).join('')||'<p class="muted">Chưa có đánh giá.</p>'}</div></section>
 <section><h2>Vị trí</h2>${mapSVG()}</section></div>
 <aside class="book-box" id="bookBox"><p class="price bb-price"><b>${money(r.price)}</b> <span class="muted">/ đêm</span></p>${r.status!=='Hoạt động'?'<p class="err">Phòng đang tạm ngưng nhận khách.</p>':''}
 <div class="picked"><div><small>NHẬN PHÒNG</small><b id="pCi">—</b></div><div><small>TRẢ PHÒNG</small><b id="pCo">—</b></div></div>
 <div id="cal" class="cal"></div>
 <div class="guests"><span>Số khách <small class="muted">(tối đa ${r.guests})</small></span><div class="step"><button type="button" class="ic" id="gM" aria-label="Giảm">−</button><b id="gN"></b><button type="button" class="ic" id="gP" aria-label="Tăng">+</button></div></div>
 <p class="err" id="bErr" role="alert"></p><button class="btn primary full btn-lg" id="bGo">Đặt phòng</button><p class="sm muted center">Bản demo – chưa bị trừ tiền</p><div id="calc"></div></aside></div></div>
 <div class="m-bar only-m"><div><b>${money(r.price)}</b> / đêm<div class="sm muted">${stars(a)}</div></div><a class="btn primary" href="#bookBox" onclick="event.preventDefault();document.getElementById('bookBox').scrollIntoView({behavior:'smooth'})">Chọn ngày</a></div>`}
function bindDetail(id,q){const r=DB.room(id);if(!r)return;const st={ci:q.ci||'',co:q.co||'',g:Math.min(+q.g||2,r.guests)};
 if(st.ci&&st.co&&(!DB.free(r.id,st.ci,st.co)||st.ci<iso(today())))st.ci=st.co='';
 const upd=()=>{$('#pCi').textContent=st.ci?fmtD(st.ci):'—';$('#pCo').textContent=st.co?fmtD(st.co):'—';$('#gN').textContent=st.g;$('#bErr').textContent='';
  if(st.ci&&st.co){const p=DB.quote(r,st.ci,st.co);$('#calc').innerHTML=`<div class="calc"><p><span>${money(r.price)} × ${p.n} đêm</span><span>${money(p.sub)}</span></p><p><span class="tip" title="Phí cố định mỗi lần lưu trú">Phí dọn dẹp</span><span>${money(p.clean)}</span></p><p><span class="tip" title="5% tiền phòng, làm tròn nghìn">Phí dịch vụ (5%)</span><span>${money(p.svc)}</span></p><p class="tot"><span>Tổng cộng</span><span>${money(p.total)}</span></p></div>`}else $('#calc').innerHTML=''};
 Calendar($('#cal'),r,st,upd);upd();
 $('#gM').onclick=()=>{if(st.g>1)st.g--;upd()};$('#gP').onclick=()=>{if(st.g<r.guests)st.g++;else{$('#bErr').textContent=`Phòng này tối đa ${r.guests} khách.`;return}upd()};
 $('#bGo').onclick=()=>{const e=[];if(r.status!=='Hoạt động')e.push('Phòng đang tạm ngưng.');if(!st.ci)e.push('Vui lòng chọn ngày nhận phòng.');else if(!st.co)e.push('Vui lòng chọn ngày trả phòng.');
  else if(nightsBetween(st.ci,st.co)>30)e.push('Tối đa 30 đêm cho mỗi lần đặt.');else if(!DB.free(r.id,st.ci,st.co))e.push('Khoảng ngày đã có người đặt, vui lòng chọn lại.');
  if(e.length){$('#bErr').textContent=e.join(' ');return}go('/dat-phong/'+r.id,{ci:st.ci,co:st.co,g:st.g})};
 const tr=$('#car .track'),N=$$('figure',tr).length;let i=0;const show=n=>{i=(n+N)%N;tr.scrollTo({left:tr.clientWidth*i,behavior:'smooth'});$$('.thumbs button').forEach((b,k)=>b.classList.toggle('on',k===i))};
 $('#car .prev').onclick=()=>show(i-1);$('#car .next').onclick=()=>show(i+1);$$('.thumbs button').forEach(b=>b.onclick=()=>show(+b.dataset.i));
 tr.addEventListener('scroll',()=>{const k=Math.round(tr.scrollLeft/tr.clientWidth);if(k!==i){i=k;$$('.thumbs button').forEach((b,j)=>b.classList.toggle('on',j===i))}},{passive:true})}

function pageBook(id,q){const r=DB.room(id);if(!r)return notFound();
 const bad=!q.ci||!q.co||q.co<=q.ci||q.ci<iso(today())||!DB.free(r.id,q.ci,q.co)||!(+q.g>=1&&+q.g<=r.guests);
 if(bad)return `<div class="wrap narrow"><div class="empty"><h2>Thông tin đặt phòng chưa hợp lệ</h2><p>Ngày đã kín, đã qua hoặc số khách vượt giới hạn.</p><a class="btn primary" href="#/phong/${r.id}">Chọn lại ngày</a></div></div>`;
 const p=DB.quote(r,q.ci,q.co);
 return `<div class="wrap narrow book"><a href="#/phong/${r.id}?ci=${q.ci}&co=${q.co}&g=${q.g}" class="link sm">← Quay lại</a><h1>Xác nhận & đặt phòng</h1>
 <div class="demo-note">🧪 Đây là bản demo: không có thanh toán thật, thông tin chỉ lưu trong trình duyệt của bạn.</div>
 <div class="book-grid"><form id="bookForm" novalidate><h2>Thông tin khách</h2>
 <label>Họ và tên *<input name="name" autocomplete="off" placeholder="VD: Nguyễn Văn A"><small class="err"></small></label>
 <label>Số điện thoại *<input name="phone" inputmode="tel" placeholder="VD: 0901234567"><small class="err"></small></label>
 <label>Email *<input name="email" type="email" placeholder="VD: ban@vidu.test"><small class="err"></small></label>
 <label>Ghi chú cho chủ nhà<textarea name="note" rows="3" placeholder="Giờ đến dự kiến, yêu cầu đặc biệt..."></textarea></label>
 <label class="chk"><input type="checkbox" name="agree"> Tôi đồng ý với nội quy & chính sách hủy (mẫu)<small class="err"></small></label>
 <h2>Thanh toán</h2><div class="pay"><label class="chk"><input type="radio" name="pay" checked> Thanh toán khi nhận phòng (demo)</label><p class="sm muted">Không thu thẻ, không chuyển khoản thật.</p></div>
 <button class="btn primary full" id="confirm">Xác nhận đặt phòng</button></form>
 <aside class="sum"><div class="sum-ph">${artSVG(r.scene,r.pal,r.name)}</div><h3>${esc(r.name)}</h3><p class="muted sm">${esc(r.type)} · ${stars(DB.rating(r.id))}</p>
 <div class="calc"><p><span>Nhận phòng</span><b>${fmtD(q.ci)}</b></p><p><span>Trả phòng</span><b>${fmtD(q.co)}</b></p><p><span>Số khách</span><b>${q.g}</b></p><hr>
 <p><span>${money(r.price)} × ${p.n} đêm</span><span>${money(p.sub)}</span></p><p><span class="tip" title="Phí cố định mỗi lần lưu trú">Phí dọn dẹp</span><span>${money(p.clean)}</span></p><p><span class="tip" title="5% tiền phòng, làm tròn nghìn">Phí dịch vụ (5%)</span><span>${money(p.svc)}</span></p><p class="tot"><span>Tổng cộng</span><span>${money(p.total)}</span></p></div></aside></div></div>`}
function bindBook(id,q){const f=$('#bookForm');if(!f)return;const r=DB.room(id);
 f.addEventListener('input',e=>{const l=e.target.closest('label');if(l){const s=l.querySelector('.err');if(s)s.textContent='';e.target.classList.remove('bad')}});
 f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));let ok=true;
  const set=(n,m)=>{const el=f.elements[n];const s=el.closest('label').querySelector('.err');s.textContent=m||'';el.classList.toggle('bad',!!m);if(m)ok=false};
  set('name',(d.name||'').trim().length<2?'Vui lòng nhập họ tên (ít nhất 2 ký tự).':'');
  set('phone',/^0\d{9}$/.test((d.phone||'').replace(/\s/g,''))?'':'Số điện thoại gồm 10 số, bắt đầu bằng 0.');
  set('email',/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email||'')?'':'Email chưa đúng định dạng.');
  set('agree',d.agree?'':'Vui lòng đồng ý trước khi đặt.');
  if(!ok){const b=$('.bad',f);if(b)b.focus();return}
  if(!DB.free(r.id,q.ci,q.co)){toast('Rất tiếc, ngày này vừa có người đặt.','bad');return}
  const p=DB.quote(r,q.ci,q.co);let code;do{code='NG'+Math.random().toString(36).slice(2,8).toUpperCase()}while(DB.data.bookings.some(b=>b.code===code));
  DB.data.bookings.push({code,room:r.id,ci:q.ci,co:q.co,guests:+q.g,name:d.name.trim(),phone:d.phone.replace(/\s/g,''),email:d.email.trim(),note:(d.note||'').trim(),status:'Chờ xác nhận',nights:p.n,price:r.price,clean:p.clean,svc:p.svc,total:p.total,created:iso(today())});
  DB.save();go('/thanh-cong/'+code)}}
function pageSuccess(code){const b=DB.data.bookings.find(x=>x.code===code);if(!b)return notFound();const r=DB.room(b.room);
 return `<div class="wrap narrow"><div class="success"><div class="ok-ico">✓</div><h1>Đặt phòng thành công!</h1><p>Mã đặt phòng của bạn</p><p class="code">${b.code}</p>
 <p class="muted">Chủ nhà sẽ xác nhận trong ngày (demo). Trạng thái hiện tại: <span class="chip s${STATUSES.indexOf(b.status)}">${b.status}</span></p>
 <div class="calc left"><p><span>Phòng</span><b>${esc(r?r.name:b.room)}</b></p><p><span>Khách</span><b>${esc(b.name)} · ${b.guests} người</b></p><p><span>Ngày</span><b>${fmtD(b.ci)} → ${fmtD(b.co)} (${b.nights} đêm)</b></p><p class="tot"><span>Tổng (trả khi nhận phòng)</span><span>${money(b.total)}</span></p></div>
 <p class="demo-note">🧪 Bản demo – không có thanh toán thật, không gửi email/SMS.</p><div class="row-c"><a class="btn primary" href="#/">Về trang chủ</a><a class="btn ghost" href="#/quan-ly/dat-phong">Xem bên quản lý →</a></div></div></div>`}
const notFound=()=>`<div class="wrap narrow"><div class="empty"><h2>Không tìm thấy trang</h2><a class="btn primary" href="#/">Về trang chủ</a></div></div>`;

function render(){const{parts,q}=parseHash(),[a,b]=parts,v=$('#view');let html,bind=()=>{};
 document.body.classList.toggle('admin-mode',a==='quan-ly');document.body.classList.toggle('has-mbar',a==='phong'&&!!b);
 if(!a){html=pageHome();bind=bindSearch}
 else if(a==='phong'&&!b){html=pageList(q);bind=bindList}
 else if(a==='yeu-thich'){go('/phong',{fav:1});return}
 else if(a==='phong'){html=pageDetail(b,q);bind=()=>bindDetail(b,q)}
 else if(a==='dat-phong'){html=pageBook(b,q);bind=()=>bindBook(b,q)}
 else if(a==='thanh-cong'){html=pageSuccess(b)}
 else if(a==='quan-ly'){html=Admin.page(b||'tong-quan',q);bind=()=>Admin.bind(b||'tong-quan',q)}
 else html=notFound();
 v.innerHTML=html;bind();updFavCount();
 $$('.nav a').forEach(l=>l.classList.toggle('on',('#/'+(a||'')).startsWith(l.getAttribute('href'))&&(l.getAttribute('href')!=='#/'||!a)));
 if(!render.keep)window.scrollTo(0,0);render.keep=false;document.title=($('h1',v)?.textContent||'Nhà Gió')+' · Nhà Gió Homestay (demo)'}
window.addEventListener('hashchange',render);
window.addEventListener('DOMContentLoaded',()=>{DB.load();render();$('#year').textContent=today().getFullYear();
 $('#resetData').onclick=()=>{if(confirm('Khôi phục toàn bộ dữ liệu mẫu? Các đặt phòng bạn tạo sẽ bị xóa.')){DB.reset();localStorage.removeItem(FAVKEY);render();toast('Đã khôi phục dữ liệu mẫu')}};
 $('#menuBtn').onclick=()=>$('.nav').classList.toggle('open');$('.nav').addEventListener('click',e=>{if(e.target.closest('a'))$('.nav').classList.remove('open')})});
