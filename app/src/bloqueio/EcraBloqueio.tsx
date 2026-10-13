import { useEffect, useRef } from 'react';
import { montarBloqueio } from './ecraBloqueio';

/** Ecrã de bloqueio (substitui a app enquanto não se introduz o PIN ou a impressão digital). */
export function EcraBloqueio({ hash, aoDesbloquear }: { hash: string; aoDesbloquear: () => void }) {
  const anfitriao = useRef<HTMLDivElement>(null);
  const desbloquear = useRef(aoDesbloquear);
  desbloquear.current = aoDesbloquear;
  useEffect(() => montarBloqueio(anfitriao.current!, { hash, aoDesbloquear: () => desbloquear.current() }), [hash]);
  return <div id="ff-lock-host" ref={anfitriao} />;
}
