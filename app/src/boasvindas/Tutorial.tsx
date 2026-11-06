// Boas-vindas (v2.58.0): só numa instalação nova (sem movimentos, membros nem PIN). Cinco ecrãs que preparam a app
// (casa, salário e contas, carro e animais, PIN) e, no fim, três dicas por cima da app (`Dicas`).
import { type FormEvent, useState } from 'react';
import { hashPin, type Conta, type Estado } from '../dados';
import type { Animal } from '../veterinario/animais';
import './boasvindas.css';

export interface ResultadoTutorial {
  casa: string;
  membros: string[];
  salaryMonth?: 'anterior' | 'proprio';
  contas: string[];
  viaturas: { name: string; type: 'carro' | 'mota' }[];
  animais: Animal[];
  pinHash?: string;
}

/** Aplica o que se escolheu no tutorial ao estado (as contas novas ficam com o saldo a 0; sem Revolut se não ficar na lista). */
export function aplicarTutorial(e: Estado, r: ResultadoTutorial): Estado {
  const principal = e.accounts.find((c) => c.id === 'principal') ?? { id: 'principal', name: 'Principal', balance: 0 };
  const usados = new Set(['principal']);
  const idDe = (nome: string) => {
    const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'conta';
    let id = base, n = 2;
    while (usados.has(id)) id = `${base}-${n++}`;
    usados.add(id);
    return id;
  };
  const contas: Conta[] = [principal, ...r.contas.map((nome) => e.accounts.find((c) => c.name === nome) ?? { id: idDe(nome), name: nome, balance: 0 })];
  return {
    ...e,
    accounts: contas,
    profile: {
      ...e.profile,
      profileName: r.casa || e.profile.profileName,
      members: r.membros,
      ...(r.salaryMonth ? { salaryMonth: r.salaryMonth } : {}),
      vehicles: r.viaturas,
      pets: r.animais,
    },
    ...(r.pinHash ? { pinHash: r.pinHash } : {}),
    // com viatura, a categoria Combustível passa a existir (o «+» mostra a viatura e o combustível)
    ...(r.viaturas.length && !e.categories.some((c) => /combust/i.test(c)) ? { categories: [...e.categories, 'Combustível'] } : {}),
  };
}

const PASSOS = 5;

function Lista({ itens, tirar, classe }: { itens: string[]; tirar: (i: number) => void; classe?: (i: number) => string }) {
  return (
    <div className="ffbv-chips">
      {itens.map((t, i) => (
        <button key={`${t}-${i}`} type="button" className={`ffbv-chip ${classe?.(i) ?? ''}`} aria-label={`Tirar ${t}`} onClick={() => tirar(i)}>{t} <span aria-hidden="true">✕</span></button>
      ))}
    </div>
  );
}

/** Campo com «Acrescentar» (Enter também acrescenta). */
function Acrescentar({ rotulo, placeholder, aoAcrescentar, extra }: { rotulo: string; placeholder: string; aoAcrescentar: (t: string) => void; extra?: React.ReactNode }) {
  const [t, setT] = useState('');
  const juntar = () => { const v = t.trim(); if (v) { aoAcrescentar(v.slice(0, 40)); setT(''); } };
  return (
    <div className="ffbv-add">
      <input value={t} placeholder={placeholder} aria-label={rotulo} maxLength={40} onChange={(e) => setT(e.target.value)} onBlur={juntar} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); juntar(); } }} />
      {extra}
      <button type="button" className="ffbv-mais" onClick={juntar} aria-label={rotulo}>+</button>
    </div>
  );
}

export function Tutorial({ estado, concluir, restaurar }: {
  estado: Estado; concluir: (r: ResultadoTutorial | null) => void; restaurar: () => void;
}) {
  const [passo, setPasso] = useState(0);
  const [casa, setCasa] = useState(estado.profile.profileName || '');
  const [membros, setMembros] = useState<string[]>([]);
  const [soEu, setSoEu] = useState(false);
  const [salario, setSalario] = useState<'anterior' | 'proprio' | undefined>(undefined);
  const [contas, setContas] = useState<string[]>([]);
  const [temCarro, setTemCarro] = useState(false);
  const [viaturas, setViaturas] = useState<ResultadoTutorial['viaturas']>([]);
  const [tipoViatura, setTipoViatura] = useState<'carro' | 'mota'>('carro');
  const [temAnimais, setTemAnimais] = useState(false);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [sexo, setSexo] = useState<'m' | 'f'>('f');
  const [comPin, setComPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [erro, setErro] = useState('');

  const juntarUnico = (lista: string[], v: string) => (lista.some((x) => x.toLocaleLowerCase('pt-PT') === v.toLocaleLowerCase('pt-PT')) ? lista : [...lista, v]);
  const resultado = async (saltar = false): Promise<ResultadoTutorial | null> => {
    let pinHash: string | undefined;
    // ao saltar, um PIN incompleto fica por definir (cria-se depois em Definições › Segurança)
    if (comPin && (pin || pin2) && !(saltar && (!/^\d{4}$/.test(pin) || pin !== pin2))) {
      if (!/^\d{4}$/.test(pin)) { setErro('O PIN tem de ter 4 algarismos.'); return null; }
      if (pin !== pin2) { setErro('Os PIN não coincidem.'); return null; }
      pinHash = await hashPin(pin);
    }
    return {
      casa: casa.trim(), membros: soEu ? [] : membros, salaryMonth: salario, contas: contas.filter((c) => c.toLocaleLowerCase('pt-PT') !== 'principal'),
      viaturas: temCarro ? viaturas : [], animais: temAnimais ? animais : [], pinHash,
    };
  };
  const terminar = async (saltar = false) => { const r = await resultado(saltar); if (r) concluir(r); };
  const seguinte = (ev?: FormEvent) => { ev?.preventDefault(); setErro(''); if (passo < PASSOS - 1) setPasso(passo + 1); else void terminar(); };

  const ecras = [
    <>
      <div className="ffbv-robo" aria-hidden="true" />
      <h1>Olá! Eu sou o <span>Jarvis</span></h1>
      <p className="ffbv-sub">Vou ajudar-te a organizar o dinheiro da casa. Precisamos de 1 minuto para preparar a app.</p>
      <div className="ffbv-itens">
        <div className="ffbv-item"><i aria-hidden="true">🔒</i><div>Tudo fica neste telemóvel<small>Sem contas, sem servidores, sem anúncios.</small></div></div>
        <div className="ffbv-item"><i aria-hidden="true">➕</i><div>Registas uma despesa em segundos<small>No botão + ao fundo do ecrã.</small></div></div>
        <div className="ffbv-item"><i aria-hidden="true">💬</i><div>Pergunta-me o que quiseres<small>«Quanto gastei em Alimentação este mês?»</small></div></div>
      </div>
    </>,
    <>
      <h1>Quem vive cá em casa?</h1>
      <p className="ffbv-sub">As pessoas aparecem em «Quem fez» nas despesas e na tabela de Salários.</p>
      <label className="ffbv-rot" htmlFor="ffbv-casa">Nome da casa (opcional)</label>
      <input id="ffbv-casa" className="ffbv-campo" value={casa} maxLength={60} placeholder="Ex.: Casa Silva" onChange={(e) => setCasa(e.target.value)} />
      {!soEu ? (
        <>
          <p className="ffbv-rot">Pessoas</p>
          <Lista itens={membros} tirar={(i) => setMembros((l) => l.filter((_, k) => k !== i))} classe={(i) => (i === 0 ? 'p1' : i === 1 ? 'p2' : '')} />
          <Acrescentar rotulo="Acrescentar pessoa" placeholder="Nome da pessoa" aoAcrescentar={(v) => setMembros((l) => juntarUnico(l, v))} />
          <p className="ffbv-nota">A 1.ª pessoa fica a azul e a 2.ª a cor-de-rosa nos gráficos.</p>
        </>
      ) : null}
      <button type="button" className={`ffbv-op${soEu ? ' sel' : ''}`} aria-pressed={soEu} onClick={() => setSoEu((v) => !v)}>
        <span className="ffbv-r" aria-hidden="true" /><span>Só eu<small>Sem «Quem fez» nas despesas.</small></span>
      </button>
    </>,
    <>
      <h1>Quando recebes o salário?</h1>
      <p className="ffbv-sub">Assim o «Rendimento mensal» mostra o dinheiro do mês certo.</p>
      {([['anterior', 'No fim do mês', 'Ex.: recebes a 28 de outubro — é o dinheiro de novembro.'], ['proprio', 'No início do mês', 'Ex.: recebes a 1 de novembro — é o dinheiro de novembro.']] as const).map(([v, t, s]) => (
        <button key={v} type="button" className={`ffbv-op${salario === v ? ' sel' : ''}`} aria-pressed={salario === v} onClick={() => setSalario(v)}>
          <span className="ffbv-r" aria-hidden="true" /><span>{t}<small>{s}</small></span>
        </button>
      ))}
      <p className="ffbv-rot">As tuas contas</p>
      <div className="ffbv-chips"><span className="ffbv-chip fixa">Principal</span></div>
      <Lista itens={contas} tirar={(i) => setContas((l) => l.filter((_, k) => k !== i))} />
      <Acrescentar rotulo="Acrescentar conta" placeholder="Ex.: Cartão refeição" aoAcrescentar={(v) => setContas((l) => juntarUnico(l, v))} />
      <p className="ffbv-nota">Escolhes a conta em cada movimento. Os saldos não aparecem.</p>
    </>,
    <>
      <h1>Tens carro ou animais?</h1>
      <p className="ffbv-sub">Assim os abastecimentos e as idas ao veterinário ficam organizados à parte.</p>
      <button type="button" className="ffbv-op ffbv-sw-linha" aria-pressed={temCarro} onClick={() => setTemCarro((v) => !v)}><span>🚗 Tenho carro ou mota</span><span className={`ffbv-sw${temCarro ? ' on' : ''}`} aria-hidden="true" /></button>
      {temCarro ? (
        <>
          <Lista itens={viaturas.map((v) => `${v.name} · ${v.type}`)} tirar={(i) => setViaturas((l) => l.filter((_, k) => k !== i))} />
          <Acrescentar
            rotulo="Acrescentar viatura" placeholder="Nome (ex.: Clio)" aoAcrescentar={(v) => setViaturas((l) => (l.some((x) => x.name === v) ? l : [...l, { name: v, type: tipoViatura }]))}
            extra={<select aria-label="Tipo da viatura" value={tipoViatura} onChange={(e) => setTipoViatura(e.target.value as 'carro' | 'mota')}><option value="carro">Carro</option><option value="mota">Mota</option></select>}
          />
        </>
      ) : null}
      <button type="button" className="ffbv-op ffbv-sw-linha" aria-pressed={temAnimais} onClick={() => setTemAnimais((v) => !v)}><span>🐾 Tenho animais de estimação</span><span className={`ffbv-sw${temAnimais ? ' on' : ''}`} aria-hidden="true" /></button>
      {temAnimais ? (
        <>
          <Lista itens={animais.map((a) => `${a.name} · ${a.sex === 'f' ? 'fêmea' : 'macho'}`)} tirar={(i) => setAnimais((l) => l.filter((_, k) => k !== i))} />
          <Acrescentar
            rotulo="Acrescentar animal" placeholder="Nome do animal" aoAcrescentar={(v) => setAnimais((l) => (l.some((x) => x.name === v) ? l : [...l, { name: v, sex: sexo }]))}
            extra={<select aria-label="Sexo do animal" value={sexo} onChange={(e) => setSexo(e.target.value as 'm' | 'f')}><option value="f">Fêmea</option><option value="m">Macho</option></select>}
          />
        </>
      ) : null}
      <p className="ffbv-nota">Sem carro, a página Combustível fica fora do menu «Mais»; sem animais, a do Veterinário. Voltam quando acrescentares um em Definições › Perfil e família.</p>
    </>,
    <>
      <h1>Protege os teus dados</h1>
      <p className="ffbv-sub">Os dados só existem neste telemóvel.</p>
      <button type="button" className="ffbv-op ffbv-sw-linha" aria-pressed={comPin} onClick={() => setComPin((v) => !v)}>
        <span>🔐 Pedir um PIN ao abrir<small>4 algarismos. Depois podes usar a impressão digital.</small></span><span className={`ffbv-sw${comPin ? ' on' : ''}`} aria-hidden="true" />
      </button>
      {comPin ? (
        <div className="ffbv-pin">
          <input type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" aria-label="PIN" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <input type="password" inputMode="numeric" maxLength={4} autoComplete="new-password" aria-label="Confirmar PIN" placeholder="Repetir" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
        </div>
      ) : null}
      <div className="ffbv-item ffbv-item-col"><i aria-hidden="true">☁️</i><div>Faz cópias de segurança<small>Se mudares ou perderes o telemóvel, só o backup recupera os dados. A app lembra-te todos os meses (Definições › Backup).</small></div></div>
    </>,
  ];

  return (
    <div className="ffbv" role="dialog" aria-modal="true" aria-label="Boas-vindas">
      <form className="ffbv-tel" onSubmit={seguinte}>
        <button type="button" className="ffbv-saltar" onClick={() => void terminar(true)}>Saltar</button>
        <div className="ffbv-pontos" aria-label={`Passo ${passo + 1} de ${PASSOS}`}>{Array.from({ length: PASSOS }, (_, i) => <i key={i} className={i === passo ? 'on' : ''} />)}</div>
        <div key={passo} className="ffbv-ecra">{ecras[passo]}</div>
        {erro ? <p className="ffbv-erro" role="alert">{erro}</p> : null}
        <div className="ffbv-rodape">
          {passo > 0 ? <button type="button" className="ffbv-voltar" onClick={() => { setErro(''); setPasso(passo - 1); }}>Voltar</button> : null}
          <button type="submit" className="ffbv-bt">{passo === 0 ? 'Começar' : passo === PASSOS - 1 ? 'Concluir' : 'Seguinte'}</button>
        </div>
        {passo === 0 ? <button type="button" className="ffbv-bt2" onClick={restaurar}>Já tenho um backup — restaurar</button> : null}
      </form>
    </div>
  );
}
