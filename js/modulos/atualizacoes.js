(function(){if(!('serviceWorker' in navigator))return;var CACHE='financas-app',ignored={};
function prompt(onConfirm){if(document.getElementById('pwa-update-overlay'))return;var o=document.createElement('div');o.id='pwa-update-overlay';o.innerHTML='<div class="pwa-update-card"><h3>Nova versão disponível</h3><p>Há uma atualização da app pronta a instalar. Queres atualizar agora?</p><div class="pwa-update-actions"><button class="pwa-update-btn dismiss" id="pwa-update-dismiss">Ignorar</button><button class="pwa-update-btn confirm" id="pwa-update-confirm">Atualizar</button></div></div>';document.body.appendChild(o);
document.getElementById('pwa-update-dismiss').onclick=function(){o.remove()};
document.getElementById('pwa-update-confirm').onclick=function(){this.disabled=true;this.textContent='A atualizar…';onConfirm()}}
function checkVersion(){var c=navigator.serviceWorker.controller;if(!c||!window.caches)return;
caches.open(CACHE).then(function(cache){return cache.match('./version.json')}).then(function(r){return r?r.json():null}).then(function(cur){if(!cur)return;
return fetch('./version.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(nv){if(!nv||nv.version===cur.version||ignored[nv.version])return;
prompt(function(){var ch=new MessageChannel();ch.port1.onmessage=function(){location.reload()};navigator.serviceWorker.controller.postMessage({type:'REFRESH_ALL'},[ch.port2]);setTimeout(function(){location.reload()},20000)});
document.getElementById('pwa-update-dismiss').addEventListener('click',function(){ignored[nv.version]=1})})}).catch(function(){})}
window.addEventListener('load',function(){navigator.serviceWorker.register('./service-worker.js').then(function(reg){
if(reg.waiting&&navigator.serviceWorker.controller)prompt(function(){reg.waiting.postMessage({type:'SKIP_WAITING'})});
reg.addEventListener('updatefound',function(){var w=reg.installing;if(!w)return;w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller)prompt(function(){w.postMessage({type:'SKIP_WAITING'})})})});
checkVersion();document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){reg.update().catch(function(){});checkVersion()}})});
var refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(refreshing)return;refreshing=true;location.reload()})})})();
