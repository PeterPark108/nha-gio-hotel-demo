// Trang quản lý cho chủ homestay (vai trò demo, không mật khẩu)
const Admin={tabs:[['tong-quan','📊 Tổng quan'],['dat-phong','📋 Đặt phòng'],['lich','🗓️ Lịch phòng'],['phong','🛏️ Quản lý phòng']],
 head(cur){return `<div class="adm-h"><div><p class="eyebrow">Chế độ chủ homestay · demo, không cần mật khẩu</p><h1>${this.tabs.find(t=>t[0]===cur)[1].slice(3)}</h1></div><a class="btn ghost" href="#/">← Về trang khách</a></div>`},
 nav(cur){return `<nav class="adm-tabs" aria-label="Mục quản lý">${this.tabs.map(([k,t])=>`<a href="#/quan-ly/${k}" class="${k===cur?'on':''}" ${k===cur?'aria-current="page"':''}>${t}</a>`).join('')}</nav>`},
 page(tab,q){const fn={'tong-quan':this.overview,'dat-phong':this.bookings,'lich':this.calendar,'phong':this.rooms}[tab];if(!fn)return notFound();return `<div class="wrap admin">${this.head(tab)}${this.nav(tab)}<div class="adm-main">${fn.call(this,q)}</div></div>`},
 bind(tab,q){const fn={'dat-phong':this.bindBookings,'lich':this.bindCal,'phong':this.bindRooms,'tong-quan':this.bindBookings}[tab];if(fn)fn.call(this,q)},
 live(){return DB.data.bookings.filter(b=>b.status!=='Hủy')},
 monthStats(y,m){const start=new Date(y,m,1),end=new Date(y,m+1,1),days=(end-start)/864e5;let nights=0,rev=0;
  this.live().forEach(b=>{for(let d=parseD(b.ci);d<parseD(b.co);d=addDays(d,1))if(d>=start&&d<end){nights++;rev+=b.price}});
  const active=DB.data.rooms.filter(r=>r.status==='Hoạt động').length||1;return{nights,rev,occ:nights/(active*days)}},
 overview(){const t=today(),cur=this.monthStats(t.getFullYear(),t.getMonth()),prev=this.monthStats(t.getFullYear(),t.getMonth()-1);
  const wk=iso(addDays(t,-7)),neu=DB.data.bookings.filter(b=>b.created>=wk),pend=DB.data.bookings.filter(b=>b.status==='Chờ xác nhận');
  const months=Array.from({length:6},(_,i)=>{const d=new Date(t.getFullYear(),t.getMonth()-4+i,1);return{l:`T${d.getMonth()+1}`,...this.monthStats(d.getFullYear(),d.getMonth())}});
  const ti=iso(t),arrive=DB.data.bookings.filter(b=>b.status!=='Hủy'&&b.ci>=ti&&b.ci<=iso(addDays(t,7))).sort((a,b)=>a.ci<b.ci?-1:1);
  const delta=prev.rev?Math.round((cur.rev-prev.rev)/prev.rev*100):0;
  return `<div class="kpis"><div class="kpi"><small>Doanh thu tháng ${t.getMonth()+1}</small><b>${money(cur.rev)}</b><span class="${delta>=0?'up':'down'}">${delta>=0?'▲':'▼'} ${Math.abs(delta)}% so với tháng trước</span></div>
  <div class="kpi"><small>Tỉ lệ lấp đầy tháng này</small><b>${Math.round(cur.occ*100)}%</b><span class="muted">${cur.nights} đêm đã đặt</span></div>
  <div class="kpi"><small>Đặt mới (7 ngày)</small><b>${neu.length}</b><span class="muted">${pend.length} đang chờ xác nhận</span></div>
  <div class="kpi"><small>Khách đến 7 ngày tới</small><b>${arrive.length}</b><span class="muted">${DB.data.bookings.filter(b=>b.status==='Đã nhận phòng').length} khách đang lưu trú</span></div></div>
  <div class="adm-grid"><div class="panel"><h3>Doanh thu 6 tháng (tiền phòng)</h3>${this.bars(months.map(m=>({l:m.l,v:m.rev})),v=>(v/1e6).toFixed(1).replace('.',',')+'tr')}</div>
  <div class="panel"><h3>Lấp đầy theo phòng – tháng này</h3>${this.hbars()}</div></div>
  <div class="panel"><h3>Cần xử lý: chờ xác nhận (${pend.length})</h3>${pend.length?this.table(pend):'<p class="muted">Không có đặt phòng nào đang chờ. 🎉</p>'}</div>`},
 bars(data,fmt){const W=520,H=220,max=Math.max(...data.map(d=>d.v),1),bw=W/data.length;
  return `<svg class="chart" viewBox="0 0 ${W} ${H+30}" role="img" aria-label="Biểu đồ cột">${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${H-f*(H-30)}" y2="${H-f*(H-30)}" class="gl"/>`).join('')}${data.map((d,i)=>{const h=d.v/max*(H-30);return `<rect x="${i*bw+bw*.2}" y="${H-h}" width="${bw*.6}" height="${h}" rx="6" class="${i===data.length-2?'bar cur':'bar'}"><title>${d.l}: ${money(d.v)}</title></rect><text x="${i*bw+bw/2}" y="${H-h-6}" text-anchor="middle" class="bl">${fmt(d.v)}</text><text x="${i*bw+bw/2}" y="${H+20}" text-anchor="middle" class="ax">${d.l}</text>`}).join('')}</svg>`},
 hbars(){const t=today(),s=new Date(t.getFullYear(),t.getMonth(),1),e=new Date(t.getFullYear(),t.getMonth()+1,1),days=(e-s)/864e5;
  return `<div class="hb">${DB.data.rooms.map(r=>{let n=0;this.live().filter(b=>b.room===r.id).forEach(b=>{for(let d=parseD(b.ci);d<parseD(b.co);d=addDays(d,1))if(d>=s&&d<e)n++});const p=Math.round(n/days*100);
   return `<div class="hb-r"><span>${esc(r.name)}</span><div class="hb-t"><i style="width:${p}%"></i></div><b>${p}%</b></div>`}).join('')}</div>`},
 table(list){return `<div class="tbl-w"><table class="tbl"><thead><tr><th>Mã</th><th>Khách</th><th>Phòng</th><th>Ngày ở</th><th class="r">Tổng</th><th>Trạng thái</th></tr></thead><tbody>${list.map(b=>{const r=DB.room(b.room);return `<tr><td data-l="Mã"><div class="v"><b>${b.code}</b><div class="sm muted">đặt ${fmtD(b.created)}</div></div></td><td data-l="Khách"><div class="v">${esc(b.name)}<div class="sm muted">${esc(b.phone)} · ${b.guests} khách</div>${b.note?`<div class="sm note">“${esc(b.note)}”</div>`:''}</div></td><td data-l="Phòng"><div class="v">${esc(r?r.name:b.room)}</div></td><td data-l="Ngày ở"><div class="v">${fmtD(b.ci)} → ${fmtD(b.co)}<div class="sm muted">${b.nights} đêm</div></div></td><td data-l="Tổng" class="r"><div class="v"><b>${money(b.total)}</b></div></td>
  <td data-l="Trạng thái"><div class="v"><span class="stw s${STATUSES.indexOf(b.status)}"><select class="st-sel s${STATUSES.indexOf(b.status)}" data-code="${b.code}" aria-label="Đổi trạng thái ${b.code}">${STATUSES.map(s=>`<option ${s===b.status?'selected':''}>${s}</option>`).join('')}</select></span></div></td></tr>`}).join('')}</tbody></table></div>`},
 bookings(q){const st=q.st||'',kw=(q.kw||'').toLowerCase();let list=[...DB.data.bookings].sort((a,b)=>a.created<b.created?1:a.created>b.created?-1:a.ci<b.ci?1:-1);
  const cnt=s=>DB.data.bookings.filter(b=>b.status===s).length;
  if(st)list=list.filter(b=>b.status===st);if(kw)list=list.filter(b=>(b.code+b.name+b.phone).toLowerCase().includes(kw));
  return `<div class="chips">${[['','Tất cả',DB.data.bookings.length],...STATUSES.map(s=>[s,s,cnt(s)])].map(([v,t,n])=>`<a class="fchip ${st===v?'on':''}" href="#/quan-ly/dat-phong${v?'?st='+encodeURIComponent(v):''}">${t} <b>${n}</b></a>`).join('')}</div>
  <div class="toolbar"><input id="kw" placeholder="🔍 Tìm mã, tên, SĐT..." value="${esc(q.kw||'')}"><span class="muted sm">${list.length} đặt phòng</span></div>
  ${list.length?this.table(list):'<div class="empty"><h2>Không có đặt phòng</h2><p>Thử chọn trạng thái khác hoặc xóa từ khóa.</p></div>'}`},
 bindBookings(q){$$('.st-sel').forEach(s=>s.onchange=()=>{const b=DB.data.bookings.find(x=>x.code===s.dataset.code);
   if(s.value!=='Hủy'&&b.status==='Hủy'&&!DB.data.bookings.filter(x=>x.code!==b.code).every(x=>x.room!==b.room||x.status==='Hủy'||x.co<=b.ci||x.ci>=b.co)){toast('Không thể mở lại: lịch đã có đặt phòng khác trùng ngày','bad');s.value='Hủy';return}
   b.status=s.value;DB.save();toast(`${b.code}: ${b.status}`);render.keep=true;render()});
  const k=$('#kw');if(k){k.onchange=()=>go('/quan-ly/dat-phong',{...q,kw:k.value})}},
 calendar(q){const t=today();let [y,m]=(q.m||`${t.getFullYear()}-${t.getMonth()+1}`).split('-').map(Number);m--;const dim=new Date(y,m+1,0).getDate();
  const pm=new Date(y,m-1,1),nm=new Date(y,m+1,1),k=d=>`${d.getFullYear()}-${d.getMonth()+1}`;
  const head=Array.from({length:dim},(_,i)=>{const d=new Date(y,m,i+1);return `<th class="${[0,6].includes(d.getDay())?'we':''} ${iso(d)===iso(t)?'td':''}">${i+1}<small>${'CN T2 T3 T4 T5 T6 T7'.split(' ')[d.getDay()]}</small></th>`}).join('');
  const rows=DB.data.rooms.map(r=>{const bs=DB.data.bookings.filter(b=>b.room===r.id&&b.status!=='Hủy');let cells='';
   for(let i=1;i<=dim;){const s=iso(new Date(y,m,i));const b=bs.find(x=>x.ci<=s&&x.co>s);
    if(b){let n=0;while(i+n<=dim&&iso(new Date(y,m,i+n))<b.co)n++;cells+=`<td colspan="${n}"><a class="bk s${STATUSES.indexOf(b.status)}" href="#/quan-ly/dat-phong?kw=${b.code}" title="${b.code} · ${esc(b.name)} · ${b.status}">${esc(b.name.replace('Khách ',''))}</a></td>`;i+=n}
    else{cells+=`<td class="${r.status!=='Hoạt động'?'off':''}"></td>`;i++}}
   return `<tr><th class="rn">${esc(r.name)}${r.status!=='Hoạt động'?' <small>(tạm ngưng)</small>':''}</th>${cells}</tr>`}).join('');
  const ms=this.monthStats(y,m);
  return `<div class="toolbar"><a class="btn ghost" href="#/quan-ly/lich?m=${k(pm)}">‹ Tháng trước</a><b>Tháng ${m+1}/${y}</b><a class="btn ghost" href="#/quan-ly/lich?m=${k(nm)}">Tháng sau ›</a><span class="muted sm">Lấp đầy ${Math.round(ms.occ*100)}% · ${ms.nights} đêm · ${money(ms.rev)}</span></div>
  <div class="legend sm">${STATUSES.slice(0,4).map((s,i)=>`<span><i class="lg s${i}"></i>${s}</span>`).join('')}</div>
  <div class="gantt-w"><table class="gantt"><thead><tr><th class="rn">Phòng</th>${head}</tr></thead><tbody>${rows}</tbody></table></div><p class="sm muted">Bấm vào một đặt phòng để xem chi tiết. Kéo ngang để xem hết tháng trên điện thoại.</p>`},
 bindCal(){const w=$('.gantt-w'),td=$('.gantt th.td');if(w&&td)w.scrollLeft=Math.max(0,td.offsetLeft-$('.gantt .rn').offsetWidth-70)},
 rooms(){return `<div class="panel"><h3>Danh sách phòng</h3><div class="tbl-w"><table class="tbl"><thead><tr><th>Phòng</th><th>Loại</th><th>Sức chứa</th><th class="r">Giá / đêm</th><th class="r">Phí dọn</th><th>Tình trạng</th><th></th></tr></thead><tbody>${DB.data.rooms.map(r=>`<tr data-id="${r.id}"><td data-l="Phòng"><div class="rm"><span class="mini">${artSVG(r.scene,r.pal,r.name)}</span><b>${esc(r.name)}</b></div></td><td data-l="Loại">${esc(r.type)}</td><td data-l="Sức chứa">${r.guests} khách</td>
  <td data-l="Giá / đêm" class="r"><input type="number" class="num" data-k="price" min="100000" step="50000" value="${r.price}"></td><td data-l="Phí dọn" class="r"><input type="number" class="num" data-k="clean" min="0" step="10000" value="${r.clean}"></td>
  <td data-l="Tình trạng"><select data-k="status">${['Hoạt động','Tạm ngưng'].map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn ghost sm-btn" data-save>Lưu</button></td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel"><h3>Thêm phòng mới</h3><form id="addRoom" class="form-grid" novalidate><label>Tên phòng *<input name="name" placeholder="VD: Phòng Hải Âu"></label><label>Loại<select name="type">${TYPES.map(t=>`<option>${t}</option>`).join('')}</select></label>
  <label>Giá / đêm (₫) *<input name="price" type="number" min="100000" step="50000" value="900000"></label><label>Sức chứa *<input name="guests" type="number" min="1" max="12" value="2"></label>
  <label>Phong cảnh ảnh minh họa<select name="scene"><option value="sea">Biển</option><option value="hill">Đồi núi</option><option value="pool">Hồ bơi</option></select></label><label>Danh mục<select name="cat">${CATS.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></label>
  <label class="span2">Mô tả<textarea name="desc" rows="2" placeholder="Vài dòng giới thiệu phòng"></textarea></label><p class="err span2" id="arErr"></p><button class="btn primary add-btn">+ Thêm phòng</button></form></div>`},
 bindRooms(){$$('tr[data-id]').forEach(tr=>{const mark=()=>{const b=$('[data-save]',tr);b.classList.add('primary');b.classList.remove('ghost');b.textContent='Lưu thay đổi'};$$('input,select',tr).forEach(i=>{i.addEventListener('input',mark);i.addEventListener('change',mark)})});$$('[data-save]').forEach(b=>b.onclick=()=>{const tr=b.closest('tr'),r=DB.room(tr.dataset.id);const price=+$('[data-k=price]',tr).value,clean=+$('[data-k=clean]',tr).value;
   if(!(price>=100000)){toast('Giá tối thiểu 100.000₫','bad');return}if(!(clean>=0)){toast('Phí dọn không hợp lệ','bad');return}
   r.price=price;r.clean=clean;r.status=$('[data-k=status]',tr).value;DB.save();b.classList.remove('primary');b.classList.add('ghost');b.textContent='Lưu';toast('Đã lưu '+r.name)});
  $('#addRoom').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const err=[];
   if(d.name.trim().length<3)err.push('Tên phòng ít nhất 3 ký tự.');if(!(+d.price>=100000))err.push('Giá tối thiểu 100.000₫.');if(!(+d.guests>=1&&+d.guests<=12))err.push('Sức chứa 1–12 khách.');
   if(DB.data.rooms.some(r=>r.name.toLowerCase()===d.name.trim().toLowerCase()))err.push('Tên phòng đã tồn tại.');
   if(err.length){$('#arErr').textContent=err.join(' ');return}
   const id='r'+(Math.max(...DB.data.rooms.map(r=>+r.id.slice(1)))+1);
   DB.data.rooms.push({id,name:d.name.trim(),type:d.type,cats:[d.cat],price:+d.price,clean:100000,guests:+d.guests,beds:+d.guests>2?'2 giường':'1 giường đôi',size:30,scene:d.scene,pal:DB.data.rooms.length,amen:['wifi','ac'],desc:d.desc.trim()||'Phòng mới (dữ liệu mẫu).',status:'Hoạt động'});
   DB.save();toast('Đã thêm '+d.name.trim());render.keep=true;render()}},
};
