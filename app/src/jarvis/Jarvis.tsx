// Janela do Jarvis — mesmo HTML da app atual (cabeçalho, mensagens, Confirmar/Cancelar, sugestões, anexos).
import { useEffect, useRef, useState } from 'react';
import { PREFIXO } from '../config';
import { chave } from '../dados';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import { corrigir } from './correcao';
import type { ContextoJarvis, MotorJarvis } from './motor';

export interface Mensagem { role: 'user' | 'assistant'; content: string; file?: boolean }

export const SVG_JARVIS = '<svg viewBox="0 0 32 32" aria-hidden="true"><g class="jv-r1"><ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#bdf8ff" stroke-width="1.2" transform="rotate(30 16 16)"/><circle cx="27" cy="12" r="1.4" fill="#00F0FF"/></g><g class="jv-r2"><ellipse cx="16" cy="16" rx="12" ry="5" fill="none" stroke="#bdf8ff" stroke-opacity=".7" stroke-width="1.2" transform="rotate(-35 16 16)"/></g><circle class="jv-co" cx="16" cy="16" r="5" fill="#00F0FF"/><circle cx="16" cy="16" r="2.4" fill="#fff"/></svg>';

// Sugestões por página (js/modulos/jarvis-sugestoes.js): [texto, texto a preencher na caixa]
const D: [string, string] = ['Adicionar despesa…', 'Adiciona despesa de '], R: [string, string] = ['Adicionar receita…', 'Adiciona receita de '];
const SUGESTOES: Record<string, [string, string?][]> = {
  principal: [['Quanto gastei este mês?'], ['Saldo das contas'], ['Rendimento do mês'], D],
  analise: [['Maior categoria'], ['Quanto gastei este mês?'], ['Receitas do mês'], ['Rendimento do mês']],
  categorias: [['Maior categoria'], ['Quanto gastei este mês?'], D],
  resumo: [['Saldo das contas'], ['Receitas do mês'], ['Rendimento do mês'], ['Quanto gastei este mês?']],
  calendario: [['Quanto gastei este mês?'], ['Saldo das contas'], D, R],
  combustivel: [['Combustível este mês'], ['Quanto gastei este mês?'], D],
  veterinario: [['Veterinário este mês'], ['Quanto gastei este mês?'], ['Maior categoria'], D],
};

const CONVERSAS = chave('conversaJarvis', PREFIXO);
interface Conversa { id: string; title: string; updatedAt: string; messages: Mensagem[] }
function lerConversas(): Conversa[] {
  try { const a: unknown = JSON.parse(localStorage.getItem(CONVERSAS) || '[]'); return Array.isArray(a) ? (a as Conversa[]) : []; } catch { return []; }
}
function gravarConversas(l: Conversa[]) {
  try { localStorage.setItem(CONVERSAS, JSON.stringify(l)); } catch (x) { window.ffSaveFail?.(x); }
}
const novaConversa = (): Conversa => ({ id: crypto.randomUUID(), title: 'Nova conversa', updatedAt: new Date().toISOString(), messages: [] });

export function mensagensGuardadas(): Mensagem[] {
  const m = lerConversas()[0]?.messages;
  return Array.isArray(m) ? m.filter((e) => e && (e.role === 'user' || e.role === 'assistant') && typeof e.content === 'string').slice(-100) : [];
}

interface Props {
  aberto: boolean;
  fechar: () => void;
  motor: MotorJarvis;
  contexto: () => ContextoJarvis;
  /** Palavras dos dados para a correção de erros de escrita (títulos, categorias, contas, pessoas, animais). */
  vocabulario: () => string[];
  lerAnexo: (f: File) => Promise<string>;
  pagina: string;
  nome: string;
  teclado: number;
  vibrar: (p: number | number[]) => void;
  mensagens: Mensagem[];
  mudarMensagens: (f: (m: Mensagem[]) => Mensagem[]) => void;
}

export function Jarvis({ aberto, fechar, motor, contexto, vocabulario, lerAnexo, pagina, nome, teclado, vibrar, mensagens, mudarMensagens }: Props) {
  const [texto, setTexto] = useState('');
  const [aEscrever, setAEscrever] = useState(false);
  const [, setVersao] = useState(0);
  const lista = useRef<HTMLDivElement>(null);
  const juntar = (m: Mensagem) => mudarMensagens((l) => [...l, m].slice(-100));

  useEffect(() => {
    const a = lerConversas(), t = a[0] || novaConversa();
    gravarConversas([{ ...t, updatedAt: new Date().toISOString(), messages: mensagens.slice(-100) }, ...a.slice(1)]);
  }, [mensagens]);
  useEffect(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight; }, [mensagens, aEscrever, aberto]);

  const enviar = (q0: string) => {
    const q = String(q0 || '').trim();
    if (!q || aEscrever) return;
    const fx = corrigir(q, vocabulario());
    let r = motor.responder(fx.text, contexto());
    if (fx.fixes.length) r += `\n(entendi: ${fx.fixes.map(([a, b]) => `${a} → ${b}`).join(', ')})`;
    setTexto('');
    juntar({ role: 'user', content: q });
    setAEscrever(true);
    setTimeout(() => { juntar({ role: 'assistant', content: r }); setAEscrever(false); }, 450);
  };
  const anexar = async (f: File) => {
    juntar({ role: 'user', content: `📎 ${f.name}`, file: true });
    const r = await lerAnexo(f);
    juntar({ role: 'assistant', content: r });
    setVersao((v) => v + 1);
  };

  if (!aberto) return null;
  const sugestoes = (SUGESTOES[pagina] || SUGESTOES.principal!).map(([l, pf]) => (
    <button
      key={l} type="button" className={pf ? 'act' : undefined}
      onClick={() => {
        if (!pf) { enviar(l); return; }
        setTexto(pf);
        setTimeout(() => { const i = document.querySelector<HTMLInputElement>('[aria-label="Mensagem para o Jarvis"]'); if (i) { i.focus(); i.setSelectionRange(pf.length, pf.length); } }, 30);
      }}
    >{l}</button>
  ));
  const ultimaAi = mensagens.map((m) => m.role).lastIndexOf('assistant');
  const marca = <span className="jarvis-box-mark ffjv-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SVG_JARVIS }} />;
  const pendente = motor.pendente;
  return (
    <div className="jarvis-overlay" style={{ '--jv-kb': `${teclado}px` } as React.CSSProperties} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <section className="jarvis-box" role="dialog" aria-modal="true" aria-label="Jarvis">
        <header className="jarvis-box-head">
          <span className="ffjv-logo" aria-hidden="true" />
          <div className="ffjv-title"><strong>Jarvis</strong><small>O seu assistente financeiro</small></div>
          {mensagens.length > 0 ? (
            <Botao type="button" variante="ghost" tamanho="icone" aria-label="Limpar conversa" onClick={() => { mudarMensagens(() => []); motor.limpar(); vibrar(15); }}>
              <Icone nome="trash-2" />
            </Botao>
          ) : null}
          <Botao type="button" variante="ghost" tamanho="icone" aria-label="Fechar Jarvis" onClick={fechar}><Icone nome="x" /></Botao>
        </header>
        <div className="jarvis-box-msgs" ref={lista}>
          <div className={`ffjv-ai${!aEscrever && ultimaAi === -1 ? ' last' : ''}`}>
            {marca}
            <p className="jarvis-msg jarvis-msg-ai">{`Saudações${nome ? ` ${nome}` : ''}, em que posso ser útil hoje?`}</p>
          </div>
          {mensagens.map((e, i) => (e.role === 'user'
            ? <p key={i} className={`jarvis-msg jarvis-msg-me${e.file ? ' jarvis-msg-file' : ''}`}>{e.content}</p>
            : (
              <div key={i} className={`ffjv-ai${!aEscrever && i === ultimaAi ? ' last' : ''}`}>
                {marca}
                <p className={`jarvis-msg jarvis-msg-ai${e.file ? ' jarvis-msg-file' : ''}`}>{e.content}</p>
              </div>
            )))}
          {pendente && !aEscrever ? (
            <div className="ffjv-act" role="group" aria-label="Responder ao Jarvis">
              <button type="button" className="ok" onClick={() => enviar('Confirmar')}>✓ Confirmar</button>
              <button type="button" className="no" onClick={() => enviar('Cancelar')}>✕ Cancelar</button>
            </div>
          ) : null}
          {aEscrever ? (
            <div className="ffjv-ai last">
              {marca}
              <p className="jarvis-msg jarvis-msg-ai jarvis-typing" aria-label="Jarvis a escrever"><i /><i /><i /></p>
            </div>
          ) : null}
          {!mensagens.length && !aEscrever ? <div className="jarvis-suggest">{sugestoes}</div> : null}
        </div>
        {mensagens.length > 0 && !aEscrever && !pendente ? <div className="ffjv-row">{sugestoes}</div> : null}
        <form className="jarvis-box-composer" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
          <label className="jarvis-attach" aria-label="Anexar ficheiro">
            <Icone nome="paperclip" />
            <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void anexar(f); e.target.value = ''; }} />
          </label>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreve uma mensagem" aria-label="Mensagem para o Jarvis" enterKeyHint="send" autoComplete="off" />
          <Botao type="submit" tamanho="icone" aria-label="Enviar mensagem"><Icone nome="send" /></Botao>
        </form>
      </section>
    </div>
  );
}
