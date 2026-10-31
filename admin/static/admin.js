/* Trang quản trị Nhà Gió – JS thuần, không thư viện ngoài. */
(function(){'use strict';
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var meta=function(n){var m=document.querySelector('meta[name="'+n+'"]');return m?m.content:''};
var BASE=meta('base'),CSRF=meta('csrf'),app=$('#app');
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var media=function(p){return p?BASE+'/media/'+String(p).replace(/^assets\//,''):''};
var S=null,dirty=false;
function setDirty(v){dirty=v;var d=$('#dirty');if(d)d.hidden=!v}
window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue=''}});
function toast(msg,kind){var t=$('#toasts');if(!t){t=document.createElement('div');t.id='toasts';t.setAttribute('aria-live','polite');document.body.appendChild(t)}
 var m=document.createElement('p');m.className='msg '+(kind||'ok');m.setAttribute('role',kind==='err'?'alert':'status');m.textContent=msg;t.appendChild(m);setTimeout(function(){m.remove()},kind==='err'?9000:5000)}
function ask(title,text,okLabel,danger){return new Promise(function(res){var d=document.createElement('dialog');
 d.innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p><div class="row"><button class="btn" value="no" type="button">Hủy</button><button class="btn '+(danger?'danger':'primary')+'" value="yes" type="button">'+esc(okLabel||'Đồng ý')+'</button></div>';
 document.body.appendChild(d);d.addEventListener('click',function(e){var v=e.target.value;if(v){d.close();d.remove();res(v==='yes')}});d.addEventListener('cancel',function(){d.remove();res(false)});d.showModal();$('button[value=no]',d).focus()})}
function api(path,body,isForm){var o={method:body?'POST':'GET',headers:{'X-CSRF-Token':CSRF},credentials:'same-origin'};
 if(body){if(isForm)o.body=body;else{o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}}
 return fetch(BASE+'/api/'+path,o).then(function(r){return r.json().catch(function(){return{ok:false,error:'Máy chủ trả lời không đúng (mã '+r.status+').'}}).then(function(j){
  if(r.status===401){toast(j.error||'Phiên đăng nhập đã hết hạn.','err');setTimeout(function(){location.href=BASE+'/dang-nhap'},1500)}
  if(!j.ok)throw new Error(j.error||'Có lỗi xảy ra, vui lòng thử lại.');return j})},function(){throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')})}
function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.l=btn.textContent;btn.textContent=label||'Đang lưu…';btn.disabled=true}else{btn.textContent=btn.dataset.l||btn.textContent;btn.disabled=false}}
var TABS=[['tong-quan','🏠','Tổng quan'],['banner','🖼️','Banner'],['chan-trang','📇','Chân trang'],['tin-tuc','📰','Tin tức'],['cai-dat','⚙️','Cài đặt']];
function frame(cur,inner){var t=function(cls){return TABS.map(function(x){return '<a class="tab" href="#'+x[0]+'"'+(x[0]===cur?' aria-current="page"':'')+'><span class="i" aria-hidden="true">'+x[1]+'</span><span>'+x[2]+'</span></a>'}).join('')};
 return '<header class="topbar"><div class="brand"><span class="lg" aria-hidden="true">⌂</span><div><b>Nhà Gió</b><small>Quản trị</small></div></div><nav class="tabs" aria-label="Mục quản trị">'+t()+'</nav><span id="dirty" class="dirty" hidden>● Chưa lưu</span></header><main id="main">'+inner+'</main><nav class="bottomnav" aria-label="Mục quản trị (điện thoại)">'+t()+'</nav>'}
function route(){var h=(location.hash||'#tong-quan').slice(1).split('/'),k=h[0];
 var V={'tong-quan':vHome,'banner':vBanner,'chan-trang':vFooter,'tin-tuc':h[1]?vEditor:vPosts,'cai-dat':vSettings}[k]||vHome;
 setDirty(false);V(h[1]);window.scrollTo(0,0);var m=$('#main h1');if(m){m.tabIndex=-1;m.focus({preventScroll:true})}}
var lastHash=location.hash;
window.addEventListener('hashchange',function(){if(dirty){var to=location.hash;history.replaceState(null,'',lastHash);ask('Rời trang khi chưa lưu?','Bạn có thay đổi chưa lưu. Nếu rời đi, các thay đổi này sẽ mất.','Rời đi',true).then(function(y){if(y){dirty=false;location.hash=to}})}else{lastHash=location.hash;route()}});
function load(){return api('state').then(function(j){S=j;return j})}
function pubLink(path){return S.public?'<a class="btn" href="'+esc(S.public+'/'+(path||''))+'" target="_blank" rel="noopener">Xem trang web ↗</a>':''}

/* ---- Tổng quan */
function vHome(){var pub=S.posts.filter(function(p){return p.status==='published'}).length,dr=S.posts.length-pub;
 app.innerHTML=frame('tong-quan','<h1>Xin chào'+(S.user?', '+esc(S.user):'')+'!</h1><p class="muted">Chọn việc bạn muốn làm. Mọi thay đổi chỉ hiện trên trang web sau khi bấm <b>Lưu &amp; xuất bản</b> hoặc <b>Xuất bản</b>.</p>'
 +'<div class="kpis"><div class="kpi"><small>Ảnh banner</small><b>'+S.banners.length+'</b></div><div class="kpi"><small>Bài đã đăng</small><b>'+pub+'</b></div><div class="kpi"><small>Bài nháp</small><b>'+dr+'</b></div><div class="kpi"><small>Chế độ demo</small><b>'+(S.site.demo_mode!==false?'Bật':'Tắt')+'</b></div></div>'
 +'<div class="card" style="margin-top:16px"><h2>Việc thường làm</h2><div class="row"><a class="btn primary" href="#tin-tuc/moi">✏️ Viết bài mới</a><a class="btn" href="#banner">🖼️ Đổi ảnh banner</a><a class="btn" href="#chan-trang">📇 Sửa thông tin liên hệ</a>'+pubLink('')+'</div></div>'
 +'<div class="card"><h2>Xuất bản</h2><p class="muted sm">Lần cập nhật gần nhất: '+(S.last_publish?esc(S.last_publish.when.replace('T',' ').slice(0,16)):'chưa có')+'</p><button class="btn" id="repub" type="button">🔄 Xuất bản lại toàn bộ trang</button></div>');
 $('#repub').onclick=function(){var b=this;busy(b,1,'Đang xuất bản…');api('publish',{}).then(function(j){toast(j.msg);return load()}).then(function(){vHome()},function(e){toast(e.message,'err');busy(b,0)})}}

/* ---- Banner */
var BN=null;
function vBanner(){BN=S.banners.map(function(b){return Object.assign({},b)});drawBanner()}
function drawBanner(){
 app.innerHTML=frame('banner','<h1>Banner trang chủ</h1><p class="muted">Banner chỉ là <b>ảnh</b> (không có chữ trên ảnh). Nên dùng <b>3–4 ảnh</b> ngang, rõ nét. Ảnh tải lên sẽ tự cắt giữa theo tỉ lệ 16:5 cho máy tính và 4:3 cho điện thoại.</p>'
 +'<ol class="bn-list" id="bnl">'+BN.map(function(b,i){return '<li class="bn-item"><img src="'+esc(media(b.d))+'" alt="" width="1920" height="600"><div class="stack"><div class="row"><span class="num">Ảnh '+(i+1)+'</span><span class="sp"></span>'
  +'<button class="btn sm" type="button" data-up="'+i+'" '+(i===0?'disabled':'')+' aria-label="Đưa ảnh '+(i+1)+' lên trước">↑ Lên</button><button class="btn sm" type="button" data-down="'+i+'" '+(i===BN.length-1?'disabled':'')+' aria-label="Đưa ảnh '+(i+1)+' xuống sau">↓ Xuống</button><button class="btn sm danger" type="button" data-del="'+i+'">Xóa</button></div>'
  +'<label>Mô tả ảnh <small>(không hiện trên ảnh; giúp người khiếm thị và Google)</small><input data-alt="'+i+'" maxlength="200" value="'+esc(b.alt)+'" placeholder="Ví dụ: Hồ bơi nhìn ra biển lúc hoàng hôn"></label></div></li>'}).join('')+'</ol>'
 +(BN.length<6?'<label class="drop card" for="bnf"><span style="font-size:2rem" aria-hidden="true">📷</span><b>Thêm ảnh banner</b><span class="muted sm">Chọn từ thư viện ảnh hoặc chụp bằng điện thoại · JPG, PNG, WebP · tối đa 8 MB</span><input id="bnf" type="file" accept="image/jpeg,image/png,image/webp"></label>':'<p class="msg info">Đã đủ 6 ảnh (tối đa). Xóa bớt để thêm ảnh mới.</p>')
 +'<div class="actions"><button class="btn primary" id="bnsave" type="button">💾 Lưu &amp; xuất bản</button>'+pubLink('index.html')+'</div>');
 $$('[data-up]').forEach(function(b){b.onclick=function(){var i=+b.dataset.up;BN.splice(i-1,0,BN.splice(i,1)[0]);setDirty(true);drawBanner();setDirty(true);var f=$('[data-up="'+(i-1)+'"]')||$('[data-down="0"]');if(f&&!f.disabled)f.focus()}});
 $$('[data-down]').forEach(function(b){b.onclick=function(){var i=+b.dataset.down;BN.splice(i+1,0,BN.splice(i,1)[0]);drawBanner();setDirty(true);var f=$('[data-down="'+(i+1)+'"]')||$('[data-up="'+(i+1)+'"]');if(f&&!f.disabled)f.focus()}});
 $$('[data-del]').forEach(function(b){b.onclick=function(){var i=+b.dataset.del;ask('Xóa ảnh '+(i+1)+'?','Ảnh sẽ bị bỏ khỏi banner sau khi bạn bấm "Lưu & xuất bản". Có thể khôi phục trong Cài đặt → Sao lưu.','Xóa ảnh',true).then(function(y){if(y){BN.splice(i,1);drawBanner();setDirty(true)}})}});
 $$('[data-alt]').forEach(function(inp){inp.oninput=function(){BN[+inp.dataset.alt].alt=inp.value;setDirty(true)}});
 var f=$('#bnf');if(f)f.onchange=function(){if(!f.files[0])return;var fd=new FormData();fd.append('file',f.files[0]);var lab=f.closest('label');lab.querySelector('b').textContent='Đang tải ảnh lên…';
  api('banners/upload',fd,true).then(function(j){BN.push(j.banner);drawBanner();setDirty(true);toast(j.msg);if(j.warn)toast(j.warn,'info');var a=$('[data-alt="'+(BN.length-1)+'"]');if(a)a.focus()},function(e){toast(e.message,'err');drawBanner();setDirty(dirty)})};
 $('#bnsave').onclick=function(){var b=this;busy(b,1);api('banners',{banners:BN}).then(function(j){S.banners=j.banners;BN=j.banners.map(function(x){return Object.assign({},x)});setDirty(false);toast(j.msg);drawBanner()},function(e){toast(e.message,'err');busy(b,0)})};
}

/* ---- Chân trang */
var SOC=[['facebook','Facebook','https://facebook.com/ten-trang'],['zalo','Zalo','https://zalo.me/0900000000'],['instagram','Instagram','https://instagram.com/ten'],['tiktok','TikTok','https://tiktok.com/@ten'],['youtube','YouTube','https://youtube.com/@ten']];
function vFooter(){var s=S.site,so=s.social||{};
 app.innerHTML=frame('chan-trang','<h1>Thông tin chân trang</h1><p class="muted">Hiện ở cuối mọi trang. Để trống ô nào thì ô đó không hiện.</p><form id="ff" class="card stack" novalidate>'
 +'<label>Tên khách sạn *<input name="name" required maxlength="120" value="'+esc(s.name)+'"></label>'
 +'<label>Địa chỉ<input name="address" maxlength="250" value="'+esc(s.address)+'" autocomplete="street-address"></label>'
 +'<label>Số điện thoại<input name="phone" type="tel" inputmode="tel" maxlength="30" value="'+esc(s.phone)+'"></label>'
 +'<label>Email<input name="email" type="email" inputmode="email" maxlength="120" value="'+esc(s.email)+'" autocapitalize="none"></label>'
 +'<fieldset class="stack" style="border:0;padding:0;margin:0"><legend><h2>Mạng xã hội <small class="muted">(không bắt buộc)</small></h2></legend>'
 +SOC.map(function(x){return '<label>'+x[1]+'<input name="s_'+x[0]+'" type="url" inputmode="url" maxlength="300" value="'+esc(so[x[0]]||'')+'" placeholder="'+x[2]+'" autocapitalize="none"></label>'}).join('')+'</fieldset>'
 +'<label>Dòng bản quyền<input name="copyright" maxlength="200" value="'+esc(s.copyright)+'" placeholder="© 2026 Tên khách sạn"></label></form>'
 +'<div class="actions"><button class="btn primary" id="fsave" type="button">💾 Lưu &amp; xuất bản</button>'+pubLink('index.html')+'</div>');
 $('#ff').oninput=function(){setDirty(true)};
 $('#fsave').onclick=function(){var b=this,f=$('#ff'),v=function(n){return f.elements[n].value},so={};SOC.forEach(function(x){so[x[0]]=v('s_'+x[0])});
  if(!v('name').trim()){toast('Vui lòng nhập tên khách sạn.','err');f.elements.name.focus();return}
  busy(b,1);api('site',{name:v('name'),address:v('address'),phone:v('phone'),email:v('email'),social:so,copyright:v('copyright')}).then(function(j){S.site=j.site;setDirty(false);toast(j.msg);busy(b,0)},function(e){toast(e.message,'err');busy(b,0)})}}

/* ---- Tin tức */
function vPosts(){var L=S.posts;
 app.innerHTML=frame('tin-tuc','<div class="row"><h1 class="sp" style="margin:0">Tin tức</h1><a class="btn primary" href="#tin-tuc/moi">✏️ Viết bài mới</a></div><p class="muted">Bài <b>nháp</b> chỉ bạn thấy. Bài <b>đã đăng</b> hiện ở mục Tin tức trên trang web.</p>'
 +(L.length?'<ul class="plist">'+L.map(function(p){return '<li class="pitem">'+(p.image&&p.image.t?'<img src="'+esc(media(p.image.t))+'" alt="">':'<img alt="">')+'<div class="t"><b>'+esc(p.title)+'</b><span class="badge '+(p.status==='published'?'pub">Đã đăng':'draft">Nháp')+'</span> <span class="muted sm">sửa '+esc((p.updated||'').slice(0,10).split('-').reverse().join('/'))+'</span></div><a class="btn sm" href="#tin-tuc/'+esc(p.id)+'">Sửa</a><button class="btn sm danger" type="button" data-del="'+esc(p.id)+'">Xóa</button></li>'}).join('')+'</ul>':'<div class="card"><p>Chưa có bài viết nào.</p><a class="btn primary" href="#tin-tuc/moi">Viết bài đầu tiên</a></div>'));
 $$('[data-del]').forEach(function(b){b.onclick=function(){var p=S.posts.find(function(x){return x.id===b.dataset.del});ask('Xóa bài viết?','Bài "'+p.title+'" sẽ bị xóa'+(p.status==='published'?' và gỡ khỏi trang web':'')+'. Có thể khôi phục trong Cài đặt → Sao lưu.','Xóa bài',true).then(function(y){if(!y)return;api('posts/'+encodeURIComponent(p.id)+'/delete',{}).then(function(j){toast(j.msg);return load()}).then(vPosts,function(e){toast(e.message,'err')})})}})}
function vEditor(id){var p=id==='moi'?{id:'',title:'',slug:'',summary:'',body:'',image:null,status:'draft'}:S.posts.find(function(x){return x.id===id});
 if(!p){app.innerHTML=frame('tin-tuc','<h1>Không tìm thấy bài viết</h1><a class="btn" href="#tin-tuc">← Danh sách bài</a>');return}
 var P=JSON.parse(JSON.stringify(p));
 app.innerHTML=frame('tin-tuc','<p><a href="#tin-tuc">← Danh sách bài</a></p><h1>'+(P.id?'Sửa bài viết':'Viết bài mới')+' <span class="badge '+(P.status==='published'?'pub">Đã đăng':'draft">Nháp')+'</span></h1>'
 +'<form id="pf" class="stack" novalidate><div class="card stack"><label>Tiêu đề *<input name="title" required maxlength="150" value="'+esc(P.title)+'"></label>'
 +'<label>Mô tả ngắn <small>(hiện ở danh sách tin và trên Google/Facebook, ~150 ký tự)</small><input name="summary" maxlength="300" value="'+esc(P.summary)+'"></label>'
 +'<label>Đường dẫn <small>(tự tạo từ tiêu đề nếu để trống)</small><input name="slug" maxlength="80" value="'+esc(P.slug)+'" autocapitalize="none" spellcheck="false" placeholder="vi-du-uu-dai-mua-he"></label></div>'
 +'<div class="card stack"><h2 style="margin:0">Ảnh đại diện</h2><div class="fimg" id="fimg"></div></div>'
 +'<div class="card"><label for="body">Nội dung</label><div class="toolbar" role="toolbar" aria-label="Định dạng">'
 +[['h2','Tiêu đề lớn','H2'],['h3','Tiêu đề nhỏ','H3'],['b','In đậm','<b>B</b>'],['i','In nghiêng','<i>I</i>'],['ul','Danh sách chấm','• Danh sách'],['ol','Danh sách số','1. Danh sách'],['link','Chèn liên kết','🔗 Liên kết'],['img','Chèn ảnh','🖼️ Ảnh']].map(function(x){return '<button type="button" data-fmt="'+x[0]+'" title="'+x[1]+'" aria-label="'+x[1]+'">'+x[2]+'</button>'}).join('')
 +'<input id="bimg" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>'
 +'<div class="ed split" style="margin-top:10px"><textarea id="body" name="body" maxlength="50000" placeholder="Viết nội dung ở đây. Bỏ trống một dòng để sang đoạn mới.">'+esc(P.body)+'</textarea><div><p class="muted sm" style="margin:0 0 6px">Xem trước</p><div class="preview" id="pv" aria-live="polite"></div></div></div>'
 +'<p class="muted sm">Mẹo: chọn chữ rồi bấm <b>B</b> để in đậm. ## ở đầu dòng = tiêu đề; - ở đầu dòng = danh sách.</p></div></form>'
 +'<div class="actions"><button class="btn" id="pdraft" type="button">💾 Lưu nháp</button><button class="btn" id="ppv" type="button">👁️ Xem trước</button><button class="btn primary" id="ppub" type="button">🚀 '+(P.status==='published'?'Cập nhật bài đã đăng':'Xuất bản')+'</button>'
 +(P.status==='published'?'<button class="btn danger" id="punpub" type="button">Gỡ xuống (về nháp)</button>':'')+(P.status==='published'&&S.public?'<a class="btn" target="_blank" rel="noopener" href="'+esc(S.public+'/tin-tuc/'+P.slug+'/')+'">Xem trên web ↗</a>':'')+'</div>');
 var f=$('#pf'),ta=$('#body'),pv=$('#pv'),tm=null;
 function drawImg(){$('#fimg').innerHTML=(P.image&&P.image.f?'<img src="'+esc(media(P.image.t||P.image.f))+'" alt=""><div class="stack" style="flex:1 1 220px"><label>Mô tả ảnh *<input id="falt" maxlength="200" value="'+esc(P.image.alt||'')+'"></label><div class="row"><label class="btn sm" for="fimgf">Đổi ảnh</label><button class="btn sm danger" type="button" id="frm">Bỏ ảnh</button></div></div>':'<label class="drop" for="fimgf" style="flex:1"><span aria-hidden="true" style="font-size:1.6rem">📷</span><b>Chọn ảnh đại diện</b><span class="muted sm">JPG, PNG, WebP · tối đa 8 MB</span></label>')+'<input id="fimgf" class="sr" type="file" accept="image/jpeg,image/png,image/webp">';
  var fi=$('#fimgf');fi.onchange=function(){if(!fi.files[0])return;var fd=new FormData();fd.append('file',fi.files[0]);toast('Đang tải ảnh lên…','info');api('upload-image',fd,true).then(function(j){P.image={f:j.f,t:j.t,alt:(P.image&&P.image.alt)||''};drawImg();setDirty(true);toast(j.msg);$('#falt').focus()},function(e){toast(e.message,'err')})};
  var a=$('#falt');if(a)a.oninput=function(){P.image.alt=a.value;setDirty(true)};var r=$('#frm');if(r)r.onclick=function(){P.image=null;drawImg();setDirty(true)}}
 drawImg();
 function prev(){clearTimeout(tm);tm=setTimeout(function(){api('preview',{body:ta.value}).then(function(j){pv.innerHTML=j.html||'<p class="muted">(Chưa có nội dung)</p>'},function(e){pv.textContent=e.message})},350)}
 prev();ta.addEventListener('input',prev);f.addEventListener('input',function(){setDirty(true)});
 function wrap(a,b,ph){var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value,sel=v.slice(s,e)||ph;ta.setRangeText(a+sel+b,s,e,'end');if(!v.slice(s,e)){ta.selectionStart=s+a.length;ta.selectionEnd=s+a.length+sel.length}ta.focus();ta.dispatchEvent(new Event('input',{bubbles:true}))}
 function line(pre){var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value,ls=v.lastIndexOf('\n',s-1)+1,le=v.indexOf('\n',e);if(le<0)le=v.length;var blk=v.slice(ls,le).split('\n').map(function(l,i){return (typeof pre==='function'?pre(i):pre)+l.replace(/^(#{1,3}\s+|[-*]\s+|\d+[.)]\s+)/,'')}).join('\n');ta.setRangeText(blk,ls,le,'end');ta.focus();ta.dispatchEvent(new Event('input',{bubbles:true}))}
 $$('[data-fmt]').forEach(function(b){b.onclick=function(){var k=b.dataset.fmt;
  if(k==='b')wrap('**','**','chữ đậm');else if(k==='i')wrap('*','*','chữ nghiêng');else if(k==='h2')line('## ');else if(k==='h3')line('### ');else if(k==='ul')line('- ');else if(k==='ol')line(function(i){return (i+1)+'. '});
  else if(k==='link'){var u=prompt('Dán địa chỉ liên kết (bắt đầu bằng https://):','https://');if(u&&/^https?:\/\/\S+$/.test(u))wrap('[','](' + u + ')','chữ liên kết');else if(u)toast('Liên kết cần bắt đầu bằng https://','err')}
  else if(k==='img')$('#bimg').click()}});
 $('#bimg').onchange=function(){var fi=this;if(!fi.files[0])return;var fd=new FormData();fd.append('file',fi.files[0]);toast('Đang tải ảnh lên…','info');api('upload-image',fd,true).then(function(j){var alt=prompt('Mô tả ngắn cho ảnh (không bắt buộc):','')||'';wrap('\n![' + alt.replace(/[\[\]]/g,'') + '](' + j.f + ')\n','','');toast(j.msg);fi.value=''},function(e){toast(e.message,'err');fi.value=''})};
 $('#ppv').onclick=function(){prev();pv.scrollIntoView({behavior:'smooth',block:'start'})};
 function save(status,btn){var v=function(n){return f.elements[n].value};if(!v('title').trim()){toast('Vui lòng nhập tiêu đề.','err');f.elements.title.focus();return}
  if(P.image&&P.image.f&&!(P.image.alt||'').trim()){toast('Vui lòng nhập mô tả cho ảnh đại diện.','err');$('#falt').focus();return}
  busy(btn,1);api('posts',{id:P.id,title:v('title'),summary:v('summary'),slug:v('slug'),body:ta.value,image:P.image,status:status}).then(function(j){setDirty(false);toast(j.msg);return load().then(function(){location.replace('#tin-tuc/'+j.post.id);lastHash=location.hash;route()})},function(e){toast(e.message,'err');busy(btn,0)})}
 $('#pdraft').onclick=function(){save('draft',this)};
 $('#ppub').onclick=function(){save('published',this)};
 var u=$('#punpub');if(u)u.onclick=function(){var b=this;ask('Gỡ bài khỏi trang web?','Bài sẽ chuyển về nháp và không còn hiện trên trang web.','Gỡ xuống',true).then(function(y){if(y)save('draft',b)})}}

/* ---- Cài đặt */
function vSettings(){var demo=S.site.demo_mode!==false;
 app.innerHTML=frame('cai-dat','<h1>Cài đặt</h1>'
 +'<div class="card stack"><h2 style="margin:0">Chế độ demo</h2><label class="switch"><input type="checkbox" id="demo"'+(demo?' checked':'')+'><span><b>Bật chế độ demo</b> – hiện dòng "Bản demo", chặn Google lập chỉ mục (noindex + robots.txt).<br><span class="muted sm">Chỉ tắt khi toàn bộ thông tin trên web đã là thông tin thật của khách sạn.</span></span></label></div>'
 +'<div class="card stack"><h2 style="margin:0">Tài khoản</h2><div class="row"><a class="btn" href="'+esc(BASE)+'/doi-mat-khau">🔑 Đổi mật khẩu</a><button class="btn danger" id="lo" type="button">Đăng xuất</button></div></div>'
 +'<div class="card"><h2>Sao lưu &amp; khôi phục</h2><p class="muted sm">Mỗi lần lưu, bản cũ được giữ lại tự động (30 bản gần nhất cho mỗi mục). Bấm "Khôi phục" để quay lại bản đó.</p><div id="bk" class="tbl-w"><p class="muted">Đang tải…</p></div></div>'
 +'<div class="card"><h2>Nhật ký gần đây</h2><div id="au" class="tbl-w"></div></div>');
 $('#demo').onchange=function(){var c=this,want=c.checked;var go=function(){api('site',Object.assign({},S.site,{demo_mode:want})).then(function(j){S.site=j.site;toast(want?'Đã bật chế độ demo.':'Đã tắt chế độ demo. Trang web có thể được Google lập chỉ mục.')},function(e){c.checked=!want;toast(e.message,'err')})};
  if(!want)ask('Tắt chế độ demo?','Trang web sẽ bỏ dòng "Bản demo" và cho phép Google lập chỉ mục. Chỉ làm khi mọi thông tin đã là thật.','Tắt chế độ demo',true).then(function(y){if(y)go();else c.checked=true});else go()};
 $('#lo').onclick=function(){if(dirty)return;$('#logoutForm').submit()};
 var N={site:'Chân trang & cài đặt',banners:'Banner',posts:'Tin tức'};
 api('backups').then(function(j){$('#bk').innerHTML=j.backups.length?'<table class="tbl"><thead><tr><th>Mục</th><th>Thời điểm</th><th></th></tr></thead><tbody>'+j.backups.map(function(b){return '<tr><td>'+esc(N[b.file])+'</td><td>'+esc(b.when)+'</td><td><button class="btn sm" type="button" data-rs="'+esc(b.id)+'">Khôi phục</button></td></tr>'}).join('')+'</tbody></table>':'<p class="muted">Chưa có bản sao lưu nào.</p>';
  $('#au').innerHTML='<table class="tbl"><tbody>'+j.audit.map(function(a){return '<tr><td>'+esc(a.ts.replace('T',' ').slice(0,16))+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.detail)+'</td></tr>'}).join('')+'</tbody></table>';
  $$('[data-rs]').forEach(function(b){b.onclick=function(){ask('Khôi phục bản này?','Dữ liệu hiện tại sẽ được sao lưu trước, rồi thay bằng bản đã chọn và cập nhật trang web.','Khôi phục').then(function(y){if(!y)return;busy(b,1,'Đang khôi phục…');api('backups/restore',{id:b.dataset.rs}).then(function(j){toast(j.msg);return load()}).then(vSettings,function(e){toast(e.message,'err');busy(b,0)})})}})},function(e){$('#bk').textContent=e.message})}

load().then(route,function(e){app.innerHTML='<p class="msg err">'+esc(e.message)+'</p>'});
})();
