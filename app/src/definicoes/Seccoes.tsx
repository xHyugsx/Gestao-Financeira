// Secções das Definições (Perfil, Categorias, Contas, Aparência, Dados e Backup) — mesmo HTML e regras da app atual.
import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { acertarSaldo, anoMes, type Conta, type Estado, limiteSaldoBaixo, saldoDaConta } from '../dados';
import { renomearCategoria } from '../movimentos/categorias';
import { coresCategorias, corNova } from '../movimentos/cores';
import { lerValor } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import { montarEspaco } from './espaco';

type Mudar = (f: (e: Estado) => Estado) => void;

/** Cabeçalho, conteúdo e mensagem de uma secção. */
export function Subvista({ titulo, subtitulo, mensagem, children }: { titulo: string; subtitulo: string; mensagem: string; children: ReactNode }) {
  return (
    <div className="settings-subview">
      <div className="view-heading"><p className="eyebrow">{subtitulo}</p><h2>{titulo}</h2></div>
      {children}
      {mensagem ? <p className="settings-message" role="status">{mensagem}</p> : null}
    </div>
  );
}

const NOME_MAX = 60;
function erroNome(v: string): string | null {
  const t = v.trim();
  if (!t) return 'Este campo é obrigatório.';
  return t.length > NOME_MAX ? `Use no máximo ${NOME_MAX} caracteres.` : null;
}

export function Perfil({ estado, mudarEstado, avisar }: { estado: Estado; mudarEstado: Mudar; avisar: (m: string) => void }) {
  const p = estado.profile;
  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    avisar('');
    const f = new FormData(ev.currentTarget);
    const nome = String(f.get('profileName') ?? ''), email = String(f.get('email') ?? '').trim(), telefone = String(f.get('phone') ?? '').trim();
    const erro = erroNome(nome)
      ?? (email.length > 120 ? 'Use no máximo 120 caracteres.' : email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Introduza um email válido.' : null)
      ?? (telefone.length > 30 ? 'Use no máximo 30 caracteres.' : !/^[+\d\s().-]*$/.test(telefone) ? 'Introduza um telefone válido.' : null);
    if (erro) { avisar(erro); return; }
    mudarEstado((e) => ({ ...e, profile: { ...e.profile, profileName: nome.trim(), email, phone: telefone } }));
    avisar('Perfil guardado.');
  };
  return (
    <form className="settings-panel movement-form" onSubmit={guardar}>
      <label>Nome do perfil<input name="profileName" defaultValue={p.profileName} maxLength={60} required /></label>
      <label>Email<input name="email" type="email" defaultValue={p.email} maxLength={120} placeholder="Opcional" /></label>
      <label>Telefone<input name="phone" type="tel" defaultValue={p.phone} maxLength={30} placeholder="Opcional" /></label>
      <Botao type="submit">Guardar perfil</Botao>
      <div className="settings-divider" />
      <h3>Membros da família</h3>
      <div className="editable-list">
        {p.members.map((nome, i) => (
          <div key={`${nome}-${i}`} className="editable-row">
            <input
              aria-label={`Nome do membro ${i + 1}`} defaultValue={nome} maxLength={60}
              onBlur={(ev) => {
                const erro = erroNome(ev.target.value);
                if (erro) { avisar(erro); ev.target.value = nome; return; }
                const novo = ev.target.value.trim();
                mudarEstado((e) => ({ ...e, profile: { ...e.profile, members: e.profile.members.map((m, k) => (k === i ? novo : m)) } }));
                avisar('Membro atualizado.');
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Toca num nome para o editar.</p>
    </form>
  );
}

export function CategoriasDefinicoes({ estado, mudarEstado, avisar, categoriaRenomeada }: {
  estado: Estado; mudarEstado: Mudar; avisar: (m: string) => void; categoriaRenomeada: (antigo: string, novo: string) => void;
}) {
  const [nova, setNova] = useState('');
  const usadas = new Set(estado.transactions.map((m) => m.detail.split('·').pop()?.trim()).filter(Boolean));
  return (
    <section className="settings-panel">
      <div className="editable-list">
        {estado.categories.map((c, i) => (
          <div key={`${c}-${i}`} className="editable-row">
            <input
              aria-label={`Categoria ${c}`} defaultValue={c} maxLength={40}
              onBlur={(ev) => {
                const novo = ev.target.value.trim();
                if (!novo || estado.categories.some((x, k) => k !== i && x.toLocaleLowerCase('pt-PT') === novo.toLocaleLowerCase('pt-PT'))) {
                  avisar('A categoria precisa de um nome único.'); ev.target.value = c; return;
                }
                if (novo === c) return;
                mudarEstado((e) => renomearCategoria(e, c, novo));
                categoriaRenomeada(c, novo);
                avisar('Categoria renomeada nos movimentos existentes.');
              }}
            />
            <Botao
              variante="ghost" tamanho="icone" aria-label={`Eliminar ${c}`}
              onClick={() => {
                if (usadas.has(c)) { avisar('Esta categoria está a ser usada por movimentos e não pode ser eliminada.'); return; }
                mudarEstado((e) => ({ ...e, categories: e.categories.filter((_, k) => k !== i) }));
                avisar('Categoria eliminada.');
              }}
            ><Icone nome="trash-2" /></Botao>
          </div>
        ))}
      </div>
      <div className="inline-add">
        <input value={nova} maxLength={40} onChange={(ev) => setNova(ev.target.value)} placeholder="Nova categoria" aria-label="Nova categoria" />
        <Botao
          tamanho="icone" aria-label="Adicionar categoria"
          onClick={() => {
            const nome = nova.trim();
            const erro = erroNome(nome) ?? (nome.length > 40 ? 'Use no máximo 40 caracteres.' : null);
            if (erro) { avisar(erro); return; }
            if (estado.categories.some((x) => x.toLocaleLowerCase('pt-PT') === nome.toLocaleLowerCase('pt-PT'))) { avisar('Essa categoria já existe.'); return; }
            // cor ao acaso e nunca repetida (correção pedida pelo dono, só na app nova)
            mudarEstado((e) => ({ ...e, categories: [...e.categories, nome], extras: { ...e.extras, categoryColors: { ...coresCategorias(e), [nome]: corNova(e) } } }));
            setNova('');
            avisar('Categoria criada.');
          }}
        ><Icone nome="plus" /></Botao>
      </div>
    </section>
  );
}

const valorTexto = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

export function Contas({ estado, mudarEstado, avisar }: { estado: Estado; mudarEstado: Mudar; avisar: (m: string) => void }) {
  const hoje = new Date();
  // O campo mostra o saldo de hoje; o valor escrito passa a ser o saldo a partir de hoje (pedido do dono)
  const saldoHoje = (c: Conta) => saldoDaConta(c, estado.transactions, hoje).atual;
  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    avisar('');
    const f = new FormData(ev.currentTarget);
    const contas = estado.accounts.map((c) => {
      const nome = String(f.get(`${c.id}-name`) || '').trim(), saldo = lerValor(f.get(`${c.id}-balance`));
      const aviso = String(f.get(`${c.id}-low`) ?? '').trim(), limite = limiteSaldoBaixo(c), antes = limite == null ? '' : valorTexto(limite);
      const base = { ...c, name: nome, ...(aviso === antes ? {} : { lowAt: aviso === '' ? null : Math.max(0, lerValor(aviso)) }) };
      return { conta: base, saldo };
    });
    if (contas.some(({ conta, saldo }) => erroNome(conta.name) || !Number.isFinite(saldo) || Math.abs(saldo) > 999999999)) {
      avisar('Verifique os nomes e saldos das contas.'); return;
    }
    mudarEstado((e) => ({ ...e, accounts: contas.map(({ conta, saldo }) => acertarSaldo(conta, e.transactions, saldo, hoje)) }));
    avisar('Contas atualizadas.');
  };
  const eliminar = (c: Conta) => {
    const k = estado.transactions.filter((m) => m.account === c.id).length;
    const extra = k ? ` ${k === 1 ? 'O movimento associado passa' : `Os ${k} movimentos associados passam`} para a Principal.` : '';
    if (!window.confirm(`Eliminar a conta «${c.name}»? O cartão sai da página principal.${extra}`)) return;
    mudarEstado((e) => ({
      ...e,
      transactions: e.transactions.map((m) => (m.account === c.id ? { ...m, account: undefined } : m)),
      accounts: e.accounts.filter((x) => x.id !== c.id),
    }));
    avisar('Conta eliminada.');
  };
  const nova = () => {
    mudarEstado((e) => ({ ...e, accounts: [...e.accounts, { id: `acc-${Date.now().toString(36)}`, name: 'Nova conta', balance: 0, createdAt: anoMes(hoje), adj: {} }] }));
    avisar('');
    setTimeout(() => { const l = document.querySelectorAll<HTMLInputElement>('.account-editor input[name$="-name"]'); l[l.length - 1]?.select(); }, 60);
  };
  return (
    <form className="settings-panel movement-form" onSubmit={guardar}>
      {estado.accounts.map((c) => {
        const limite = limiteSaldoBaixo(c);
        return (
          <fieldset key={`${c.id}-${saldoHoje(c)}`} className="account-editor">
            <legend>{c.id === 'principal' ? 'Conta principal' : c.id === 'revolut' ? 'Conta secundária' : 'Conta adicional'}</legend>
            {c.id !== 'principal' && c.id !== 'revolut'
              ? <Botao type="button" variante="ghost" tamanho="icone" className="account-remove" aria-label={`Eliminar ${c.name}`} onClick={() => eliminar(c)}><Icone nome="trash-2" /></Botao>
              : null}
            <label>Nome<input name={`${c.id}-name`} defaultValue={c.name} maxLength={60} required /></label>
            <label>Saldo<div className="input-suffix"><input name={`${c.id}-balance`} defaultValue={valorTexto(saldoHoje(c))} inputMode="decimal" required /><span>€</span></div></label>
            <label>Avisar abaixo de<div className="input-suffix"><input name={`${c.id}-low`} defaultValue={limite == null ? '' : valorTexto(limite)} inputMode="decimal" placeholder="Sem aviso" /><span>€</span></div></label>
          </fieldset>
        );
      })}
      {estado.accounts.length < 8 ? <Botao type="button" variante="contorno" className="account-add" onClick={nova}><Icone nome="plus" />Nova conta</Botao> : null}
      <Botao type="submit">Guardar contas</Botao>
    </form>
  );
}

const TEMAS: [string, string][] = [['violet', 'Cósmico'], ['blue', 'Órbita azul'], ['rose', 'Nebulosa']];

export function Aparencia({ estado, mudarEstado }: { estado: Estado; mudarEstado: Mudar }) {
  const a = estado.appearance;
  const mudar = (o: Partial<Estado['appearance']>) => mudarEstado((e) => ({ ...e, appearance: { ...e.appearance, ...o } }));
  return (
    <section className="settings-panel">
      <h3>Cor de destaque</h3>
      <div className="accent-options">
        {TEMAS.map(([t, nome]) => (
          // Na app atual a junção de classes (tailwind-merge) trata `accent-*` como cor e fica só com a última:
          // `accent-<cor>` ou, no tema escolhido, `accent-choice-active`. Reproduz-se o mesmo resultado.
          <Botao key={t} variante="ghost" className={a.accent === t ? 'accent-choice-active' : `accent-${t}`} onClick={() => mudar({ accent: t })}>
            <span aria-hidden="true" />{nome}
          </Botao>
        ))}
      </div>
      <label className="range-setting">
        <span><strong>Intensidade do fundo</strong><small>{a.backgroundIntensity}%</small></span>
        <input type="range" min="0" max="100" step="25" value={a.backgroundIntensity} onChange={(ev) => mudar({ backgroundIntensity: Number(ev.target.value) })} />
      </label>
      <div className="settings-divider" />
      <label className="range-setting">
        <span><strong>Tamanho do texto</strong><small>{a.fontScale}%</small></span>
        <input type="range" min="85" max="120" step="5" value={a.fontScale} onChange={(ev) => mudar({ fontScale: Number(ev.target.value) })} />
      </label>
      <div className="settings-divider" />
      <Botao
        type="button" variante="ghost" className="setting-row" aria-pressed={a.haptics !== false}
        onClick={() => { const v = a.haptics === false; mudar({ haptics: v }); try { if (v) navigator.vibrate?.(30); } catch { /* sem vibração */ } }}
      >
        <Icone nome="smartphone" />
        <span><strong>Vibração</strong><small>{a.haptics === false ? 'Desligada' : 'Ao guardar e eliminar movimentos'}</small></span>
        <i className={a.haptics === false ? 'toggle' : 'toggle toggle-on'} />
      </Botao>
    </section>
  );
}

export function Dados({ espaco, limpar }: { espaco: string; limpar: () => void }) {
  return (
    <section className="settings-panel">
      <div className="storage-meter"><Icone nome="database" /><div><small>Espaço local ocupado</small><strong>{espaco}</strong></div></div>
      <p className="settings-copy">Os movimentos, fotografias, definições e conversas do Jarvis ficam apenas neste navegador. Pode exportar uma cópia antes de limpar.</p>
      <Botao variante="destrutivo" onClick={() => { if (window.confirm('Limpar todos os dados locais? Esta ação não pode ser anulada.')) limpar(); }}>
        <Icone nome="trash-2" />Limpar todos os dados locais
      </Botao>
    </section>
  );
}

const espacosMontados = new WeakSet<HTMLElement>();

export interface AcoesBackup {
  criar: () => void;
  restaurar: (f: File) => Promise<void>;
  exportarCsv: () => void;
}

export function Backup({ ultimo, mensagem, acoes }: { ultimo: string; mensagem: string; acoes: AcoesBackup }) {
  const ficheiro = useRef<HTMLInputElement>(null);
  const data = ultimo
    ? new Date(ultimo).toLocaleString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Ainda não foi feito nenhum';
  const linha = (icone: 'download' | 'upload', titulo: string, texto: string, onClick: () => void) => (
    <Botao variante="ghost" className="setting-row" onClick={onClick}><Icone nome={icone} /><span><strong>{titulo}</strong><small>{texto}</small></span></Botao>
  );
  return (
    <>
      <div className="view-heading"><p className="eyebrow">Cópias de segurança</p><h2>Backup</h2></div>
      <section className="backup-last"><small>Último backup neste telemóvel</small><strong>{data}</strong></section>
      <div key="ffsto" className="ffsto-slot" ref={(el) => { if (el && !espacosMontados.has(el)) { espacosMontados.add(el); montarEspaco(el); } }} />
      <section className="settings-list">
        {linha('download', 'Criar backup', 'Cópia JSON com movimentos, definições, fotos e Jarvis', acoes.criar)}
        {linha('upload', 'Restaurar backup', 'Substitui os dados atuais por uma cópia JSON', () => ficheiro.current?.click())}
        {linha('download', 'Exportar movimentos (CSV)', 'Folha de cálculo para Excel ou Sheets', acoes.exportarCsv)}
      </section>
      <input
        ref={ficheiro} type="file" accept="application/json,.json" className="hidden" aria-label="Ficheiro de cópia de segurança"
        onChange={(ev) => { const f = ev.target.files?.[0]; const alvo = ev.target; if (f) void acoes.restaurar(f).finally(() => { alvo.value = ''; }); }}
      />
      {mensagem ? <p className="settings-message" role="status">{mensagem}</p> : null}
      <p className="text-xs text-muted-foreground">Guarda o ficheiro JSON fora do telemóvel (Drive, email). Restaurar pede sempre confirmação antes de substituir os dados.</p>
    </>
  );
}

