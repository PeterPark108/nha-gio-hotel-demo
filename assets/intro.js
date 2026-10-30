/* Intro "gió" – chỉ chạy khi <html> có .intro-on (đặt trong <head>: lần đầu mỗi phiên, không reduced-motion). */
(function(){'use strict';
var d=document.documentElement,el=document.getElementById('intro');
if(!el)return;
if(!d.classList.contains('intro-on')){el.remove();return}
var done=false,btn=document.getElementById('introSkip'),prev=document.activeElement;
function end(fast){if(done)return;done=true;document.removeEventListener('keydown',key);
 var fin=function(){el.remove();d.classList.remove('intro-on');if(document.activeElement===document.body||!document.activeElement||el.contains(document.activeElement)){try{(prev&&prev!==document.body?prev:document.body).focus({preventScroll:true})}catch(e){}}};
 if(fast){el.classList.add('out');setTimeout(fin,260)}else fin()}
function key(e){if(e.key==='Escape'){e.preventDefault();end(true)}}
try{btn.focus({preventScroll:true})}catch(e){}
document.addEventListener('keydown',key);
el.addEventListener('click',function(){end(true)});
el.addEventListener('animationend',function(e){if(e.target===el&&e.animationName==='intro-sweep')end(false)});
setTimeout(function(){end(false)},2700);
})();
