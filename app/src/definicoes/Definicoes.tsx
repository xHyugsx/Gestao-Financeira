import { eNativo } from '../nativo/plataforma';
import { estadoAtualizacao } from '../nativo/atualizarWeb';
import { Notificacoes } from './Notificacoes';
import { ImagemBloqueio } from './ImagemBloqueio';
import { VERSAO } from '../config';
import { type FormEvent, useMemo, useState } from 'react';
import { type Aparencia as TipoAparencia, type Conta, type Estado, hashPin, pinValido, PREFIXO_REAL } from '../dados';
import { PREFIXO } from '../config';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import type { NomeIcone } from '../ui/icones';
import { regrasPessoais } from '../importacao/config';
import { montarAutobloqueio, montarBiometria } from './opcoesSeguranca';
import { type AcoesBackup, type AcoesImportacao, Aparencia, Backup, CategoriasDefinicoes, Contas, Dados, Importacao, Perfil, Subvista } from './Seccoes';

export type Seccao = 'profile' | 'categories' | 'accounts' | 'appearance' | 'security' | 'notifications' | 'backup' | 'data' | 'import';

const TITULOS: Record<Seccao, [string, string]> = {
  profile: ['Perfil e família', 'Dados pessoais e membros'],
  categories: ['Categorias', 'Organizar despesas e receitas'],
  accounts: ['Contas bancárias', 'Contas para escolher em cada movimento'],
  appearance: ['Aparência', 'Tema, fundo e tamanho do texto'],
  security: ['Segurança', 'Bloqueio local da aplicação'],
  notifications: ['Notificações', 'Avisos no telemóvel'],
  backup: ['Backup', 'Cópias de segurança'],
  data: ['Dados', 'Gestão e privacidade'],
  import: ['Importação', 'Extratos bancários'],
};

const nomesContas = (c: Conta[]) => (c.length > 2 ? `${c.length} contas` : c.map((e) => e.name).join(' e '));
const tema = (a: TipoAparencia) => (a.accent === 'violet' ? 'Cósmico' : a.accent === 'blue' ? 'Órbita azul' : 'Nebulosa');
const resumoPerfil = (e: Estado) => [e.profile.profileName, `${e.profile.members.length} ${e.profile.members.length === 1 ? 'membro' : 'membros'}`].filter(Boolean).join(' · ');
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


export interface PosicaoMenu { t: number; r: number; out?: boolean }

export function MenuRapido({ posicao, estado, versao, fechar, abrir, jarvis }: {
  posicao: PosicaoMenu; estado: Estado; versao: string; fechar: () => void; abrir: (s?: Seccao) => void; jarvis: () => void;
}) {
  const itens: [Seccao, NomeIcone, string, string][] = [
    ['profile', 'user-round', 'Perfil e família', resumoPerfil(estado)],
    ['accounts', 'landmark', 'Contas bancárias', nomesContas(estado.accounts)],
    ['appearance', 'palette', 'Aparência', `${tema(estado.appearance)} · fundo ${estado.appearance.backgroundIntensity}%`],
    ['security', 'lock-keyhole', 'Segurança', resumoPin(estado)],
  ];
  return (
    <div className={`set-menu-overlay${posicao.out ? ' is-out' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <nav className="set-menu" style={{ top: `${posicao.t}px`, right: `${posicao.r}px` }} aria-label="Jarvis e definições">
        <button type="button" className="set-menu-item set-menu-jarvis" onClick={jarvis}>
          <i className="set-menu-robo" aria-hidden="true" /><span><strong>Perguntar ao Jarvis</strong><small>Gastos, previsões, registos…</small></span>
        </button>
        <p className="set-menu-version">{`v. ${versao}`}</p>
        {itens.map(([s, icone, titulo, resumo]) => (
          <button key={s} type="button" className="set-menu-item" onClick={() => abrir(s)}>
            <Icone nome={icone} /><span><strong>{titulo}</strong><small>{resumo}</small></span>
          </button>
        ))}
        <button type="button" className="set-menu-item set-menu-more" onClick={() => abrir()}>
          <Icone nome="chevron-right" /><span><strong>Todas as definições</strong></span>
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
  mudarAparencia: (a: TipoAparencia) => void;
  mudarEstado: (f: (e: Estado) => Estado) => void;
  categoriaRenomeada: (antigo: string, novo: string) => void;
  /** Data do último backup (ISO) ou ''. */
  ultimoBackup: string;
  mensagemBackup: string;
  acoesBackup: AcoesBackup;
  limparDados: () => void;
  acoesImportacao: AcoesImportacao;
  /** Armazenamento persistente: `undefined` ainda a verificar. */
  protegido?: boolean | null;
}

export function FolhaDefinicoes(props: PropsFolha) {
  const { modo, seccao, mudarSeccao, fechar, teclado, estado, mudarPin, mudarAparencia, mudarEstado } = props;
  const lb = props.ultimoBackup;
  const espaco = useMemo(espacoOcupado, [estado]);
  const [mensagem, setMensagem] = useState('');
  const abrirSeccao = (s: Seccao | null) => { setMensagem(''); mudarSeccao(s); };
  const a = estado.appearance;
  // lista em grupos com ícones coloridos e o estado à vista (v2.46.0)
  const linha = (s: Seccao, icone: NomeIcone, titulo: string, resumo: string, extra = false, cor = '', estadoTxt?: [string, string]) => (
    <Botao variante="ghost" className={extra ? 'setting-row ffv2-extra' : 'setting-row'} onClick={() => abrirSeccao(s)}>
      <span className="ffdef-ic" style={{ background: cor } as React.CSSProperties}><Icone nome={icone} /></span>
      <span><strong>{titulo}</strong><small>{resumo}</small></span>
      {estadoTxt ? <em className={`ffdef-estado ffdef-${estadoTxt[1]}`}>{estadoTxt[0]}</em> : null}
      <Icone nome="chevron-right" />
    </Botao>
  );
  const diasBackup = lb ? Math.floor((Date.now() - new Date(lb).getTime()) / 864e5) : null;
  const estadoBackup: [string, string] = diasBackup === null ? ['Sem backup', 'mau'] : diasBackup <= 30 ? ['Em dia', 'bom'] : ['Atrasado', 'aviso'];
  const membros = estado.profile.members.filter(Boolean), pets = Array.isArray(estado.profile.pets) ? estado.profile.pets.length : 0;
  const viaturas = Array.isArray(estado.profile.vehicles) ? estado.profile.vehicles.length : 0;
  return (
    <div
      className="settings-sheet" role="dialog" aria-modal="true" aria-label="Definições" style={{ '--jv-kb': `${teclado}px` } as React.CSSProperties}
      onFocus={(e) => {
        const alvo = e.target as HTMLElement;
        if (alvo.matches('input,select,textarea')) setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320);
      }}
    >
      <div className="settings-sheet-top">
        <button type="button" className="sheet-back" onClick={() => (seccao && modo === 'list' ? abrirSeccao(null) : fechar())}>
          <Icone nome="chevron-left" />Voltar
        </button>
        {!seccao ? <h1>Definições</h1> : null}
      </div>
      <main className="detail-view settings-view">
        {seccao === 'security' ? (
          <Seguranca estado={estado} mudarPin={mudarPin} mudarAparencia={mudarAparencia} mudarEstado={mudarEstado} />
        ) : seccao === 'backup' ? (
          <Backup ultimo={lb} mensagem={props.mensagemBackup} acoes={props.acoesBackup} />
        ) : seccao ? (
          <Subvista titulo={TITULOS[seccao][0]} subtitulo={TITULOS[seccao][1]} mensagem={mensagem}>
            {seccao === 'profile' ? <Perfil estado={estado} mudarEstado={mudarEstado} avisar={setMensagem} />
              : seccao === 'categories' ? <CategoriasDefinicoes estado={estado} mudarEstado={mudarEstado} avisar={setMensagem} categoriaRenomeada={props.categoriaRenomeada} />
                : seccao === 'accounts' ? <Contas estado={estado} mudarEstado={mudarEstado} avisar={setMensagem} />
                  : seccao === 'appearance' ? <Aparencia estado={estado} mudarEstado={mudarEstado} />
                    : seccao === 'notifications' ? <Notificacoes />
                    : seccao === 'import' ? <Importacao estado={estado} mudarEstado={mudarEstado} avisar={setMensagem} acoes={props.acoesImportacao} />
                    : <Dados espaco={espaco} limpar={props.limparDados} protegido={props.protegido} />}
          </Subvista>
        ) : (
          <section className="settings-list ffdef-lista">
            <button type="button" className="ffdef-perfil" onClick={() => abrirSeccao('profile')} aria-label="Abrir Perfil e família">
              <span className="ffdef-av" aria-hidden="true">{(estado.profile.profileName || 'F').trim().charAt(0).toUpperCase()}</span>
              <span className="ffdef-perfil-txt">
                <b>{estado.profile.profileName || 'Perfil'}</b>
                <small>{`${membros.length} ${membros.length === 1 ? 'membro' : 'membros'}${pets ? ` · ${pets} ${pets === 1 ? 'animal' : 'animais'}` : ''}${viaturas ? ` · ${viaturas} ${viaturas === 1 ? 'viatura' : 'viaturas'}` : ''}`}</small>
                {membros.length ? <span className="ffdef-membros">{membros.slice(0, 4).map((m, k) => <i key={m} className={k === 0 ? 'ffp1' : k === 1 ? 'ffp2' : undefined}>{m}</i>)}</span> : null}
              </span>
            </button>
            <p className="ffdef-titulo">A tua família</p>
            <div className="ffdef-grupo">
              {linha('profile', 'user-round', 'Perfil e família', 'Membros, animais e viaturas', false, 'linear-gradient(135deg,#38bdf8,#6366f1)')}
              {linha('categories', 'tags', 'Categorias', `${estado.categories.length} categorias`, false, 'linear-gradient(135deg,#f472b6,#a855f7)')}
              {linha('accounts', 'landmark', 'Contas bancárias', nomesContas(estado.accounts), false, 'linear-gradient(135deg,#34d399,#0ea5e9)')}
            </div>
            <p className="ffdef-titulo">Aspeto e segurança</p>
            <div className="ffdef-grupo">
              {linha('appearance', 'palette', 'Aparência', `${tema(a)} · fundo ${a.backgroundIntensity}% · texto ${a.fontScale}%`, false, 'linear-gradient(135deg,#00c8ff,#8b5cf6,#ec4899)')}
              {linha('security', 'lock-keyhole', 'Segurança', resumoPin(estado), false, 'linear-gradient(135deg,#fbbf24,#f97316)', estado.pinHash ? ['Ativo', 'bom'] : undefined)}
              {eNativo() ? linha('notifications', 'bell', 'Notificações', 'Recorrentes, ordenado, veterinário, backup…', false, 'linear-gradient(135deg,#a855f7,#ec4899)') : null}
            </div>
            <p className="ffdef-titulo">Os teus dados</p>
            <div className="ffdef-grupo">
              {linha('backup', 'download', 'Backup', `Criar, restaurar ou exportar · ${lb ? `último: ${new Date(lb).toLocaleDateString('pt-PT')}` : 'sem backups'}`, false, 'linear-gradient(135deg,#22d3ee,#3b82f6)', estadoBackup)}
              {linha('data', 'database', 'Dados', `${espaco} ocupados neste dispositivo`, false, 'linear-gradient(135deg,#a78bfa,#6366f1)')}
              {linha('import', 'receipt', 'Importação', `Extratos bancários · ${regrasPessoais(estado).length} regras pessoais`, true, 'linear-gradient(135deg,#fb923c,#ef4444)')}
            </div>
            <button type="button" className="ffdef-dicas" onClick={() => window.dispatchEvent(new CustomEvent('ff-dicas'))}>Ver as dicas outra vez</button>
            <p className="ffdef-versao">{`Finanças · v${VERSAO}`}</p>
            {eNativo() ? (() => {
              // diagnóstico da atualização sozinha (v2.63.0): para se perceber no telemóvel porque não atualizou
              const u = estadoAtualizacao();
              return <p className="ffdef-versao ffdef-atualizacao">{u ? `Atualização: ${u.resultado}${u.publicada ? ` · publicada ${u.publicada}` : ''} · ${new Date(u.quando).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Atualização: ainda não verificou'}</p>;
            })() : null}
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


// Elementos já preenchidos pelas opções desenhadas no DOM (sem marcar atributos no HTML)
const montados = new WeakMap<HTMLElement, string>();

const OCULTAR: [string, string][] = [['off', 'Desligado'], ['now', 'Logo ao sair'], ['60', 'Após 1 min']];

function Seguranca({ estado, mudarPin, mudarAparencia, mudarEstado }: Pick<PropsFolha, 'estado' | 'mudarPin' | 'mudarAparencia' | 'mudarEstado'>) {
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
      <ImagemBloqueio estado={estado} mudarEstado={mudarEstado} />
      <section className="settings-panel">
        <div className="security-intro">
          <Icone nome="lock-keyhole" />
          <div>
            <strong>{temPin ? 'PIN ativo' : 'Sem bloqueio'}</strong>
            <p>{temPin ? 'A app pede o PIN sempre que é aberta.' : 'Cria um PIN local de quatro algarismos.'}</p>
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
