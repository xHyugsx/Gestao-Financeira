(function(){
var K='financas-familiar:vet-reminders',SZ='financas-familiar:vet-snooze',DAY=864e5;
var MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var TYPES=[['vacina','Vacina anual',12],['interna','Desparasitação interna',3],['externa','Desparasitação externa',1],['outro','Outro',12]];
var EVERY=[[1,'Todos os meses'],[3,'A cada 3 meses'],[6,'A cada 6 meses'],[12,'Todos os anos'],[0,'Só uma vez']];
var IC={
syr:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>',
pill:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>',
bell:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function all(){try{var a=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(a)?a.filter(function(r){return r&&r.id&&r.pet&&r.last}):[]}catch(e){return[]}}
function save(a){try{localStorage.setItem(K,JSON.stringify(a))}catch(e){}refresh()}
function set(a){save(Array.isArray(a)?a:[])}
function pad(n){return(n<10?'0':'')+n}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function today(){return iso(new Date())}
function parse(s){var p=String(s).split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function addM(s,m){var d=parse(s),day=d.getDate(),t=new Date(d.getFullYear(),d.getMonth()+m,1),last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();t.setDate(Math.min(day,last));return iso(t)}
function next(r){return r.every>0?addM(r.last,r.every):r.last}
function days(r){return Math.round((parse(next(r))-parse(today()))/DAY)}
function label(r){if(r.type==='outro')return r.label||'Outro';for(var i=0;i<TYPES.length;i++)if(TYPES[i][0]===r.type)return TYPES[i][1];return'Lembrete'}
function everyTxt(n){return n===1?'todos os meses':n===3?'a cada 3 meses':n===6?'a cada 6 meses':n===12?'todos os anos':n>0?'a cada '+n+' meses':'só uma vez'}
function when(d){return d<-1?'Em atraso há '+(-d)+' dias':d===-1?'Em atraso há 1 dia':d===0?'Hoje':d===1?'Amanhã':'Daqui a '+d+' dias'}
function state(d){return d<0?'late':d<=7?'soon':'ok'}
function short(s){var d=parse(s);return d.getDate()+' '+MES[d.getMonth()]}
function icon(r){return r.type==='vacina'?IC.syr:r.type==='outro'?IC.bell:IC.pill}
function sorted(){return all().sort(function(a,b){return next(a).localeCompare(next(b))})}
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}

var hosts=[];
function render(el){var list=sorted();
el.innerHTML='<section class="ffvr"><div class="section-heading ffvr-hd"><h2>Lembretes</h2><button type="button" class="ffvr-add">+ Novo</button></div>'+
(list.length?list.map(function(r){var d=days(r),n=next(r);return '<div class="ffvr-row '+state(d)+'" role="button" tabindex="0" data-id="'+r.id+'" aria-label="Editar lembrete '+esc(r.pet+' '+label(r))+'"><span class="ffvr-ic">'+icon(r)+'</span><div class="ffvr-tx"><h3>'+esc(r.pet)+' · '+esc(label(r))+'</h3><p><span class="ffvr-st">'+when(d)+'</span> · '+short(n)+' · '+everyTxt(r.every)+'</p>'+(r.note?'<p class="ffvr-note">'+esc(r.note)+'</p>':'')+'</div><button type="button" class="ffvr-done" data-done="'+r.id+'">Feito</button></div>'}).join(''):'<div class="vet-empty ffvr-empty">Sem lembretes. Toca em «+ Novo» para criar o primeiro.</div>')+'</section>';
el.querySelector('.ffvr-add').onclick=function(){form(null)};
[].forEach.call(el.querySelectorAll('.ffvr-row'),function(row){row.onclick=function(e){if(e.target.closest('.ffvr-done'))return;form(row.dataset.id)};row.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();form(row.dataset.id)}}});
[].forEach.call(el.querySelectorAll('.ffvr-done'),function(b){b.onclick=function(e){e.stopPropagation();done(b.dataset.done)}})}
function mount(el){hosts.push(el);render(el)}
function refresh(){hosts=hosts.filter(function(h){return h.isConnected});hosts.forEach(render);dot()}
function done(id){var a=all(),r=a.filter(function(x){return String(x.id)===String(id)})[0];if(!r)return;
if(r.every>0){r.last=today();save(a)}else save(a.filter(function(x){return x!==r}));buzz(30)}

function form(id){var r=id?all().filter(function(x){return String(x.id)===String(id)})[0]:null;
var cur=r||{pet:'Sam',type:'vacina',every:12,last:'',note:''};
var ov=document.createElement('div');ov.className='ffvr-ov';
var tOpts=TYPES.map(function(t){return'<option value="'+t[0]+'"'+(t[0]===cur.type?' selected':'')+'>'+t[1]+'</option>'}).join('');
var eOpts=EVERY.map(function(t){return'<option value="'+t[0]+'"'+(t[0]===cur.every?' selected':'')+'>'+t[1]+'</option>'}).join('');
ov.innerHTML='<div class="ffvr-dlg" role="dialog" aria-modal="true" aria-label="'+(r?'Editar lembrete':'Novo lembrete')+'"><h2>'+(r?'Editar lembrete':'Novo lembrete')+'</h2><p class="ffvr-sub">A app avisa-te quando estiver a chegar a data.</p>'+
'<form class="movement-form"><div class="autohide-options ffvr-pets" role="radiogroup" aria-label="Animal"><button type="button" data-pet="Sam">Sam</button><button type="button" data-pet="Lola">Lola</button></div>'+
'<label>Tipo<select name="type">'+tOpts+'</select></label>'+
'<label class="ffvr-lbl">Nome<input name="label" maxlength="40" placeholder="Ex.: Análises anuais" value="'+esc(cur.label||'')+'"></label>'+
'<div class="form-grid"><label><span class="ffvr-dl">Última vez</span><input type="date" name="last" value="'+esc(cur.last)+'" max="'+today()+'"></label><label>Repetir<select name="every">'+eOpts+'</select></label></div>'+
'<label>Nota (opcional)<input name="note" maxlength="80" placeholder="Ex.: marca, clínica…" value="'+esc(cur.note||'')+'"></label>'+
'<p class="ffvr-err" role="alert"></p>'+
'<div class="ffvr-act">'+(r?'<button type="button" class="ffvr-del">Eliminar</button>':'')+'<button type="button" class="ffvr-cancel">Cancelar</button><button type="submit" class="ffvr-save">Guardar</button></div></form></div>';
document.body.appendChild(ov);requestAnimationFrame(function(){ov.classList.add('in')});
var f=ov.querySelector('form'),pet=cur.pet,sel=f.elements.type,ev=f.elements.every,lb=ov.querySelector('.ffvr-lbl'),dl=ov.querySelector('.ffvr-dl'),dt=f.elements.last,err=ov.querySelector('.ffvr-err');
function paintPet(){[].forEach.call(ov.querySelectorAll('[data-pet]'),function(b){var a=b.dataset.pet===pet;b.className=a?'autohide-choice autohide-choice-active':'autohide-choice';b.setAttribute('aria-checked',String(a));b.setAttribute('role','radio')})}
function sync(){lb.style.display=sel.value==='outro'?'':'none';var once=ev.value==='0';dl.textContent=once?'Data':'Última vez';if(once)dt.removeAttribute('max');else dt.max=today()}
paintPet();sync();
ov.querySelector('.ffvr-pets').onclick=function(e){var b=e.target.closest('[data-pet]');if(b){pet=b.dataset.pet;paintPet()}};
sel.onchange=function(){for(var i=0;i<TYPES.length;i++)if(TYPES[i][0]===sel.value&&sel.value!=='outro')ev.value=String(TYPES[i][2]);sync()};
ev.onchange=sync;
function close(){ov.classList.remove('in');setTimeout(function(){ov.remove()},250)}
ov.querySelector('.ffvr-cancel').onclick=close;
ov.onclick=function(e){if(e.target===ov)close()};
var del=ov.querySelector('.ffvr-del');if(del)del.onclick=function(){if(!window.confirm('Eliminar este lembrete?'))return;save(all().filter(function(x){return String(x.id)!==String(id)}));buzz([40,60,40]);close()};
f.onsubmit=function(e){e.preventDefault();var every=+ev.value,last=dt.value||(every>0?today():''),lab=String(f.elements.label.value||'').trim();
if(!last){err.textContent='Indica a data.';return}
if(sel.value==='outro'&&!lab){err.textContent='Indica o nome do lembrete.';return}
var rec={id:r?r.id:Date.now(),pet:pet,type:sel.value,label:sel.value==='outro'?lab:undefined,last:last,every:every,note:String(f.elements.note.value||'').trim()||undefined};
var a=all();if(r)a=a.map(function(x){return String(x.id)===String(id)?rec:x});else a.push(rec);save(a);buzz(30);close()}}

function urgent(){return sorted().filter(function(r){return days(r)<=3})}
function dot(){var n=document.querySelector('.bottom-nav .ffnav-more')||[].filter.call(document.querySelectorAll('.bottom-nav .nav-item'),function(b){return /Veterin/.test(b.textContent)})[0];if(!n)return;
var on=sorted().some(function(r){return days(r)<=7}),i=n.querySelector('.ffvet-dot');
if(on&&!i){i=document.createElement('i');i.className='ffvet-dot';i.setAttribute('aria-hidden','true');n.appendChild(i)}else if(!on&&i)i.remove()}
setInterval(function(){document.visibilityState==="visible"&&dot()},10000);document.addEventListener("click",function(){setTimeout(dot,400)},true);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){refresh()}});

function banner(){var u=urgent();if(!u.length)return false;if(+localStorage.getItem(SZ)>Date.now())return false;
var r=u[0],d=days(r),nav=document.querySelector('.bottom-nav'),el=document.createElement('div');el.id='ff-vetbn';el.setAttribute('role','status');
el.style.bottom=((nav?window.innerHeight-nav.getBoundingClientRect().top:0)+12)+'px';
var more=u.length>1?' (+'+(u.length-1)+(u.length>2?' outros':' outro')+')':'';
var msg=d<0?'em atraso há '+(-d)+(d===-1?' dia':' dias'):d===0?'é hoje':d===1?'é amanhã':'daqui a '+d+' dias';
el.innerHTML='<div class="ic">'+IC.bell.replace(/18/g,'22')+'</div><div class="tx"><strong>Lembrete veterinário</strong><p><b>'+esc(r.pet)+'</b> · '+esc(label(r))+' '+msg+'.'+more+'</p><div class="bt"><button type="button" class="no">Mais tarde</button><button type="button" class="yes">Ver</button></div></div>';
document.body.appendChild(el);requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('in')})});
function close(){el.classList.remove('in');setTimeout(function(){el.remove()},400)}
el.querySelector('.no').onclick=function(){var t=new Date();t.setHours(24,0,0,0);try{localStorage.setItem(SZ,String(t.getTime()))}catch(e){}close()};
el.querySelector('.yes').onclick=function(){close();window.ffGoPg&&window.ffGoPg('veterinario')};
return true}

window.ffVet={sorted:sorted,done:done,info:function(r){var d=days(r);return{label:label(r),next:next(r),days:d,when:when(d),short:short(next(r)),every:everyTxt(r.every)}},soon:function(){return sorted().some(function(r){return days(r)<=7})},all:all,set:set,mount:mount,banner:banner,refresh:refresh};
})();
