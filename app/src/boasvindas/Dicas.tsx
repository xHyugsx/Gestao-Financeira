// Visita rápida (v2.58.0): três dicas por cima da app, com o elemento em destaque (o «+», o robô e o «Mais»).
import { useEffect, useLayoutEffect, useState } from 'react';

const DICAS = [
  { alvo: '.ffplus', titulo: 'Registar', texto: 'Toca no + para uma despesa, receita ou transferência.' },
  { alvo: '.head-jarvis', titulo: 'Jarvis e Definições', texto: 'O robô abre o Jarvis, para perguntas, e as Definições (família, contas, backup, aparência).' },
  { alvo: '.ffnav-more', titulo: 'Mais páginas', texto: 'Em «Mais» estão as Categorias, o Resumo (recorrentes, salários, despesas anuais) e as outras páginas.' },
];

export function Dicas({ fechar }: { fechar: () => void }) {
  const [i, setI] = useState(0);
  const [r, setR] = useState<DOMRect | null>(null);
  const dica = DICAS[i]!;
  useLayoutEffect(() => {
    const medir = () => setR(document.querySelector(dica.alvo)?.getBoundingClientRect() ?? null);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [dica.alvo]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [fechar]);
  const ultimo = i === DICAS.length - 1;
  const emBaixo = r ? r.top > window.innerHeight / 2 : true;
  const folga = 8;
  return (
    <div className="ffdicas" role="dialog" aria-modal="true" aria-label={`Dica ${i + 1} de ${DICAS.length}: ${dica.titulo}`}>
      {r ? (
        <div
          className="ffdicas-luz" aria-hidden="true"
          style={{ left: r.left - folga, top: r.top - folga, width: r.width + folga * 2, height: r.height + folga * 2, borderRadius: Math.min(r.width, r.height) / 2 + folga }}
        />
      ) : <div className="ffdicas-fundo" aria-hidden="true" />}
      <div
        className={`ffdicas-bolha ${emBaixo ? 'cima' : 'baixo'}`}
        style={r ? (emBaixo ? { bottom: window.innerHeight - r.top + 18 } : { top: r.bottom + 18 }) : { top: '40%' }}
      >
        <strong>{dica.titulo}</strong>
        <p>{dica.texto}</p>
        <div className="ffdicas-pe">
          <span>{i + 1} de {DICAS.length}{ultimo ? '' : ' · '}{ultimo ? null : <button type="button" onClick={fechar}>Saltar</button>}</span>
          <button type="button" className="ffdicas-seguinte" onClick={() => (ultimo ? fechar() : setI(i + 1))}>{ultimo ? 'Começar a usar' : 'Seguinte'}</button>
        </div>
        {r ? <i className="ffdicas-seta" aria-hidden="true" style={{ left: Math.min(Math.max(r.left + r.width / 2 - 25, 18), window.innerWidth - 50) }} /> : null}
      </div>
    </div>
  );
}
