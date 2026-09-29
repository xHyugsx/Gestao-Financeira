import { useLayoutEffect, useRef } from 'react';
import { MOEDA } from '../ui/formatos';

const DURACAO = 700;
const EXCLUIR = '.transaction-list,.transactions-panel,.calendar-movements,.calendar-grid,[role=dialog]';

/**
 * Os valores em euros sobem de 0 até ao valor final quando a página ou o mês mudam (como na app atual).
 * Não anima com os valores ocultos nem com `prefers-reduced-motion`.
 */
export function useAnimacaoNumeros(chave: string, seletor: string, desligado: boolean) {
  const estado = useRef({ chave: '', t0: 0 });
  useLayoutEffect(() => {
    if (desligado || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let st = estado.current;
    if (st.chave !== chave) estado.current = st = { chave, t0: performance.now() };
    else if (performance.now() - st.t0 >= DURACAO) return;
    const raiz = document.querySelector(seletor);
    if (!raiz) return;
    const itens = [...raiz.querySelectorAll('strong')]
      .filter((el) => !el.closest(EXCLUIR) && el.childNodes.length === 1 && el.firstChild?.nodeType === 3)
      .map((el) => {
        const no = el.firstChild as Text, texto = no.nodeValue || '';
        const m = texto.match(/^([-−]?)([\d\s  .]+,\d{2})\s?€$/);
        if (!m) return null;
        const v = Number(m[2]!.replace(/[\s  .]/g, '').replace(',', '.')) * (m[1] ? -1 : 1);
        return v ? { no, texto, v, ultimo: texto, morto: false } : null;
      })
      .filter((x) => x !== null);
    if (!itens.length) return;
    let raf = 0;
    const pintar = (agora: number) => {
      const k = Math.min(1, Math.max(0, (agora - st.t0) / DURACAO)), e = 1 - (1 - k) ** 3;
      let vivos = 0;
      for (const it of itens) {
        if (it.morto) continue;
        if (it.no.nodeValue !== it.ultimo) { it.morto = true; continue; }
        const s = k < 1 ? MOEDA.format(it.v * e) : it.texto;
        it.no.nodeValue = s; it.ultimo = s; vivos++;
      }
      if (k < 1 && vivos) raf = requestAnimationFrame(pintar);
    };
    pintar(performance.now());
    return () => {
      cancelAnimationFrame(raf);
      for (const it of itens) if (!it.morto && it.no.nodeValue === it.ultimo) it.no.nodeValue = it.texto;
    };
  });
}
