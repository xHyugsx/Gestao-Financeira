// Só na /v2/: isola os dados da versão de teste. Todas as chaves `financas-familiar:*`
// passam a ser lidas e gravadas como `financas-v2:*`; as chaves reais ficam invisíveis
// e intocáveis. O sal do PIN não é uma chave do localStorage, por isso não muda.
(function () {
  var REAL = 'financas-familiar:', V2 = 'financas-v2:';
  var P = Storage.prototype, orig = {
    getItem: P.getItem, setItem: P.setItem, removeItem: P.removeItem, key: P.key, clear: P.clear,
    length: Object.getOwnPropertyDescriptor(P, 'length').get
  };
  var ls = window.localStorage;
  function local(s) { return s === ls; }
  function paraV2(k) { k = String(k); return k.indexOf(REAL) === 0 ? V2 + k.slice(REAL.length) : k; }
  function paraReal(k) { return k.indexOf(V2) === 0 ? REAL + k.slice(V2.length) : k; }
  function visiveis(s) {
    var l = [], n = orig.length.call(s);
    for (var i = 0; i < n; i++) { var k = orig.key.call(s, i); if (k.indexOf(REAL) !== 0) l.push(k); }
    return l;
  }
  P.getItem = function (k) { return orig.getItem.call(this, local(this) ? paraV2(k) : k); };
  P.setItem = function (k, v) { return orig.setItem.call(this, local(this) ? paraV2(k) : k, v); };
  P.removeItem = function (k) { return orig.removeItem.call(this, local(this) ? paraV2(k) : k); };
  P.key = function (i) {
    if (!local(this)) return orig.key.call(this, i);
    var k = visiveis(this)[i];
    return k === undefined ? null : paraReal(k);
  };
  P.clear = function () {
    if (!local(this)) return orig.clear.call(this);
    visiveis(this).forEach(function (k) { if (k.indexOf(V2) === 0) orig.removeItem.call(this, k); }, this);
  };
  Object.defineProperty(P, 'length', {
    configurable: true,
    get: function () { return local(this) ? visiveis(this).length : orig.length.call(this); }
  });

  // Acesso direto (sem tradução) para o menu da V2 copiar e apagar dados.
  window.ffV2 = {
    REAL: REAL, V2: V2,
    chaves: function () { var l = [], n = orig.length.call(ls); for (var i = 0; i < n; i++) l.push(orig.key.call(ls, i)); return l; },
    ler: function (k) { return orig.getItem.call(ls, k); },
    gravar: function (k, v) { orig.setItem.call(ls, k, v); },
    apagar: function (k) { orig.removeItem.call(ls, k); }
  };
})();
