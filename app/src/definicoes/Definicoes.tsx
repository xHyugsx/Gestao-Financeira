import { type FormEvent, useMemo, useState } from 'react';
import { type Aparencia, type Conta, type Estado, hashPin, pinValido, PREFIXO_REAL } from '../dados';
import { PREFIXO } from '../config';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import type { NomeIcone } from '../ui/icones';
import { montarAutobloqueio, montarBiometria } from './opcoesSeguranca';

export type Seccao = 'profile' | 'categories' | 'accounts' | 'appearance' | 'security' | 'backup' | 'data';

const TITULOS: Record<Seccao, [string, string]> = {
  profile: ['Perfil e família', 'Dados pessoais e membros'],
  categories: ['Categorias', 'Organizar despesas e receitas'],
  accounts: ['Contas bancárias', 'Nomes e saldos disponíveis'],
  appearance: ['Aparência', 'Tema, fundo e tamanho do texto'],
  security: ['Segurança', 'Bloqueio local da aplicação'],
  backup: ['Backup', 'Cópias de segurança'],
  data: ['Dados', 'Gestão e privacidade'],
};

const nomesContas = (c: Conta[]) => (c.length > 2 ? `${c.length} contas` : c.map((e) => e.name).join(' e '));
const tema = (a: Aparencia) => (a.accent === 'violet' ? 'Cósmico' : a.accent === 'blue' ? 'Órbita azul' : 'Nebulosa');
const resumoPerfil = (e: Estado) => `${e.profile.profileName} · ${e.profile.members.length} membros`;
const resumoPin = (e: Estado) => (e.pinHash ? 'PIN ativo' : 'Sem PIN');

/** Espaço ocupado pelos dados da app neste navegador (mesma conta da app atual). */
function espacoOcupado(): string {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIXO_REAL) || k?.startsWith(PREFIXO)) total += new Blob([k + (localStorage.getItem(k) || '')]).size;
    }
  } catch { return 'Indisponível'; }
  return total < 1024 ? `${total} B` : total < 1048576 ? `${(total / 1024).toFixed(1)} KB` : `${(total / 1024 / 1024).toFixed(2)} MB`;
}

function ultimoBackup(): string {
  try { return localStorage.getItem(`${PREFIXO}last-backup`) || ''; } catch { return ''; }
}

export interface PosicaoMenu { t: number; r: number; out?: boolean }

export function MenuRapido({ posicao, estado, versao, fechar, abrir }: {
  posicao: PosicaoMenu; estado: Estado; versao: string; fechar: () => void; abrir: (s?: Seccao) => void;
}) {
  const itens: [Seccao, NomeIcone, string, string][] = [
    ['profile', 'user-round', 'Perfil e família', resumoPerfil(estado)],
    ['accounts', 'landmark', 'Contas bancárias', nomesContas(estado.accounts)],
    ['appearance', 'palette', 'Aparência', `${tema(estado.appearance)} · fundo ${estado.appearance.backgroundIntensity}%`],
    ['security', 'lock-keyhole', 'Segurança', resumoPin(estado)],
  ];
  return (
    <div className={`set-menu-overlay${posicao.out ? ' is-out' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <nav className="set-menu" style={{ top: `${posicao.t}px`, right: `${posicao.r}px` }} aria-label="Definições rápidas">
        <p className="set-menu-version">{`v. ${versao}`}</p>
        {itens.map(([s, icone, titulo, resumo]) => (
          <button key={s} type="button" className="set-menu-item" onClick={() => abrir(s)}>
            <Icone nome={icone} /><span><strong>{titulo}</strong><small>{resumo}</small></span>
          </button>
        ))}
        <button type="button" className="set-menu-item set-menu-more" onClick={() => abrir()}>
          <Icone nome="plus" /><span><strong>Definições</strong></span>
        </button>
      </nav>
    </div>
  );
}

interface PropsFolha {
  modo: 'list' | 'direct';
  seccao: Seccao | null;
  mudarSeccao: (s: Seccao | null) => void;
  fechar: () => void;
  teclado: number;
  estado: Estado;
  mudarPin: (hash: string) => void;
  mudarAparencia: (a: Aparencia) => void;
}

export function FolhaDefinicoes({ modo, seccao, mudarSeccao, fechar, teclado, estado, mudarPin, mudarAparencia }: PropsFolha) {
  const lb = useMemo(ultimoBackup, []);
  const espaco = useMemo(espacoOcupado, [estado]);
  const a = estado.appearance;
  const linha = (s: Seccao, icone: NomeIcone, titulo: string, resumo: string) => (
    <Botao variante="ghost" className="setting-row" onClick={() => mudarSeccao(s)}>
      <Icone nome={icone} /><span><strong>{titulo}</strong><small>{resumo}</small></span><Icone nome="chevron-right" />
    </Botao>
  );
  return (
    <div
      className="settings-sheet" role="dialog" aria-modal="true" aria-label="Definições" style={{ '--jv-kb': `${teclado}px` } as React.CSSProperties}
      onFocus={(e) => {
        const alvo = e.target as HTMLElement;
        if (alvo.matches('input,select,textarea')) setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
      }}
    >
      <div className="settings-sheet-top">
        <button type="button" className="sheet-back" onClick={() => (seccao && modo === 'list' ? mudarSeccao(null) : fechar())}>
          <Icone nome="chevron-left" />Voltar
        </button>
        {!seccao ? <h1>Definições</h1> : null}
      </div>
      <main className="detail-view settings-view">
        {seccao === 'security' ? (
          <Seguranca estado={estado} mudarPin={mudarPin} mudarAparencia={mudarAparencia} />
        ) : seccao ? (
          <EmConstrucaoDefinicoes seccao={seccao} />
        ) : (
          <section className="settings-list">
            {linha('profile', 'user-round', 'Perfil e família', resumoPerfil(estado))}
            {linha('categories', 'tags', 'Categorias', `${estado.categories.length} categorias`)}
            {linha('accounts', 'landmark', 'Contas bancárias', nomesContas(estado.accounts))}
            {linha('appearance', 'palette', 'Aparência', `${tema(a)} · fundo ${a.backgroundIntensity}% · texto ${a.fontScale}%`)}
            {linha('security', 'lock-keyhole', 'Segurança', resumoPin(estado))}
            {linha('backup', 'download', 'Backup', `Criar, restaurar ou exportar · ${lb ? `último: ${new Date(lb).toLocaleDateString('pt-PT')}` : 'sem backups'}`)}
            {linha('data', 'database', 'Dados', `${espaco} ocupados neste dispositivo`)}
          </section>
        )}
      </main>
    </div>
  );
}

function Cabecalho({ seccao }: { seccao: Seccao }) {
  const [titulo, subtitulo] = TITULOS[seccao];
  return <div className="view-heading"><p className="eyebrow">{subtitulo}</p><h2>{titulo}</h2></div>;
}

/** Partes das Definições ainda não migradas (só na versão de teste). */
function EmConstrucaoDefinicoes({ seccao }: { seccao: Seccao }) {
  return (
    <div className="settings-subview">
      <Cabecalho seccao={seccao} />
      <section className="settings-panel ffv2-construcao">
        <h2>Em construção</h2>
        <p>Esta parte das Definições ainda está a ser reconstruída nesta versão de teste. Use a app «Finanças» para a alterar.</p>
      </section>
    </div>
  );
}

// Elementos já preenchidos pelas opções desenhadas no DOM (sem marcar atributos no HTML)
const montados = new WeakMap<HTMLElement, string>();

const OCULTAR: [string, string][] = [['off', 'Desligado'], ['now', 'Logo ao sair'], ['60', 'Após 1 min']];

function Seguranca({ estado, mudarPin, mudarAparencia }: Pick<PropsFolha, 'estado' | 'mudarPin' | 'mudarAparencia'>) {
  const [mensagem, setMensagem] = useState('');
  const [pin, setPin] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const temPin = !!estado.pinHash;
  const ocultar = estado.appearance.autoHide ?? 'now';
  const soAlgarismos = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setMensagem('');
    if (!pinValido(pin)) { setMensagem('O PIN deve ter exatamente 4 algarismos.'); return; }
    if (pin !== confirmar) { setMensagem('Os PIN não coincidem.'); return; }
    mudarPin(await hashPin(pin));
    setPin(''); setConfirmar('');
    setMensagem(temPin ? 'PIN alterado.' : 'PIN definido.');
  };

  return (
    <div className="settings-subview">
      <Cabecalho seccao="security" />
      <section className="settings-panel">
        <div className="security-intro">
          <Icone nome="lock-keyhole" />
          <div>
            <strong>{temPin ? 'PIN ativo' : 'Sem bloqueio'}</strong>
            <p>{temPin ? 'A app pede o PIN sempre que é aberta.' : 'Crie um PIN local de quatro algarismos.'}</p>
          </div>
        </div>
        <form className="movement-form" onSubmit={guardar}>
          <label>
            {temPin ? 'Novo PIN' : 'PIN'}
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin} onChange={(e) => setPin(soAlgarismos(e.target.value))} required />
          </label>
          <label>
            Confirmar PIN
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={confirmar} onChange={(e) => setConfirmar(soAlgarismos(e.target.value))} required />
          </label>
          <Botao type="submit">{temPin ? 'Alterar PIN' : 'Ativar PIN'}</Botao>
          {temPin ? (
            <Botao type="button" variante="destrutivo" onClick={() => { if (window.confirm('Remover o bloqueio por PIN?')) { mudarPin(''); setMensagem('PIN removido.'); } }}>
              <Icone nome="trash-2" />Remover PIN
            </Botao>
          ) : null}
        </form>
        {temPin ? <div key={`bio-${estado.pinHash}`} className="ff-bio-slot" ref={(el) => { if (el && montados.get(el) !== estado.pinHash) { montados.set(el, estado.pinHash); montarBiometria(el, estado.pinHash); } }} /> : null}
        <div className="settings-divider" />
        <div className="autohide-setting">
          <strong>Ocultar valores ao sair da app</strong>
          <small>Ao voltar, toca no 👁 para os mostrar.</small>
          <div className="autohide-options" role="radiogroup" aria-label="Ocultar valores ao sair da app">
            {OCULTAR.map(([v, l]) => (
              <button
                key={v} type="button" role="radio" aria-checked={ocultar === v}
                className={ocultar === v ? 'autohide-choice autohide-choice-active' : 'autohide-choice'}
                onClick={() => mudarAparencia({ ...estado.appearance, autoHide: v })}
              >{l}</button>
            ))}
          </div>
        </div>
        {temPin ? <div key="autolock" className="ff-autolock-slot" ref={(el) => { if (el && !montados.has(el)) { montados.set(el, '1'); montarAutobloqueio(el); } }} /> : null}
      </section>
      {mensagem ? <p className="settings-message" role="status">{mensagem}</p> : null}
    </div>
  );
}
