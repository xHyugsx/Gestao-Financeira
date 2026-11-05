import { useEffect, useRef } from 'react';
import { montarBloqueio } from './ecraBloqueio';

/** Ecrã de bloqueio (substitui a app enquanto não se introduz o PIN ou a impressão digital). */
export function EcraBloqueio({ hash, imagem = null, aoDesbloquear, aoApagarDados }: { hash: string; imagem?: string | null; aoDesbloquear: () => void; aoApagarDados?: () => void }) {
  const anfitriao = useRef<HTMLDivElement>(null);
  const desbloquear = useRef(aoDesbloquear);
  desbloquear.current = aoDesbloquear;
  const apagar = useRef(aoApagarDados);
  apagar.current = aoApagarDados;
  useEffect(() => montarBloqueio(anfitriao.current!, { hash, imagem, aoDesbloquear: () => desbloquear.current(), aoApagarDados: () => apagar.current?.() }), [hash, imagem]);
  return <div id="ff-lock-host" ref={anfitriao} />;
}
