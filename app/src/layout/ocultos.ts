import { useLayoutEffect } from 'react';

// Valores ocultos (o olho no topo): os «••••••» ficam desfocados, sem nunca pôr o valor real na página.
const SO_OCULTO = /^[\s+\-−→€]*••••••[\s€]*$/;

function marcar() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement;
    if (el && !el.classList.contains('ffoculto') && el.childNodes.length === 1 && SO_OCULTO.test(n.nodeValue || '')) el.classList.add('ffoculto');
  }
  document.querySelectorAll('.ffoculto').forEach((el) => { if (!SO_OCULTO.test(el.textContent || '')) el.classList.remove('ffoculto'); });
}

export function useOcultosDesfocados(ocultos: boolean) {
  useLayoutEffect(() => {
    if (!ocultos) { document.querySelectorAll('.ffoculto').forEach((el) => el.classList.remove('ffoculto')); return; }
    marcar();
    let pendente = 0;
    const obs = new MutationObserver(() => {
      if (pendente) return;
      pendente = requestAnimationFrame(() => { pendente = 0; marcar(); });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { obs.disconnect(); cancelAnimationFrame(pendente); };
  }, [ocultos]);
}
