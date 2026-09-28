(function(){
var LIM=5242880,WK='financas-familiar:storage-warn',failing=false;
function mb(n){return n<104858?(n<512?0:Math.max(1,Math.round(n/1024)))+' KB':(n/1048576).toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1})+' MB'}

function measure(){var tot=0,parts={fotos:0,mov:0,jarvis:0,outros:0},nmov=0;
 try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i),v=localStorage.getItem(k)||'',n=k.length+v.length;tot+=n;
  if(k==='financas-familiar:v3'){try{var d=JSON.parse(v);var f=JSON.stringify(d.petPhotos||{}).length,t=JSON.stringify(d.transactions||[]).length;nmov=(d.transactions||[]).length;parts.fotos+=f;parts.mov+=t;parts.outros+=n-f-t}catch(e){parts.outros+=n}}
  else if(/jarvis/i.test(k))parts.jarvis+=n;else parts.outros+=n}}catch(e){}
 return{tot:tot,pct:Math.min(100,Math.round(tot/LIM*100)),parts:parts,nmov:nmov}}
function color(p){return p>=85?'linear-gradient(90deg,#f59e0b,#ef4444)':p>=60?'linear-gradient(90deg,#fbbf24,#f59e0b)':'linear-gradient(90deg,#22c55e,#4ade80)'}
function render(el){var m=measure(),p=m.pct,top=Object.entries(m.parts).sort(function(a,b){return b[1]-a[1]})[0];
 el.innerHTML='<section class="ffsto"><div class="ffsto-h"><strong>Espaço de armazenamento</strong><small>'+mb(m.tot)+' de ~5 MB</small></div>'+
 '<div class="ffsto-bar" role="progressbar" aria-valuenow="'+p+'" aria-valuemin="0" aria-valuemax="100" aria-label="Espaço usado"><i style="width:'+Math.max(p,2)+'%;background:'+color(p)+'"></i></div>'+
 '<small class="ffsto-st '+(p>=85?'r':p>=60?'a':'g')+'">'+p+'% usado'+(p>=85?' — está quase cheio':p>=60?' — convém ir vigiando':' — tudo bem')+'</small>'+
 '<div class="ffsto-l"><div><span>📷 Fotos dos animais</span><b>'+mb(m.parts.fotos)+'</b></div><div><span>💶 Movimentos ('+m.nmov.toLocaleString('pt-PT')+')</span><b>'+mb(m.parts.mov)+'</b></div><div><span>🤖 Conversa do Jarvis</span><b>'+mb(m.parts.jarvis)+'</b></div><div><span>⚙️ Definições e outros</span><b>'+mb(m.parts.outros)+'</b></div></div>'+
 (p>=60?'<p class="ffsto-tip">'+(top[0]==='fotos'?'As fotos são o que mais ocupa. Trocar uma foto por outra mais pequena liberta espaço.':top[0]==='jarvis'?'A conversa do Jarvis ocupa bastante. Limpá-la (🗑️ no Jarvis) liberta espaço.':'Faz um backup e guarda-o fora do telemóvel.')+'</p>':'')+'</section>'}
var hosts=[];function mount(el){hosts.push(el);render(el)}
function refresh(){hosts=hosts.filter(function(h){return h.isConnected});hosts.forEach(render)}
function banner(kind){var old=document.getElementById('ffsto-bn');if(old)old.remove();var el=document.createElement('div');el.id='ffsto-bn';el.className=kind;el.setAttribute('role','alert');
 var m=measure();el.innerHTML=kind==='err'?'<b>⚠️ As últimas alterações não foram guardadas</b><span>O armazenamento da app neste telemóvel está cheio. Faz um backup e liberta espaço.</span><div><button class="bk">Fazer backup</button><button class="see">Ver o que ocupa</button></div>':'<b>💾 Armazenamento a '+m.pct+'%</b><span>Está quase cheio. Convém libertar espaço antes que as alterações deixem de ser guardadas.</span><div><button class="ok">Ok</button><button class="see">Ver o que ocupa</button></div>';
 document.body.appendChild(el);
 var bk=el.querySelector('.bk');if(bk)bk.onclick=function(){window.ffBk&&window.ffBk.download()};
 var ok=el.querySelector('.ok');if(ok)ok.onclick=function(){el.remove()};
 el.querySelector('.see').onclick=function(){if(kind!=='err')el.remove();window.ffOpenBackup&&window.ffOpenBackup()}}
window.ffSaveFail=function(){if(failing)return;failing=true;banner('err')};
window.ffSaveOk=function(){if(!failing)return;failing=false;var b=document.getElementById('ffsto-bn');if(b&&b.className==='err')b.remove();refresh()};
function daily(){var m=measure();if(m.pct<85)return;var t=new Date().toDateString();try{if(localStorage.getItem(WK)===t)return;localStorage.setItem(WK,t)}catch(e){}if(!failing)banner('warn')}
var tries=0,iv=setInterval(function(){if(window.ffBk||++tries>20){clearInterval(iv);setTimeout(daily,3500)}},500);
window.ffStorage={mount:mount,refresh:refresh,measure:measure};
})();
