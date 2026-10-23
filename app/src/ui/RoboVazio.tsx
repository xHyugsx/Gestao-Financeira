import { useId } from 'react';

/** Robô (como o do Jarvis) dos estados vazios: flutua e pisca os olhos (parado com movimento reduzido). */
export function RoboVazio({ pequeno = false }: { pequeno?: boolean }) {
  const g = `ffrobo-${useId().replace(/:/g, '')}`;
  return (
    <svg className={`ffrobo${pequeno ? ' ffrobo-pequeno' : ''}`} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00f0ff" /><stop offset=".55" stopColor="#8b5cf6" /><stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <ellipse className="ffrobo-sombra" cx="32" cy="60" rx="13" ry="2.2" />
      <g className="ffrobo-corpo">
        <line x1="32" y1="12" x2="32" y2="6" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
        <circle className="ffrobo-luz" cx="32" cy="5" r="2.6" />
        <rect x="7.5" y="23" width="4.5" height="11" rx="2.2" fill={`url(#${g})`} />
        <rect x="52" y="23" width="4.5" height="11" rx="2.2" fill={`url(#${g})`} />
        <rect x="12" y="12" width="40" height="32" rx="11" fill="rgba(16, 20, 56, .92)" stroke={`url(#${g})`} strokeWidth="2.4" />
        <rect x="17" y="18" width="30" height="20" rx="7.5" fill="#070b24" />
        <g className="ffrobo-olhos">
          <rect x="22" y="23.5" width="6" height="7" rx="3" fill="#67e8f9" />
          <rect x="36" y="23.5" width="6" height="7" rx="3" fill="#67e8f9" />
        </g>
        <path d="M28 33.5q4 2.6 8 0" fill="none" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="23" y="46" width="18" height="8" rx="4" fill="rgba(16, 20, 56, .92)" stroke={`url(#${g})`} strokeWidth="2" />
      </g>
    </svg>
  );
}
