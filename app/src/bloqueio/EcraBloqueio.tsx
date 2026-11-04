import { useEffect, useRef } from 'react';
import { montarBloqueio } from './ecraBloqueio';

/** Ecrã de bloqueio (substitui a app enquanto não se introduz o PIN ou a impressão digital). */
export function EcraBloqueio({ hash, imagem = null, aoDesbloquear }: { hash: string; imagem?: string | null; aoDesbloquear: () => void }) {
  const anfitriao = useRef<HTMLDivElement>(null);
  const desbloquear = useRef(aoDesbloquear);
  desbloquear.current = aoDesbloquear;
  useEffect(() => montarBloqueio(anfitriao.current!, { hash, imagem, aoDesbloquear: () => desbloquear.current() }), [hash, imagem]);
  return <div id="ff-lock-host" ref={anfitriao} />;
}
