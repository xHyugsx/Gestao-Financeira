// Só na /v2/: faixa "V2 · teste" e menu para copiar/apagar os dados da versão de teste.
(function () {
  var api = window.ffV2;
  if (!api) return;
  var SEM_COPIA = ['bio', 'bio-offer']; // a impressão digital regista-se de novo na V2

  var css = '#ffv2-tag{position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);left:50%;transform:translateX(-50%);z-index:99980;' +
    'padding:2px 9px;border:0;border-radius:999px;background:linear-gradient(90deg,#22d3ee,#a855f7,#ec4899);color:#fff;' +
    'font-family:inherit;font-size:10px;font-weight:600;line-height:16px;letter-spacing:.04em;opacity:.9;box-shadow:0 2px 8px rgba(0,0,0,.35)}' +
    '#ffv2-menu{position:fixed;inset:0;z-index:99985;display:flex;align-items:flex-end;justify-content:center;background:rgba(3,6,20,.6)}' +
    '#ffv2-menu .c{width:100%;max-width:440px;margin:12px;padding:18px;border-radius:20px;background:#0d1330;color:#fff;' +
    'border:1px solid rgba(167,139,250,.25);font-family:inherit}' +
    '#ffv2-menu h3{margin:0 0 6px;font-size:17px}#ffv2-menu p{margin:0 0 14px;font-size:13px;line-height:1.45;color:#c7cbe0}' +
    '#ffv2-menu button{display:block;width:100%;margin-top:8px;padding:12px;border:0;border-radius:12px;font-family:inherit;font-size:14px;font-weight:600;' +
    'background:rgba(255,255,255,.08);color:#fff}#ffv2-menu button.ok{background:linear-gradient(90deg,#22d3ee,#a855f7,#ec4899)}' +
    '#ffv2-menu button.perigo{color:#fca5a5}#ffv2-menu .v{display:block;margin-top:8px;font-size:12px;color:#8b90ad}';

  function chavesV2() { return api.chaves().filter(function (k) { return k.indexOf(api.V2) === 0; }); }
  function chavesACopiar() {
    return api.chaves().filter(function (k) {
      return k.indexOf(api.REAL) === 0 && SEM_COPIA.indexOf(k.slice(api.REAL.length)) < 0;
    });
  }

  function copiar() {
    var reais = chavesACopiar();
    if (!reais.length) return 'Não há dados na versão atual para copiar.';
    var antes = chavesV2().map(function (k) { return [k, api.ler(k)]; }), escritas = [];
    antes.forEach(function (e) { api.apagar(e[0]); });
    try {
      reais.forEach(function (k) {
        var n = api.V2 + k.slice(api.REAL.length);
        api.gravar(n, api.ler(k)); escritas.push(n);
      });
    } catch (e) {
      escritas.forEach(api.apagar);
      antes.forEach(function (e) { try { api.gravar(e[0], e[1]); } catch (x) {} });
      return 'Não há espaço suficiente no telemóvel para a cópia. Nada foi alterado.';
    }
    return null;
  }

  function apagarV2() { chavesV2().forEach(api.apagar); }

  function menu() {
    if (document.getElementById('ffv2-menu')) return;
    var o = document.createElement('div');
    o.id = 'ffv2-menu';
    o.addEventListener('click', function (e) { if (e.target === o) o.remove(); });
    document.body.appendChild(o);
    function ecra(titulo, texto, botoes) {
      o.innerHTML = '<div class="c" role="dialog" aria-modal="true" aria-label="' + titulo + '"><h3>' + titulo + '</h3><p>' + texto + '</p></div>';
      var c = o.firstChild;
      botoes.forEach(function (b) {
        var el = document.createElement('button');
        el.type = 'button'; el.textContent = b[0]; if (b[2]) el.className = b[2];
        el.onclick = b[1]; c.appendChild(el);
      });
    }
    function feito(msg) {
      ecra('Finanças V2', msg, [['Fechar', function () { o.remove(); }]]);
    }
    function inicio() {
      ecra('Finanças V2 · versão de teste',
        'Esta versão tem dados próprios e nunca altera os da app «Finanças».' +
        '<span class="v">Versão ' + (window.ffVer || '?') + '</span>',
        [['Copiar dados da versão atual', confirmarCopia, 'ok'],
         ['Apagar dados da V2', confirmarApagar, 'perigo'],
         ['Fechar', function () { o.remove(); }]]);
    }
    function confirmarCopia() {
      ecra('Copiar dados da versão atual?',
        'Os dados da V2 são substituídos por uma cópia dos da app «Finanças». A app «Finanças» não é alterada. ' +
        'A impressão digital não é copiada.',
        [['Confirmar', function () {
          var erro = copiar();
          if (erro) return feito(erro);
          ecra('Finanças V2', 'Dados copiados. A abrir…', []);
          setTimeout(function () { location.reload(); }, 600);
        }, 'ok'], ['Cancelar', inicio]]);
    }
    function confirmarApagar() {
      ecra('Apagar dados da V2?', 'Apaga só os dados desta versão de teste. A app «Finanças» não é alterada.',
        [['Confirmar', function () {
          apagarV2();
          ecra('Finanças V2', 'Dados da V2 apagados. A abrir…', []);
          setTimeout(function () { location.reload(); }, 600);
        }, 'ok perigo'], ['Cancelar', inicio]]);
    }
    inicio();
  }

  function iniciar() {
    var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    var b = document.createElement('button');
    b.id = 'ffv2-tag'; b.type = 'button'; b.textContent = 'V2 · teste';
    b.setAttribute('aria-label', 'Menu da versão de teste');
    b.onclick = menu;
    document.body.appendChild(b);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();
})();
