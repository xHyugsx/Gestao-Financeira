// Rede de segurança (v2.65.1): se a app falhar ao desenhar, mostra «Algo correu mal» em vez do ecrã vazio,
// com «Recarregar» e «Exportar backup» (os dados continuam no telemóvel). Com PIN, o backup só sai depois do PIN.
import { Component, type ReactNode, useState } from 'react';
import { PREFIXO } from '../config';
import { chave, criarBackup, hashPin, lerDados, nomeFicheiroBackup } from '../dados';
import { eNativo } from '../nativo/plataforma';
import { guardarEPartilhar } from '../nativo/ficheiros';
import { todos as todosLembretes } from '../veterinario/lembretes';

function conteudoDoBackup(): string {
  try {
    let jarvisThreads: unknown[] = [];
    try { const j: unknown = JSON.parse(localStorage.getItem(chave('conversaJarvis', PREFIXO)) || '[]'); if (Array.isArray(j)) jarvisThreads = j; } catch { /* sem conversa */ }
    return JSON.stringify(criarBackup(lerDados(localStorage, PREFIXO), { jarvisThreads, vetReminders: todosLembretes() }), null, 2);
  } catch {
    // os dados não se deixam ler: sai a cópia tal como está guardada
    return localStorage.getItem(chave('dados', PREFIXO)) || '{}';
  }
}

function exportar() {
  const nome = nomeFicheiroBackup(), texto = conteudoDoBackup();
  if (eNativo()) { void guardarEPartilhar(nome, texto, nome); return; }
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pinGuardado(): string | null {
  try { const d = JSON.parse(localStorage.getItem(chave('dados', PREFIXO)) || '{}') as { pinHash?: unknown }; return typeof d.pinHash === 'string' ? d.pinHash : null; } catch { return null; }
}

function Falha({ erro }: { erro: string }) {
  const [pin, setPin] = useState(''), [aviso, setAviso] = useState(''), comPin = pinGuardado();
  const pedir = async () => {
    if (comPin && (await hashPin(pin)) !== comPin) { setAviso('PIN errado.'); return; }
    setAviso(''); exportar();
  };
  return (
    <main className="fferro" role="alert">
      <h1>Algo correu mal</h1>
      <p>A app encontrou um erro ao abrir este ecrã. Os teus dados continuam guardados neste telemóvel.</p>
      <button type="button" className="fferro-prim" onClick={() => location.reload()}>Recarregar</button>
      {comPin ? <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} aria-label="PIN" placeholder="PIN para exportar" value={pin} onChange={(e) => setPin(e.target.value)} /> : null}
      <button type="button" className="fferro-sec" onClick={() => void pedir()}>Exportar backup</button>
      {aviso ? <p className="fferro-aviso">{aviso}</p> : null}
      <details><summary>Detalhes do erro</summary><code>{erro}</code></details>
    </main>
  );
}

export class ErroApp extends Component<{ children: ReactNode }, { erro: string | null }> {
  override state = { erro: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { erro: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }; }
  override render() { return this.state.erro ? <Falha erro={this.state.erro} /> : this.props.children; }
}
