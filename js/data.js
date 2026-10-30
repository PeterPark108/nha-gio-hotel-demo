// Dữ liệu mẫu – hoàn toàn giả lập
const STORE='nhagio_db_v1', FAVKEY='nhagio_fav';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseD=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const nightsBetween=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
const money=n=>Math.round(n).toLocaleString('vi-VN')+'₫';
const fmtD=s=>{const d=parseD(s);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const CATS=[
 {id:'bien',name:'Gần biển',ico:'🌊'},{id:'nui',name:'Núi rừng',ico:'⛰️'},{id:'nguyen',name:'Nguyên căn',ico:'🏡'},
 {id:'hoboi',name:'Có hồ bơi',ico:'🏊'},{id:'bep',name:'Có bếp',ico:'🍳'},{id:'giadinh',name:'Cho gia đình',ico:'👨‍👩‍👧'}];
const TYPES=['Phòng đôi','Bungalow','Studio','Phòng gia đình','Nguyên căn'];
const AMEN={wifi:['📶','Wi‑Fi tốc độ cao'],ac:['❄️','Điều hòa'],view:['🌅','View biển'],hill:['🌲','View đồi thông'],balcony:['🪴','Ban công'],
 tv:['📺','Smart TV'],kitchen:['🍳','Bếp riêng'],pool:['🏊','Hồ bơi'],bbq:['🔥','Khu BBQ'],parking:['🅿️','Chỗ đậu xe'],washer:['🧺','Máy giặt'],
 breakfast:['🥐','Bữa sáng'],pet:['🐾','Cho thú cưng'],bath:['🛁','Bồn tắm']};
const STATUSES=['Chờ xác nhận','Đã xác nhận','Đã nhận phòng','Hoàn tất','Hủy'];
const RULES=['Nhận phòng từ 14:00, trả phòng trước 12:00','Không hút thuốc trong phòng','Giữ yên lặng sau 22:00','Không tổ chức tiệc lớn','Vui lòng tắt điện, điều hòa khi ra ngoài'];

const SEED_ROOMS=[
 {id:'r1',name:'Phòng Sóng Biển',type:'Phòng đôi',cats:['bien'],price:850000,clean:100000,guests:2,beds:'1 giường đôi',size:28,scene:'sea',pal:0,amen:['wifi','ac','view','balcony','tv','breakfast'],desc:'Phòng đôi ấm cúng với cửa kính lớn nhìn thẳng ra vịnh. Buổi sáng mở rèm là thấy bình minh trên biển, tối nghe tiếng sóng ru ngủ.'},
 {id:'r2',name:'Bungalow Dừa',type:'Bungalow',cats:['bien'],price:1200000,clean:150000,guests:3,beds:'1 giường đôi + 1 sofa giường',size:35,scene:'sea',pal:1,amen:['wifi','ac','view','balcony','bbq','parking'],desc:'Bungalow mái lá giữa vườn dừa, chỉ 50 bước chân ra bãi cát. Hiên gỗ rộng để nằm võng đọc sách.'},
 {id:'r3',name:'Căn Đồi Thông',type:'Nguyên căn',cats:['nui','nguyen','bep','giadinh'],price:2200000,clean:250000,guests:6,beds:'3 phòng ngủ',size:90,scene:'hill',pal:2,amen:['wifi','hill','kitchen','bbq','parking','washer','pet'],desc:'Nguyên căn nhà gỗ trên sườn đồi thông, có bếp đầy đủ, sân cỏ và khu nướng BBQ. Hợp nhóm bạn hoặc đại gia đình.'},
 {id:'r4',name:'Phòng Gác Mái',type:'Phòng đôi',cats:['nui'],price:650000,clean:80000,guests:2,beds:'1 giường đôi',size:22,scene:'hill',pal:3,amen:['wifi','hill','tv','breakfast'],desc:'Phòng gác mái nhỏ xinh với cửa sổ trời, view rừng thông. Giá mềm, hợp cặp đôi hoặc người đi một mình.'},
 {id:'r5',name:'Phòng Gia Đình Hoa Giấy',type:'Phòng gia đình',cats:['bien','giadinh'],price:1500000,clean:150000,guests:4,beds:'2 giường đôi',size:42,scene:'sea',pal:4,amen:['wifi','ac','view','tv','bath','breakfast','parking'],desc:'Phòng rộng cho gia đình 4 người, ban công phủ hoa giấy, có bồn tắm và góc chơi cho bé.'},
 {id:'r6',name:'Studio Ghềnh Ráng',type:'Studio',cats:['bien','bep'],price:1000000,clean:120000,guests:3,beds:'1 giường đôi + 1 giường đơn',size:32,scene:'sea',pal:5,amen:['wifi','ac','kitchen','washer','tv'],desc:'Studio có bếp nhỏ và bàn làm việc, hợp ở dài ngày. Đi bộ 10 phút ra Ghềnh Ráng ngắm hoàng hôn.'},
 {id:'r7',name:'Villa Hồ Bơi Eo Gió',type:'Nguyên căn',cats:['bien','nguyen','hoboi','bep','giadinh'],price:3500000,clean:400000,guests:8,beds:'4 phòng ngủ',size:160,scene:'pool',pal:6,amen:['wifi','ac','view','pool','kitchen','bbq','parking','washer','bath'],desc:'Villa riêng có hồ bơi, sân hiên hướng biển và bếp lớn. Lý tưởng cho kỳ nghỉ nhóm 6–8 người.'},
];
const NAMES=['Minh Anh','Thu Hà','Quốc Bảo','Lan Chi','Hoàng Nam','Ngọc Trâm','Đức Huy','Mai Phương','Tuấn Kiệt','Bích Ngọc','Gia Hân','Khánh Linh','Văn Toàn','Hải Yến','Phúc Lâm','Thanh Tâm'];
const REV=['Phòng sạch, view đẹp hơn ảnh. Chủ nhà nhiệt tình chỉ chỗ ăn ngon.','Vị trí thuận tiện, yên tĩnh, ngủ rất ngon.','Bữa sáng đơn giản nhưng ngon, sẽ quay lại!','Hơi khó tìm lúc đầu nhưng được hướng dẫn tận tình.','Không gian ấm cúng, decor xinh, chụp ảnh đẹp.','Giá hợp lý so với chất lượng. Wi‑Fi mạnh, làm việc ổn.','Cả nhà rất thích, bé chơi cả ngày ở sân.','Nhận phòng nhanh, mọi thứ như mô tả.'];

function rng(s){return()=>{s=(s*16807)%2147483647;return(s-1)/2147483646}}
function seed(){
 const R=rng(20261029), t=today(), rooms=JSON.parse(JSON.stringify(SEED_ROOMS)).map(r=>({...r,status:'Hoạt động'}));
 const reviews=[];
 rooms.forEach((r,i)=>{const n=3+Math.floor(R()*3);for(let k=0;k<n;k++)reviews.push({room:r.id,name:NAMES[Math.floor(R()*NAMES.length)],stars:R()<.75?5:4,text:REV[Math.floor(R()*REV.length)],date:iso(addDays(t,-10-Math.floor(R()*200)))})});
 const bookings=[];let no=1;
 rooms.forEach((r,ri)=>{const offs=[-95,-40,-6].concat(ri%3?[]:[16]);let last=null;
  offs.forEach(o=>{let ci=addDays(t,o+Math.floor(R()*20));if(last&&ci<last)ci=addDays(last,1);const n=2+Math.floor(R()*5),co=addDays(ci,n);last=co;
   const g=1+Math.floor(R()*r.guests);let st;
   if(co<=t)st=R()<.08?'Hủy':'Hoàn tất';else if(ci<=t)st='Đã nhận phòng';else st=R()<.45?'Chờ xác nhận':(R()<.08?'Hủy':'Đã xác nhận');
   const name=NAMES[Math.floor(R()*NAMES.length)];
   const sub=r.price*n, svc=Math.round(sub*0.05/1000)*1000;
   bookings.push({code:'NG'+(260000+no++*137),room:r.id,ci:iso(ci),co:iso(co),guests:g,name:'Khách '+name,phone:'09'+String(10000000+Math.floor(R()*89999999)).slice(0,8),email:'khach'+no+'@vidu.test',note:'',status:st,
    nights:n,price:r.price,clean:r.clean,svc,total:sub+r.clean+svc,created:iso(addDays(ci,-(1+Math.floor(R()*20))))});
  })});
 ['r2','r6'].forEach((id,k)=>{const r=rooms.find(x=>x.id===id),ci=addDays(t,-1-k),co=addDays(t,2);if(bookings.some(b=>b.room===id&&b.status!=='Hủy'&&parseD(b.ci)<co&&parseD(b.co)>ci))return;const n=nightsBetween(iso(ci),iso(co)),sub=r.price*n,svc=Math.round(sub*0.05/1000)*1000;
  bookings.push({code:'NG'+(260000+no++*137),room:id,ci:iso(ci),co:iso(co),guests:2,name:'Khách '+NAMES[3+k],phone:'0912'+(345670+k),email:'khach'+no+'@vidu.test',note:'Cần thuê xe máy',status:'Đã nhận phòng',nights:n,price:r.price,clean:r.clean,svc,total:sub+r.clean+svc,created:iso(addDays(ci,-6))})});
 bookings.forEach(b=>{if(parseD(b.created)>t)b.created=iso(addDays(t,-Math.floor(R()*5)))});
 return {v:1,rooms,reviews,bookings};
}
const DB={data:null,
 load(){try{this.data=JSON.parse(localStorage.getItem(STORE))}catch(e){}if(!this.data||this.data.v!==1){this.data=seed();this.save()}},
 save(){localStorage.setItem(STORE,JSON.stringify(this.data))},
 reset(){localStorage.removeItem(STORE);this.load()},
 room(id){return this.data.rooms.find(r=>r.id===id)},
 rating(id){const rs=this.data.reviews.filter(r=>r.room===id);return{n:rs.length,avg:rs.length?rs.reduce((a,b)=>a+b.stars,0)/rs.length:0}},
 blocked(id,except){const s=new Set();this.data.bookings.filter(b=>b.room===id&&b.status!=='Hủy'&&b.code!==except).forEach(b=>{for(let d=parseD(b.ci);d<parseD(b.co);d=addDays(d,1))s.add(iso(d))});return s},
 free(id,ci,co){const s=this.blocked(id);for(let d=parseD(ci);d<parseD(co);d=addDays(d,1))if(s.has(iso(d)))return false;return true},
 quote(r,ci,co){const n=nightsBetween(ci,co),sub=r.price*n,svc=Math.round(sub*0.05/1000)*1000;return{n,sub,clean:r.clean,svc,total:sub+r.clean+svc}},
};
const Fav={get(){try{return JSON.parse(localStorage.getItem(FAVKEY))||[]}catch(e){return[]}},has(id){return this.get().includes(id)},
 toggle(id){const f=this.get();const i=f.indexOf(id);i<0?f.push(id):f.splice(i,1);localStorage.setItem(FAVKEY,JSON.stringify(f));return i<0}};
