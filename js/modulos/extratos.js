(function(){
var RK='financas-familiar:import-rules',UK='financas-familiar:last-import';
var MF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'],MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function nz(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim()}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function eur(v){return v.toLocaleString('pt-PT',{style:'currency',currency:'EUR'})}
function rules(){try{return JSON.parse(localStorage.getItem(RK)||'{}')||{}}catch(e){return{}}}
function saveRules(r){try{localStorage.setItem(RK,JSON.stringify(r))}catch(e){}}
function num(s){if(typeof s==='number')return s;s=String(s==null?'':s).replace(/[€\s]|EUR/gi,'').replace(/\u2212/g,'-');if(!s)return NaN;
 if(/,\d{1,2}$/.test(s))s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');else s=s.replace(/,/g,'');return parseFloat(s)}
function date(s){if(typeof s==='number'&&s>20000&&s<80000){var d=new Date(Math.round((s-25569)*864e5));return d.toISOString().slice(0,10)}
 s=String(s==null?'':s).trim();var m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[1]+'-'+m[2]+'-'+m[3]:null}
/* ---- leitura XLSX sem dependências ---- */
async function inflate(bytes){var ds=new DecompressionStream('deflate-raw');var st=new Blob([bytes]).stream().pipeThrough(ds);return new Uint8Array(await new Response(st).arrayBuffer())}
async function unzip(buf){var v=new DataView(buf),u8=new Uint8Array(buf),e=-1;for(var i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--){if(v.getUint32(i,true)===0x06054b50){e=i;break}}if(e<0)throw new Error('zip');
 var n=v.getUint16(e+10,true),off=v.getUint32(e+16,true),files={},td=new TextDecoder();
 for(var k=0;k<n;k++){var meth=v.getUint16(off+10,true),cs=v.getUint32(off+20,true),fl=v.getUint16(off+28,true),xl=v.getUint16(off+30,true),cl=v.getUint16(off+32,true),lo=v.getUint32(off+42,true),name=td.decode(u8.subarray(off+46,off+46+fl));
  files[name]={meth:meth,cs:cs,lo:lo};off+=46+fl+xl+cl}
 return{names:Object.keys(files),get:async function(nm){var f=files[nm];if(!f)return null;var l=f.lo,fl=v.getUint16(l+26,true),xl=v.getUint16(l+28,true),data=u8.subarray(l+30+fl+xl,l+30+fl+xl+f.cs);return td.decode(f.meth===8?await inflate(data):data)}}}
function colIdx(ref){var m=String(ref).match(/^[A-Z]+/);if(!m)return 0;var s=m[0],n=0;for(var i=0;i<s.length;i++)n=n*26+(s.charCodeAt(i)-64);return n-1}
async function readXlsx(buf){var z=await unzip(buf),P=new DOMParser(),ss=[],x=await z.get('xl/sharedStrings.xml');
 if(x){var d=P.parseFromString(x,'application/xml');[].forEach.call(d.getElementsByTagName('si'),function(si){var t='';[].forEach.call(si.getElementsByTagName('t'),function(n){t+=n.textContent});ss.push(t)})}
 var sheet=z.names.filter(function(n){return/^xl\/worksheets\/sheet\d+\.xml$/.test(n)}).sort()[0];if(!sheet)throw new Error('sheet');
 var d2=P.parseFromString(await z.get(sheet),'application/xml'),rows=[];
 [].forEach.call(d2.getElementsByTagName('row'),function(r){var row=[];[].forEach.call(r.getElementsByTagName('c'),function(c){var t=c.getAttribute('t'),vv=c.getElementsByTagName('v')[0],val='';
  if(t==='s')val=ss[+(vv&&vv.textContent)]||'';else if(t==='inlineStr'){var is=c.getElementsByTagName('t')[0];val=is?is.textContent:''}else val=vv?vv.textContent:'';row[colIdx(c.getAttribute('r'))]=val});rows.push(row)});return rows}
function loadSheetJS(){if(window.XLSX)return Promise.resolve(window.XLSX);return new Promise(function(ok,ko){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=function(){ok(window.XLSX)};s.onerror=ko;document.head.appendChild(s)})}
function readCsv(text){var first=text.split(/\r?\n/).find(function(l){return l.trim()})||'',dl=(first.split(';').length>=first.split(',').length)?';':',',rows=[],row=[],cur='',q=false;
 for(var i=0;i<text.length;i++){var ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===dl){row.push(cur);cur=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}else cur+=ch}
 if(cur||row.length){row.push(cur);rows.push(row)}return rows}
function fields(rows){var packed=rows.filter(function(r){return r&&r[0]&&String(r[0]).split(';').length>=4}).length>=3;
 return rows.map(function(r){r=(r||[]).map(function(c){return c==null?'':String(c)});if(packed){var cells=r.filter(function(c){return c!==''});return cells.length?cells.join(',').split(';'):[]}return r})}
function parse(F){var hi=-1,ci={};for(var i=0;i<F.length&&i<60;i++){var h=F[i].map(nz),d=h.findIndex(function(x){return/^DATA MOV|^DATA LANC|COMPLETED DATE|^DATA$/.test(x)});if(d<0)d=h.findIndex(function(x){return/DATA|DATE/.test(x)&&!/VALOR/.test(x)});
  var ds=h.findIndex(function(x){return/DESCRI/.test(x)}),am=h.findIndex(function(x){return/MONTANTE|^VALOR$|IMPORTANCIA|^AMOUNT$|^VALOR \(/.test(x)&&!/SALDO|BALANCE/.test(x)}),db=h.findIndex(function(x){return/DEBITO/.test(x)}),cr=h.findIndex(function(x){return/CREDITO/.test(x)});
  if(d>=0&&ds>=0&&(am>=0||db>=0&&cr>=0)){hi=i;ci={d:d,ds:ds,am:am,db:db,cr:cr,fee:h.findIndex(function(x){return/^FEE$|COMISS/.test(x)}),st:h.findIndex(function(x){return/^STATE$|^ESTADO$/.test(x)})};break}}
 if(hi<0)return null;var lines=[],top=F.slice(0,hi).map(function(r){return r.join(';')}).join('\n'),all=nz(top+' '+F[hi].join(' '));
 for(var j=hi+1;j<F.length;j++){var r=F[j];if(!r||!r.length)continue;var dt=date(r[ci.d]);if(!dt)continue;if(ci.st>=0&&r[ci.st]&&!/COMPLETED|CONCLU/.test(nz(r[ci.st])))continue;
  var a=ci.am>=0?num(r[ci.am]):(num(r[ci.cr])||0)-Math.abs(num(r[ci.db])||0);if(ci.fee>=0&&num(r[ci.fee]))a-=Math.abs(num(r[ci.fee]));if(!isFinite(a)||!a)continue;lines.push({date:dt,raw:String(r[ci.ds]||'').trim(),amount:Math.round(a*100)/100})}
 if(lines.length<3)return null;var bal=null,bm=top.match(/saldo contabil[ií]stico;\s*([-\d.,]+)/i);if(bm)bal=num(bm[1]);
 var ds2=lines.map(function(l){return l.date}).sort();return{bank:/CONSULTAR SALDOS E MOVIMENTOS|CAIXA GERAL|\bCGD\b/.test(all)?'CGD':/PRODUCT|REVOLUT/.test(all)?'Revolut':'banco',from:ds2[0],to:ds2[ds2.length-1],balance:bal,lines:lines}}
/* ---- classificação ---- */
var B=[[/PRESTACAO MOTA/,'ign'],[/XTB|^INVESTIMENTOS$/,'exp',['Investimentos'],1],[/^TFI (HUGO NUNES|MARTA PEREIRA)/,'ask'],[/NAVIGATOR/,'sal','Hugo'],[/IRMADONA/,'sal','Marta'],
 [/CAR WAL CRT DEB REVOL/,'tr'],[/AUCHAN ENERGY|GALP|REPSOL|\bBP\b|PRIO|CEPSA|PA A8/,'exp',['Combustível','Transportes']],
 [/^A\d{1,2}$|VIA VERDE|PORTAG|UBER|BOLT|RYANAIR|\bTAP\b/,'exp',['Transportes']],
 [/MERCADONA|CONTINENTE|AUCHAN|ALDI|LIDL|PINGO DOCE|LECLERC|INTERMARCHE|MINIPRECO|C\.DEB MERCADO|EUPFEIJ/,'exp',['Alimentação']],
 [/\bREST\b|RESTAURANTE|MCDONALDS|^BK\d|BURGER|PIZZA|SUSHI|CAFE|\bBAR\b|COCKTAIL|PADARIA|PASTELARIA|GELATARIA|CHURRASQ|TAPAS|JET 7|STARBUC|MY BREA|MARISQUEIRA|SEASIDE|CORETO|MOINHO|BULE DE CHA|SPASSO|FITONIA|BAGGA|ROMANTIC|LE JARDIN/,'exp',['Restauração','Restaurantes','Lazer','Alimentação']],
 [/ONVET|VETERI/,'exp',['Veterinário','Animais']],[/SEGUROS|FIDELIDADE|ASISA|ZURICH|GENERALI|DOMESTIC AND GENERAL/,'exp',['Seguros']],
 [/COBRANCA PRESTACAO|CONDOMINIO/,'exp',['Habitação']],[/CETELEM|BNP/,'exp',['Créditos','Prestações']],[/MANUT CONTA|COMISS|IMPOSTO/,'exp',['Comissões']],
 [/PRIMARK|PULL BEAR|TEZENIS|LEFTIES|NYX|MY SHOPPING|MUNDO|LOJA|CHEN|FLEUROP|NOTE|PAPELARIA|CENTROXOGO|PIXEL|THEFLOW|FOZTROPIC|VILANOVA|C CLASSIC|PAYPAYUE/,'exp',['Compras','Vestuário','Lazer']],
 [/CINEMAS|NINTENDO|GINASIO|ADVENTURE/,'exp',['Lazer']],[/^ATM/,'exp',['Outros']]];
function clean(d){if(/^TRF MBWAY/i.test(d))return'MB Way '+d.trim().split(/\s+/).pop();var s=d.trim().replace(/^(COMPRAS? C\.DEB|COMPRA|TRF|TFI|CR VCHER CRT DB)\s+/i,'');
 return s.split(/\s+/).map(function(w){return/^[A-Z]\d+$/.test(w)||w.length<=2&&w===w.toUpperCase()?w:w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()}).join(' ')}
function pick(opts,cats){for(var i=0;i<opts.length;i++)if(cats.indexOf(opts[i])>=0)return opts[i];return opts.indexOf('Investimentos')>=0?'Investimentos':'Outros'}
function classify(st,api){var d=api.get(),R=rules(),hist={},seen={},cats=d.cats.slice(),out=[];if(cats.indexOf('Outros')<0)cats.push('Outros');
 d.tx.forEach(function(t){if(t.movementType!=='expense'&&t.movementType!=='income')return;var k=nz(t.title);if(!hist[k])hist[k]=String(t.detail||'').split(' · ').pop()});
 var keys={};d.tx.forEach(function(t){if(t.importKey)keys[t.importKey]=1});
 st.lines.forEach(function(l,i){var N=nz(l.raw),sq=(seen[l.date+N+l.amount]=(seen[l.date+N+l.amount]||0)+1),key=l.date+'|'+N+'|'+l.amount.toFixed(2)+'|'+sq;
  if(keys[key])return;var o={i:i,d:l.date,raw:l.raw,t:clean(l.raw),a:l.amount,k:null,c:null,p:null,rec:false,tag:'',key:key,N:N};
  for(var b=0;b<B.length;b++){if(B[b][0].test(N)){o.k=B[b][1];if(o.k==='sal')o.p=B[b][2];if(o.k==='exp')o.c=pick(B[b][2],cats);if(B[b][3])o.rec=true;break}}
  var u=R[N];if(u){if(u.k)o.k=u.k;if(u.c)o.c=u.c;if(u.ch)o.ch=u.ch}
  if(o.k==='exp'&&l.amount>0)o.k=null;
  if(!o.k){o.k=l.amount>0?'inc':'exp'}
  if(o.k==='exp'&&(!o.c||o.c==='Outros')&&hist[nz(o.t)])o.c=hist[nz(o.t)];if(o.k==='exp'&&!o.c)o.c='Outros';
  if(o.k==='inc'&&!o.c)o.c=/^TFI|GENERALI|VCHER|INSTITUTO/.test(N)?'Reembolsos':'Outras receitas';
  if(o.k==='inc'&&d.inc.indexOf(o.c)<0)o.c='Outras receitas';
  o.on=o.k==='exp'||o.k==='inc'||o.k==='sal'||(o.k==='ask'&&o.ch&&o.ch!=='Ignorar');
  if(o.k==='sal'){var y=o.d.slice(0,4),mo=+o.d.slice(5,7)-1;if(((d.sal[y]||{})[o.p]||[])[mo]>0){o.on=false;o.tag='Já registado'}}
  if((o.k==='exp'||o.k==='inc')&&d.tx.some(function(t){return!t.importKey&&Math.abs(Math.abs(t.amount)-Math.abs(o.a))<.005&&(t.amount<0)===(o.a<0)&&Math.abs(new Date(t.date)-new Date(o.d))<=2*864e5})){o.on=false;o.tag='Possível duplicado'}
  out.push(o)});
 return{items:out,cats:cats,skipped:st.lines.length-out.length}}
/* ---- interface de revisão ---- */
var S=null;
var ASK=['Transferência entre contas','Carregamento de conta','Poupança','Receita','Ignorar'],TABS=[['ask','Por confirmar'],['all','Todos'],['exp','Despesas'],['inc','Receitas'],['sal','Salários'],['tr','Transferências'],['rev','Por rever'],['ign','Ignorados']];
function fmtD(d){return +d.slice(8)+' '+MS[+d.slice(5,7)-1]}
function open(st){var api=window.ffImpApi;if(!api)return;var c=classify(st,api),d=api.get();S={st:st,items:c.items,cats:c.cats,inc:d.inc,acc:d.acc,skipped:c.skipped,tab:c.items.some(function(o){return o.k==='ask'&&!o.ch})?'ask':'all',accId:'principal',setBal:false,remember:true};render()}
function sumTxt(){var I=S.items,c=function(k){return I.filter(function(o){return o.k===k}).length},sal=I.filter(function(o){return o.k==='sal'}),per=Array.from(new Set(sal.map(function(o){return o.p}))).length,mon=Array.from(new Set(sal.map(function(o){return o.d.slice(0,7)}))).length;
 return I.length+' movimentos · '+c('exp')+' despesas · '+c('inc')+' receitas · '+(sal.length?per+' '+(per===1?'salário':'salários')+' × '+mon+' '+(mon===1?'mês':'meses'):'0 salários')+' · '+c('tr')+' transferências'+(c('ign')?' · '+c('ign')+' ignorados':'')+(S.skipped?' · '+S.skipped+' já importados antes':'')}
function render(){var root=document.getElementById('ffst');if(!root){root=document.createElement('div');root.id='ffst';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Importar extrato');document.body.appendChild(root);requestAnimationFrame(function(){root.classList.add('in')})}
 var I=S.items,pend=I.filter(function(o){return o.k==='ask'&&!o.ch}).length,on=I.filter(function(o){return o.on}),acc=S.acc.find(function(a){return a.id===S.accId})||S.acc[0];
 var L=I.filter(function(o){return S.tab==='all'||(S.tab==='rev'?o.k==='exp'&&o.c==='Outros':o.k===S.tab)}),h='',cm='';
 L.forEach(function(o){var mk=o.d.slice(0,7);if(mk!==cm){cm=mk;h+='<div class="ffst-mo">'+MF[+o.d.slice(5,7)-1]+' '+o.d.slice(0,4)+'</div>'}
  var sub=o.k==='ign'?'<span class="ffst-tag g">Ignorado · não é registado</span>':o.k==='ask'?'<select data-a="'+o.i+'" class="'+(o.ch?'':'warn')+'"><option value="">O que é isto? Escolhe…</option>'+ASK.map(function(x){return'<option'+(x===o.ch?' selected':'')+'>'+x+'</option>'}).join('')+'</select>':o.k==='sal'?'<span class="ffst-tag s">Salário '+(o.p==='Marta'?'da':'do')+' '+o.p+' → '+MF[+o.d.slice(5,7)-1]+'</span>':o.k==='tr'?'<span class="ffst-tag">Transferência · não conta como gasto</span>':'<select data-i="'+o.i+'">'+(o.k==='inc'?S.inc:S.cats.concat(S.cats.indexOf(o.c)<0?[o.c]:[])).map(function(x){return'<option'+(x===o.c?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select>'+(o.rec?' <span class="ffst-tag b">Recorrente</span>':'');
  if(o.tag)sub+=' <span class="ffst-tag">'+o.tag+'</span>';
  h+='<div class="ffst-row'+(o.on?'':' off')+(o.k==='ask'&&!o.ch?' ask':'')+'"><input type="checkbox" data-c="'+o.i+'"'+(o.on?' checked':'')+(o.k==='ign'||o.k==='ask'?' disabled':'')+' aria-label="Importar '+esc(o.t)+'"><div class="ffst-mid"><div class="ffst-tt">'+esc(o.t)+'</div><div class="ffst-sub">'+fmtD(o.d)+' · '+sub+'</div></div><div class="ffst-am '+(o.a<0?'n':'p')+'">'+eur(o.a)+'</div></div>'});
 root.innerHTML='<div class="ffst-hd"><div class="ffst-t"><h2>Importar extrato · '+esc(S.st.bank)+'</h2><button class="ffst-x" aria-label="Fechar">✕</button></div><p>'+sumTxt()+'</p>'+
  '<div class="ffst-opt"><label>Conta na app <select class="ffst-acc">'+S.acc.map(function(a){return'<option value="'+esc(a.id)+'"'+(a.id===S.accId?' selected':'')+'>'+esc(a.name)+'</option>'}).join('')+'</select></label>'+
  (S.st.balance!=null?'<label><input type="checkbox" class="ffst-bal"'+(S.setBal?' checked':'')+'> Acertar o saldo de '+esc(acc.name)+' para <b>'+eur(S.st.balance)+'</b> (saldo do extrato)</label>':'')+
  '<label><input type="checkbox" class="ffst-rem"'+(S.remember?' checked':'')+'> Lembrar as minhas escolhas nos próximos extratos</label></div>'+
  '<div class="ffst-tabs">'+TABS.filter(function(t){return t[0]==='all'||t[0]==='rev'||I.some(function(o){return o.k===t[0]})}).map(function(t){return'<button data-t="'+t[0]+'" class="'+(t[0]===S.tab?'on':'')+'">'+(t[0]==='ask'?(pend?'Por confirmar ('+pend+')':'Por confirmar ✓'):t[1])+'</button>'}).join('')+'</div></div>'+
  '<div class="ffst-list">'+(h||'<p class="ffst-empty">Nada nesta vista.</p>')+'</div>'+
  '<div class="ffst-ft"><small>'+on.filter(function(o){return o.k==='exp'}).length+' despesas ('+eur(on.filter(function(o){return o.k==='exp'}).reduce(function(s,o){return s-o.a},0))+') · '+on.filter(function(o){return o.k==='inc'||o.ch==='Receita'}).length+' receitas · '+on.filter(function(o){return o.k==='sal'}).length+' salários</small><button class="ffst-go"'+(pend||!on.length?' disabled':'')+'>'+(pend?'Falta confirmar '+pend+' '+(pend===1?'movimento':'movimentos'):'Importar '+on.length+' movimentos')+'</button></div>';
 var list=root.querySelector('.ffst-list'),sc=S.scroll||0;list.scrollTop=sc;list.addEventListener('scroll',function(){S.scroll=list.scrollTop});
 root.querySelector('.ffst-x').onclick=close;
 root.querySelector('.ffst-acc').onchange=function(e){S.accId=e.target.value;render()};
 var bb=root.querySelector('.ffst-bal');if(bb)bb.onchange=function(e){S.setBal=e.target.checked};
 root.querySelector('.ffst-rem').onchange=function(e){S.remember=e.target.checked};
 root.querySelector('.ffst-tabs').onclick=function(e){var b=e.target.closest('[data-t]');if(b){S.tab=b.dataset.t;S.scroll=0;render()}};
 list.onchange=function(e){var t=e.target,o;if(t.dataset.a!=null){o=I.find(function(x){return x.i===+t.dataset.a});o.ch=t.value;o.on=!!o.ch&&o.ch!=='Ignorar';render()}else if(t.dataset.c!=null){o=I.find(function(x){return x.i===+t.dataset.c});o.on=t.checked;render()}else if(t.dataset.i!=null){o=I.find(function(x){return x.i===+t.dataset.i});o.c=t.value;o.edited=true;render()}};
 root.querySelector('.ffst-go').onclick=doImport}
function close(){var r=document.getElementById('ffst');if(!r)return;r.classList.remove('in');setTimeout(function(){r.remove()},250)}
function doImport(){var api=window.ffImpApi,d=api.get(),I=S.items,on=I.filter(function(o){return o.on}),batch='imp'+Date.now(),acc=S.accId,tx=[],sal=[],newCats=[],R=rules(),base=Date.now();
 on.forEach(function(o,n){var day=+o.d.slice(8),mon=MF[+o.d.slice(5,7)-1],common={id:base+n,date:o.d,affectsBalance:false,importKey:o.key,importBatch:batch};
  if(o.k==='sal'){var y=o.d.slice(0,4),mo=+o.d.slice(5,7)-1;sal.push([y,o.p,mo,((d.sal[y]||{})[o.p]||[])[mo]||0,Math.abs(o.a)]);return}
  var isTr=o.k==='tr'||o.k==='ask'&&o.ch&&o.ch!=='Receita';
  if(isTr){tx.push(Object.assign({title:o.t,detail:day+' '+mon+' · Transferência',amount:0,kind:'transfer',movementType:'transfer',transferValue:Math.abs(o.a),note:o.k==='ask'?o.ch:'Transferência entre contas'},common));return}
  var inc=o.k==='inc'||o.ch==='Receita',cat=inc?(o.ch==='Receita'?'Outras receitas':o.c):o.c;if(!inc&&d.cats.indexOf(cat)<0&&newCats.indexOf(cat)<0&&cat!=='Outros')newCats.push(cat);
  tx.push(Object.assign({title:o.t,detail:day+' '+mon+' · '+cat,amount:inc?Math.abs(o.a):-Math.abs(o.a),kind:api.kind(inc?'income':'expense',cat),movementType:inc?'income':'expense'},acc!=='principal'?{account:acc}:{},o.rec?{recurring:'com'}:{},common))});
 if(S.remember)I.forEach(function(o){if(o.k==='ask'&&o.ch)R[o.N]={k:o.ch==='Ignorar'?'ign':o.ch==='Receita'?'inc':'ask',ch:o.ch};else if(o.edited&&(o.k==='exp'||o.k==='inc'))R[o.N]={k:o.k,c:o.c}});saveRules(R);
 var undo={batch:batch,sal:sal.map(function(s){return[s[0],s[1],s[2],s[3]]}),bal:null,n:tx.length};
 if(newCats.length)api.addCats(newCats);if(tx.length)api.addTx(tx);sal.forEach(function(s){api.setSal(s[0],s[1],s[2],s[4])});
 if(S.setBal&&S.st.balance!=null){var a=d.acc.find(function(x){return x.id===acc});if(a){undo.bal={id:acc,old:a.balance||0};api.setBal(acc,Math.round(((a.balance||0)+(S.st.balance-a.cur))*100)/100)}}
 try{localStorage.setItem(UK,JSON.stringify(undo))}catch(e){}
 var nm=(d.acc.find(function(x){return x.id===acc})||{}).name||'Principal';close();
 api.say('Importação concluída ✅ '+tx.length+' movimentos em '+nm+(sal.length?' · '+sal.length+' salários registados':'')+(undo.bal?' · saldo acertado para '+eur(S.st.balance):'')+'.\nOs movimentos não alteraram o saldo da conta. Escreve «desfazer importação» para anular.');S=null}
function undo(){var api=window.ffImpApi,u;try{u=JSON.parse(localStorage.getItem(UK)||'null')}catch(e){}if(!u||!api)return'Não há nenhuma importação para desfazer.';
 api.removeBatch(u.batch);(u.sal||[]).forEach(function(s){api.setSal(s[0],s[1],s[2],s[3])});if(u.bal)api.setBal(u.bal.id,u.bal.old);try{localStorage.removeItem(UK)}catch(e){}
 return'Importação anulada ↩️ Removi '+u.n+' movimentos'+((u.sal||[]).length?', repus os salários':'')+(u.bal?' e o saldo anterior':'')+'.'}
async function fromFile(fl){var ext=(fl.name.split('.').pop()||'').toLowerCase(),rows;
 if(ext==='csv'||ext==='txt')rows=readCsv(await fl.text());
 else{var buf=await fl.arrayBuffer();try{if(ext!=='xlsx')throw 0;rows=await readXlsx(buf)}catch(e){var X=await loadSheetJS();var wb=X.read(buf,{type:'array'});rows=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false})}}
 var st=parse(fields(rows));if(!st)return null;window.__ffStmtLast=st;open(st);
 var c=S?S.items:[],pend=c.filter(function(o){return o.k==='ask'&&!o.ch}).length;
 return'Encontrei um extrato '+(st.bank==='banco'?'bancário':'da '+st.bank)+' com '+st.lines.length+' movimentos ('+fmtD(st.from)+' a '+fmtD(st.to)+').\nSeparei despesas, receitas, salários e transferências e sugeri categorias'+(pend?'. Há '+pend+' '+(pend===1?'movimento':'movimentos')+' que preciso que confirmes':'')+'. Abri a revisão — nada é gravado sem carregares em «Importar».\n(Se fechares, escreve «rever extrato» para voltar.)'}
window.ffStmt={fromFile:fromFile,undo:undo,reopen:function(){if(!window.__ffStmtLast)return'Não há nenhum extrato por rever. Anexa um ficheiro com o clip 📎.';open(window.__ffStmtLast);return'Abri a revisão do extrato.'},_parse:function(rows){return parse(fields(rows))},_readXlsx:readXlsx};
})();
