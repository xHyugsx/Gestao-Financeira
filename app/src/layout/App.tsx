import { type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EcraBloqueio } from '../bloqueio/EcraBloqueio';
import { ligacoes } from '../bloqueio/estado';
import { PREFIXO, VERSAO } from '../config';
import { iniciarEspaco } from '../definicoes/espaco';
import { pedirPersistencia } from '../definicoes/persistencia';
import { iniciarAvisos } from '../definicoes/lembreteBackup';
import type { AcoesBackup, AcoesImportacao } from '../definicoes/Seccoes';
import { FolhaDefinicoes, MenuRapido, type PosicaoMenu, type Seccao } from '../definicoes/Definicoes';
import { acertarSaldo, aplicarBackup, chave, cifrarBackup, criarBackup, decifrarBackup, eBackupCifrado, dia, saldoDaConta, type Estado, inicioDoMes, lerBackup, type LeituraBackup, MESES, type Movimento, nomeFicheiroBackup, PREFIXO_REAL } from '../dados';
import { aviso as avisoVeterinario, definir as definirLembretes, todos as todosLembretes } from '../veterinario/lembretes';
import { useDados } from '../estado/useDados';
import { aspetosCategorias } from '../movimentos/categorias';
import { ApagarRecorrente, EditarMovimento } from '../movimentos/EditarMovimento';
import { aplicarJuncao, novoLote, prepararJuncao, semJuncao, ultimaJuncao } from '../movimentos/juntar';
import { criaCopias, gerarRecorrentes, saltarEsteMes, semSaltados, tipoNaSerie } from '../movimentos/recorrentes';
import { tipoVisual } from '../movimentos/regras';
import { regrasPessoais } from '../importacao/config';
import { lerFicheiro } from '../importacao/leitura';
import { abrirRevisao, type ApiImportacao, desfazerImportacao, haImportacaoParaDesfazer, reabrirRevisao } from '../importacao/revisao';
import { Jarvis, type Mensagem, mensagensGuardadas } from '../jarvis/Jarvis';
import { type ContextoJarvis, MotorJarvis } from '../jarvis/motor';
import { lerDocumento, textoDoPdf } from '../jarvis/recibos';
import { pessoasDosSalarios } from '../paginas/Resumo';
import { animais, animaisDe, definirAnimais } from '../veterinario/animais';
import { feito as lembreteFeito, info as infoLembrete, ordenados as lembretesOrdenados } from '../veterinario/lembretes';
import { formatarEuros } from '../ui/formatos';
import { type EscolhasNovo, NovoMovimento } from '../movimentos/NovoMovimento';
import { Analise, type TipoAnalise } from '../paginas/Analise';
import { Calendario } from '../paginas/Calendario';
import { Categorias, VISTA_CATEGORIAS, type VistaCategorias } from '../paginas/Categorias';
import { diasDoMes } from '../paginas/calculos';
import { Combustivel } from '../paginas/Combustivel';
import { EmConstrucao } from '../paginas/EmConstrucao';
import { NovaDespesaVet, NovoAbastecimento } from '../paginas/JanelasRegisto';
import { JanelaFotografia, Veterinario, VISTA_VETERINARIO, type VistaVeterinario } from '../paginas/Veterinario';
import { type PeriodoResumo, Resumo, type SeccaoResumo } from '../paginas/Resumo';
import { type ListaMovimentos, Principal } from '../paginas/Principal';
import { Botao } from '../ui/Botao';
import { Icone } from '../ui/Icone';
import { useAnimacaoNumeros } from './animacaoNumeros';
import { aplicarTema, temaDe } from '../ui/temas';
import { saudacao, svgDoCeu } from './ceu';
import { PAGINAS, PAGINAS_MAIS } from './paginas';

type Direcao = 'left' | 'right';

/** Descarrega um ficheiro gerado na app (backup, CSV). */
function descarregar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo })), a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Movimentos em CSV (Excel/Sheets), do mais recente para o mais antigo — mesmo formato da app atual. */
function csvDosMovimentos(movimentos: Estado['transactions']): string {
  const aspas = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const tipos: Record<string, string> = { expense: 'Despesa', income: 'Receita', transfer: 'Transferência' };
  const linhas = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (€)', 'Nota'],
    ...[...movimentos].sort((a, b) => b.date.localeCompare(a.date))
      .map((m) => [m.date, m.title, m.detail.split('·').pop()?.trim() || '', tipos[m.movementType ?? ''], m.amount.toFixed(2).replace('.', ','), m.note || ''])];
  return `\uFEFF${linhas.map((l) => l.map(aspas).join(';')).join('\r\n')}`;
}
interface Transicao { para: string; dir: Direcao; dx: number; volta?: boolean }
interface Toque { x: number; y: number; t: number; eixo: 'x' | 'y' | null; dx?: number }

const NAO_DESLIZA = "input, textarea, select, [role='slider'], .segmented, .calendar-grid, table, .bottom-nav, [role='dialog']";
const ids = PAGINAS.map((p) => p.id);
const reduzMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const [estado, setEstado] = useDados();
  // O que as páginas mostram e contam: sem as cópias saltadas dos recorrentes («só este mês»)
  const visivel = useMemo(() => semSaltados(estado), [estado]);
  const [pagina, setPagina] = useState('principal');
  const [direcao, setDirecao] = useState<Direcao | ''>('');
  const [transicao, setTransicao] = useState<Transicao | null>(null);
  const [arrasto, setArrasto] = useState(0);
  const [aArrastar, setAArrastar] = useState(false);
  const toque = useRef<Toque | null>(null);
  const [desvioMes, setDesvioMes] = useState(0);
  const [agora, setAgora] = useState(() => new Date());
  const [mais, setMais] = useState<boolean | 'out'>(false);
  const [bloqueada, setBloqueada] = useState(() => !!estado.pinHash);
  const [lista, setLista] = useState<ListaMovimentos>({ expandida: false, pesquisa: '', conta: 'all' });
  const [aviso, setAviso] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [escolhas, setEscolhas] = useState<EscolhasNovo>({ tipo: 'expense', categoria: 'Alimentação', recorrente: false, tipoValor: 'com', periodicidade: 1, revolut: false });
  const [aEditar, setAEditar] = useState<Movimento | null>(null);
  const [menu, setMenu] = useState<PosicaoMenu | null>(null);
  const [folha, setFolha] = useState<'list' | 'direct' | null>(null);
  const [seccao, setSeccao] = useState<Seccao | null>(null);
  const [teclado, setTeclado] = useState(0);
  const [jarvis, setJarvis] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensGuardadas);
  const motor = useRef(new MotorJarvis()).current;
  const fecharJarvisT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const folhaAberta = useRef(folha);
  folhaAberta.current = folha;
  const [ultimoBackup, setUltimoBackup] = useState(() => { try { return localStorage.getItem(chave('ultimoBackup', PREFIXO)) || ''; } catch { return ''; } });
  const [mensagemBackup, setMensagemBackup] = useState('');
  const [protegido, setProtegido] = useState<boolean | null | undefined>(undefined);
  useEffect(() => { void pedirPersistencia().then(setProtegido); }, []);
  const estadoAtual = useRef(estado);
  estadoAtual.current = estado;
  // Escolhas dentro das páginas (mantêm-se ao mudar de página, como na app atual)
  const [tipoAnalise, setTipoAnalise] = useState<TipoAnalise>('gastos');
  const [vistaCategorias, setVistaCategorias] = useState<VistaCategorias>(VISTA_CATEGORIAS);
  const [seccaoResumo, setSeccaoResumo] = useState<SeccaoResumo>('resumo');
  const [periodoResumo, setPeriodoResumo] = useState<PeriodoResumo>('mes');
  const [diaEscolhido, setDiaEscolhido] = useState(() => new Date().getDate());
  const [vistaVet, setVistaVet] = useState<VistaVeterinario>(VISTA_VETERINARIO);
  const mudarVistaVet = (v: Partial<VistaVeterinario>) => setVistaVet((a) => ({ ...a, ...v }));
  const [abastecimento, setAbastecimento] = useState(false);
  const [despesaVet, setDespesaVet] = useState(false);

  definirAnimais(animaisDe(estado, todosLembretes()));
  const ocultos = estado.hideValues;
  const setOcultos = useCallback((v: boolean | ((a: boolean) => boolean)) =>
    setEstado((s) => ({ ...s, hideValues: typeof v === 'function' ? v(s.hideValues) : v })), [setEstado]);
  const mes = inicioDoMes(agora, desvioMes);
  const diasMes = diasDoMes(mes);
  useEffect(() => { setDiaEscolhido((d) => Math.min(d, diasMes)); }, [diasMes]);
  const aparencia = estado.appearance;
  const tema = temaDe(aparencia);
  useEffect(() => { aplicarTema(bloqueada ? null : tema); }, [tema, bloqueada]);

  const vibrar = useCallback((padrao: number | number[]) => {
    try { if (aparencia.haptics !== false) navigator.vibrate?.(padrao); } catch { /* sem vibração */ }
  }, [aparencia.haptics]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  const tirarFoco = () => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); };
  const mudarMovimentos = (f: (l: Movimento[]) => Movimento[]) => setEstado((s) => ({ ...s, transactions: f(s.transactions) }));
  const guardarNovo = (m: Movimento) => { mudarMovimentos((l) => [m, ...l]); vibrar(30); tirarFoco(); setNovoAberto(false); };
  const guardarRegisto = (m: Movimento) => { mudarMovimentos((l) => [m, ...l]); vibrar(30); tirarFoco(); setAbastecimento(false); setDespesaVet(false); };
  const guardarEdicao = (m: Movimento) => {
    mudarMovimentos((l) => tipoNaSerie(l.map((x) => (x.id === m.id ? m : x)), l.find((x) => x.id === m.id), m)); vibrar(30); tirarFoco(); setAEditar(null);
  };
  const [aApagarSerie, setAApagarSerie] = useState<Movimento | null>(null);
  const apagar = (m: Movimento) => { mudarMovimentos((l) => l.filter((x) => x.id !== m.id)); vibrar([40, 60, 40]); setAEditar(null); setAApagarSerie(null); };
  const eliminar = (m: Movimento) => {
    // A cópia mais recente de uma série é a que cria a seguinte: apagá-la parava a série sem aviso
    if (criaCopias(m)) { setAEditar(null); setAApagarSerie(m); return; }
    if (!window.confirm(`Eliminar "${m.title}"?`)) return;
    apagar(m);
  };
  const saltarMes = (m: Movimento) => { mudarMovimentos((l) => saltarEsteMes(l, m)); vibrar(30); setAApagarSerie(null); };

  // Definições: menu rápido da roda dentada e folha das Definições (o botão "voltar" do telemóvel fecha a folha)
  const sairFolha = useCallback((depois: () => void) => {
    const f = document.querySelector('.settings-sheet');
    if (!f || reduzMovimento()) { depois(); return; }
    if (f.classList.contains('is-out')) return;
    f.classList.add('is-out');
    setTimeout(() => { f.classList.remove('is-out'); depois(); }, 260);
  }, []);
  const abrirFolha = (modo: 'list' | 'direct', s?: Seccao) => {
    setSeccao(s || null); setFolha(modo);
    window.history.pushState({ ...window.history.state, ffSheet: true }, '');
  };
  const fecharFolha = useCallback(() => {
    if (window.history.state?.ffSheet) window.history.back();
    else sairFolha(() => { setFolha(null); setSeccao(null); });
  }, [sairFolha]);
  const fecharMenu = useCallback(() => {
    setMenu((m) => m && { ...m, out: true });
    setTimeout(() => setMenu(null), 220);
  }, []);
  // Botão "voltar" do telemóvel: fecha as Definições ou, numa página que não seja a Principal, volta à Principal
  useEffect(() => {
    if (pagina !== 'principal' && window.history.state?.financeTab !== true) window.history.pushState({ ...window.history.state, financeTab: true }, '');
    const f = () => {
      if (folhaAberta.current) { sairFolha(() => { setFolha(null); setSeccao(null); }); return; }
      setPagina('principal');
    };
    window.addEventListener('popstate', f);
    return () => window.removeEventListener('popstate', f);
  }, [pagina, sairFolha]);
  useEffect(() => {
    if (!menu && !folha) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (menu) fecharMenu(); else fecharFolha(); } };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [menu, folha, fecharMenu, fecharFolha]);
  useEffect(() => {
    if (!folha && !jarvis) { setTeclado(0); return; }
    const v = window.visualViewport;
    const f = () => { if (v) setTeclado(Math.max(0, Math.round(window.innerHeight - v.height - v.offsetTop))); };
    f();
    v?.addEventListener('resize', f); v?.addEventListener('scroll', f);
    return () => { v?.removeEventListener('resize', f); v?.removeEventListener('scroll', f); };
  }, [folha, jarvis]);

  const irPara = useCallback((para: string, dx = 0) => {
    if (!para || para === pagina || transicao || !ids.includes(para)) return;
    const dir: Direcao = ids.indexOf(para) > ids.indexOf(pagina) ? 'left' : 'right';
    const moldura = document.querySelector('.app-shell');
    setDirecao(dir);
    if (reduzMovimento()) { setPagina(para); setArrasto(0); moldura?.scrollTo({ top: 0 }); return; }
    if (!dx) moldura?.scrollTo({ top: 0 });
    setTransicao({ para, dir, dx });
    setTimeout(() => { setPagina(para); setTransicao(null); setArrasto(0); moldura?.scrollTo({ top: 0 }); }, 340);
  }, [pagina, transicao]);

  const fecharMais = useCallback(() => {
    setMais((m) => (m ? 'out' : m));
    setTimeout(() => setMais((m) => (m === 'out' ? false : m)), 200);
  }, []);

  // Ligações usadas pelo bloqueio automático e pelos módulos ainda reaproveitados
  useEffect(() => {
    ligacoes.bloquear = () => (estado.pinHash ? (setBloqueada(true), true) : false);
    window.ffMoreClose = fecharMais;
    window.ffGoPg = irPara;
  }, [estado.pinHash, fecharMais, irPara]);

  // Relógio (saudação e céu): atualiza a cada minuto e ao voltar à app
  useEffect(() => {
    const f = () => setAgora(new Date());
    const i = setInterval(() => { if (document.visibilityState === 'visible') f(); }, 6e4);
    document.addEventListener('visibilitychange', f);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', f); };
  }, []);

  // Backup: criar (descarregar), restaurar, exportar CSV; registo da data do último backup
  const registarBackup = useCallback(() => {
    const d = new Date().toISOString();
    setUltimoBackup(d);
    try { localStorage.setItem(chave('ultimoBackup', PREFIXO), d); } catch { /* sem armazenamento */ }
  }, []);
  const conteudoBackup = useCallback(() => {
    let jarvisThreads: unknown[] = [];
    try { const j: unknown = JSON.parse(localStorage.getItem(chave('conversaJarvis', PREFIXO)) || '[]'); if (Array.isArray(j)) jarvisThreads = j; } catch { /* sem conversa */ }
    return criarBackup(estadoAtual.current, { jarvisThreads, vetReminders: todosLembretes() });
  }, []);
  const descarregarBackup = useCallback(() => {
    descarregar(nomeFicheiroBackup(), JSON.stringify(conteudoBackup(), null, 2), 'application/json');
    setMensagemBackup('Cópia de segurança descarregada.');
    registarBackup();
  }, [conteudoBackup, registarBackup]);
  /** Lê um ficheiro de backup (normal ou protegido); `'senha'` se faltar a palavra-passe, `'errada'` se não servir. */
  const lerFicheiroBackup = async (f: File, senha?: string): Promise<'senha' | 'errada' | LeituraBackup> => {
    let texto = await f.text();
    let t: unknown = null;
    try { t = JSON.parse(texto); } catch { /* inválido: tratado em lerBackup */ }
    if (eBackupCifrado(t)) {
      if (!senha) return 'senha';
      const claro = await decifrarBackup(t, senha);
      if (claro == null) return 'errada';
      texto = claro;
    }
    return lerBackup(texto);
  };
  const acoesBackup: AcoesBackup = {
    criar: descarregarBackup,
    exportarCsv: () => {
      descarregar(`financas-familiar-movimentos-${new Date().toISOString().slice(0, 10)}.csv`, csvDosMovimentos(visivel.transactions), 'text/csv;charset=utf-8');
      setMensagemBackup('Ficheiro CSV descarregado.');
    },
    criarProtegido: async (senha) => {
      const b = await cifrarBackup(JSON.stringify(conteudoBackup()), senha);
      descarregar(nomeFicheiroBackup().replace('.json', '-protegido.json'), JSON.stringify(b, null, 2), 'application/json');
      setMensagemBackup('Cópia de segurança protegida descarregada.');
      registarBackup();
    },
    restaurar: async (f, senha) => {
      const r = await lerFicheiroBackup(f, senha);
      if (typeof r === 'string') return r;
      if (!r.ok) { setMensagemBackup('Ficheiro inválido. Escolha uma cópia JSON exportada por esta app.'); return; }
      if (!window.confirm('Restaurar esta cópia? Os dados atuais serão substituídos.')) return;
      setEstado((s) => aplicarBackup(s, r.dados));
      if (r.jarvisThreads) { try { localStorage.setItem(chave('conversaJarvis', PREFIXO), JSON.stringify(r.jarvisThreads)); } catch { /* sem espaço */ } }
      if (r.vetReminders) definirLembretes(r.vetReminders);
      setMensagemBackup('Cópia restaurada com sucesso.');
    },
    juntar: async (f, senha) => {
      const r = await lerFicheiroBackup(f, senha);
      if (typeof r === 'string') return r;
      if (!r.ok) { setMensagemBackup('Ficheiro inválido. Escolha o backup JSON exportado pela app no outro telemóvel.'); return; }
      const { novos, repetidos } = prepararJuncao(estadoAtual.current.transactions, r.dados.transactions as unknown[]);
      const jaHavia = repetidos ? ` (${repetidos} já existiam aqui)` : '';
      if (!novos.length) { setMensagemBackup(`Não há movimentos novos para juntar${jaHavia}.`); return; }
      const n = novos.length === 1 ? '1 movimento novo' : `${novos.length} movimentos novos`;
      if (!window.confirm(`Juntar ${n}${jaHavia}? Os saldos das contas deste telemóvel não mudam.`)) return;
      const lote = novoLote();
      setEstado((s) => aplicarJuncao(s, prepararJuncao(s.transactions, novos).novos, lote));
      setMensagemBackup(`Juntados ${n}.`);
    },
    haJuncao: !!ultimaJuncao(estado.transactions),
    desfazerJuncao: () => {
      const lote = ultimaJuncao(estadoAtual.current.transactions);
      if (!lote || !window.confirm('Desfazer a última junção? Os movimentos que vieram do outro telemóvel nessa vez são removidos.')) return;
      mudarMovimentos((l) => semJuncao(l, lote));
      setMensagemBackup('Junção desfeita.');
    },
  };
  const limparDados = () => {
    try {
      Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
        .filter((k): k is string => !!k && (k.startsWith(PREFIXO_REAL) || k.startsWith(PREFIXO)))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* sem armazenamento */ }
    window.location.reload();
  };
  // Importação de extratos (Definições › Importação; mais tarde também pelo Jarvis)
  const [, setImportacoes] = useState(0);
  const avisarImportacao = useRef<(m: string) => void>(() => {});
  const apiImportacao: ApiImportacao = {
    obter: () => {
      const e = estadoAtual.current, hoje = new Date();
      return {
        tx: e.transactions.filter((m) => !m.skipped), cats: e.categories, inc: e.incomeCategories, sal: e.salaries,
        acc: e.accounts.map((a) => ({ id: a.id, name: a.name, balance: a.balance || 0, cur: saldoDaConta(a, e.transactions, hoje).atual })),
      };
    },
    regrasPessoais: () => regrasPessoais(estadoAtual.current),
    juntarMovimentos: (l) => mudarMovimentos((m) => [...l, ...m]),
    removerLote: (lote) => mudarMovimentos((m) => m.filter((t) => t.importBatch !== lote)),
    juntarCategorias: (l) => setEstado((s) => ({ ...s, categories: [...s.categories, ...l.filter((c) => !s.categories.includes(c))] })),
    definirSalario: (ano, pessoa, mes, valor) => setEstado((s) => {
      const doAno = s.salaries[ano] ?? {}, lista = [...(doAno[pessoa] ?? Array(12).fill(0))];
      lista[mes] = valor;
      return { ...s, salaries: { ...s.salaries, [ano]: { ...doAno, [pessoa]: lista } } };
    }),
    acertarSaldo: (id, saldo) => {
      const e = estadoAtual.current, conta = e.accounts.find((a) => a.id === id);
      if (!conta) return null;
      const nova = acertarSaldo(conta, e.transactions, saldo, new Date());
      setEstado((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? nova : a)) }));
      return conta;
    },
    reporConta: (c) => setEstado((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id !== c.id ? a : c.name ? c : { ...a, balance: c.balance })) })),
    tipoVisual: (tipo, categoria) => tipoVisual(tipo, categoria),
    dizer: (t) => { avisarImportacao.current(t); setImportacoes((n) => n + 1); },
  };
  const acoesImportacao: AcoesImportacao = {
    haParaDesfazer: haImportacaoParaDesfazer(),
    importar: async (f, avisar) => {
      avisarImportacao.current = avisar;
      let ext = null;
      try { ext = await lerFicheiro(f); } catch { /* ficheiro ilegível */ }
      avisar(ext ? abrirRevisao(ext, apiImportacao) : 'Não reconheci este ficheiro como um extrato bancário (XLSX, XLS ou CSV com data, descrição e valor).');
    },
    desfazer: (avisar) => {
      if (!window.confirm('Desfazer a última importação?')) return;
      avisar(desfazerImportacao(apiImportacao)); setImportacoes((n) => n + 1);
    },
  };
  // Jarvis: contexto do motor, anexos (backup, recibos, extratos) e fecho animado
  const juntarJarvis = (content: string) => setMensagens((m) => [...m, { role: 'assistant' as const, content }].slice(-100));
  const contextoJarvis = (): ContextoJarvis => ({
    estado: semSaltados(estadoAtual.current), mes, agora, eur: (v) => formatarEuros(v, ocultos),
    saldoAtual: (c) => saldoDaConta(c, estadoAtual.current.transactions, new Date()).atual,
    mudarMovimentos, mudarContas: (f) => setEstado((s) => ({ ...s, accounts: f(s.accounts) })),
    definirSalario: apiImportacao.definirSalario, vibrar, criarBackup: descarregarBackup,
    vet: { todos: todosLembretes, ordenados: lembretesOrdenados, feito: lembreteFeito, info: infoLembrete },
    importacao: {
      desfazer: () => { const r = desfazerImportacao(apiImportacao); setImportacoes((n) => n + 1); return r; },
      reabrir: () => { avisarImportacao.current = juntarJarvis; return reabrirRevisao(apiImportacao); },
    },
  });
  const pessoas = () => pessoasDosSalarios(estadoAtual.current.salaries, estadoAtual.current.profile.members);
  const vocabularioJarvis = () => {
    const e = estadoAtual.current;
    return [...e.transactions.map((t) => t.title), ...e.categories, ...e.incomeCategories, ...e.accounts.map((a) => a.name), ...pessoas(), ...animais()];
  };
  const lerDoc = (txt: string) => {
    const e = estadoAtual.current;
    const l = lerDocumento(txt, { pessoas: pessoas(), regras: regrasPessoais(e), contas: e.accounts, salarios: e.salaries, agora: new Date(), eur: (v) => formatarEuros(v, ocultos) });
    motor.pendente = l.pendente ?? motor.pendente;
    return l.texto;
  };
  const lerAnexo = async (f: File): Promise<string> => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    try {
      if (ext === 'json') {
        const texto = await f.text(), t = JSON.parse(texto) as { data?: { transactions?: unknown }; transactions?: unknown } | null;
        if (eBackupCifrado(t)) return 'Este backup está protegido com palavra-passe. Restaura-o em Definições › Backup.';
        if (!Array.isArray((t?.data ?? t)?.transactions)) return 'Este JSON não parece um backup desta app (falta a lista de movimentos).';
        const r = lerBackup(texto);
        if (!r.ok) return 'Ficheiro inválido. Escolha uma cópia JSON exportada por esta app.';
        if (!window.confirm('Restaurar esta cópia? Os dados atuais serão substituídos.')) return 'Importação cancelada.';
        setEstado((s) => aplicarBackup(s, r.dados));
        if (r.jarvisThreads) { try { localStorage.setItem(chave('conversaJarvis', PREFIXO), JSON.stringify(r.jarvisThreads)); } catch { /* sem espaço */ } }
        if (r.vetReminders) definirLembretes(r.vetReminders);
        setMensagemBackup('Cópia restaurada com sucesso.');
        return 'Cópia restaurada com sucesso. ✅';
      }
      if (ext === 'pdf') {
        const txt = await textoDoPdf(f);
        return txt.trim().length < 20 ? 'Este PDF parece ser uma imagem digitalizada — não tem texto para ler. Tenta exportar como .txt/.csv ou escreve os valores aqui.' : lerDoc(txt);
      }
      if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(ext)) return 'Ainda não consigo ler imagens/fotos. Escreve os valores aqui ou usa um ficheiro .txt/.csv.';
      if (['xlsx', 'xls', 'csv', 'txt'].includes(ext)) {
        const extrato = await lerFicheiro(f);
        if (extrato) { avisarImportacao.current = juntarJarvis; return abrirRevisao(extrato, apiImportacao); }
        return ext === 'csv' || ext === 'txt' ? lerDoc(await f.text()) : 'Não reconheci este ficheiro como um extrato. Envia-me um exemplo e ensino o Jarvis a lê-lo.';
      }
      return lerDoc(await f.text());
    } catch {
      return ext === 'xls' ? 'Não consegui ler este ficheiro .xls. Tenta exportar em .xlsx ou .csv.'
        : ext === 'pdf' ? 'Não consegui ler este PDF. Tenta exportar como .txt/.csv.' : 'Não consegui ler este ficheiro.';
    }
  };
  const fecharJarvis = useCallback(() => {
    const o = document.querySelector('.jarvis-overlay');
    if (o?.classList.contains('is-out')) return;
    if (!o || reduzMovimento()) { setJarvis(false); return; }
    o.classList.add('is-out');
    fecharJarvisT.current = setTimeout(() => setJarvis(false), 220);
  }, []);
  useEffect(() => {
    if (!jarvis) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharJarvis(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [jarvis, fecharJarvis]);
  useEffect(() => { window.ffImpApi = { get: () => apiImportacao.obter() }; });

  // Atalhos do ícone da app (manifesto): ?acao=despesa | jarvis — depois do desbloqueio; o endereço fica limpo
  const acaoInicial = useRef(new URLSearchParams(window.location.search).get('acao'));
  useEffect(() => {
    const acao = acaoInicial.current;
    if (!acao || bloqueada) return;
    acaoInicial.current = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('acao');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (acao === 'despesa') {
      setEscolhas((e) => ({ ...e, tipo: 'expense', recorrente: false, tipoValor: 'com', periodicidade: 1, revolut: false }));
      setNovoAberto(true);
    } else if (acao === 'jarvis') setJarvis(true);
  }, [bloqueada]);

  // Interface da app atual usada pelos avisos e pelo Jarvis; avisos ao abrir e de espaço
  useEffect(() => {
    window.ffBk = { get count() { return estadoAtual.current.transactions.length; }, payload: conteudoBackup, download: descarregarBackup, done: registarBackup };
  }, [conteudoBackup, descarregarBackup, registarBackup]);
  const abrirBackupRef = useRef(() => {});
  abrirBackupRef.current = () => { setMensagemBackup(''); setSeccao('backup'); setFolha('direct'); window.history.pushState({ ...window.history.state, ffSheet: true }, ''); };
  useEffect(() => {
    iniciarEspaco({ fazerBackup: () => window.ffBk?.download(), verEspaco: () => abrirBackupRef.current() });
    iniciarAvisos(
      { contar: () => estadoAtual.current.transactions.length, conteudo: () => window.ffBk?.payload(), descarregar: () => window.ffBk?.download(), feito: () => window.ffBk?.done() },
      () => avisoVeterinario((p) => window.ffGoPg?.(p)),
    );
  }, []);

  // Recorrentes com periodicidade: cria as cópias em falta ao abrir, quando muda o dia e depois de cada alteração
  const hojeTexto = dia(agora);
  useEffect(() => {
    setEstado((s) => { const l = gerarRecorrentes(s.transactions, new Date()); return l ? { ...s, transactions: l } : s; });
  }, [hojeTexto, estado.transactions, setEstado]);

  // Ocultar valores ao sair da app (Aparência › "autoHide")
  useEffect(() => {
    const modo = aparencia.autoHide ?? 'now';
    if (modo === 'off') return;
    let t0 = 0;
    const f = () => {
      if (document.visibilityState === 'hidden') { t0 = Date.now(); if (modo === 'now') setOcultos(true); }
      else if (modo === '60' && t0 && Date.now() - t0 >= 6e4) setOcultos(true);
    };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [aparencia.autoHide, setOcultos]);

  useAnimacaoNumeros(`${transicao ? transicao.para : pagina}|${desvioMes}|1`, transicao ? '.page-incoming' : '.page-current', ocultos || bloqueada);

  if (bloqueada) return <EcraBloqueio key="ff-lock" hash={estado.pinHash} aoDesbloquear={() => setBloqueada(false)} />;

  const inicioToque = (e: TouchEvent) => {
    const alvo = e.target as HTMLElement;
    if (transicao || novoAberto || aEditar || alvo.closest(NAO_DESLIZA)) { toque.current = null; return; }
    const p = e.touches[0];
    if (p) toque.current = { x: p.clientX, y: p.clientY, t: Date.now(), eixo: null };
  };
  const moverToque = (e: TouchEvent) => {
    const s = toque.current, p = e.touches[0];
    if (!s || !p) return;
    const dx = p.clientX - s.x, dy = p.clientY - s.y;
    if (!s.eixo) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      s.eixo = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
      if (s.eixo === 'y') { toque.current = null; return; }
      setAArrastar(true);
    }
    const k = ids.indexOf(pagina), naBorda = dx < 0 ? !ids[k + 1] : !ids[k - 1];
    s.dx = naBorda ? dx * 0.3 : dx;
    setArrasto(s.dx);
  };
  const fimToque = () => {
    const s = toque.current;
    toque.current = null;
    if (!s || s.eixo !== 'x') return;
    const dx = s.dx || 0, largura = document.querySelector('.page-viewport')?.clientWidth || window.innerWidth || 400;
    const para = ids[ids.indexOf(pagina) + (dx < 0 ? 1 : -1)], rapido = Math.abs(dx) > 50 && Date.now() - s.t < 350;
    setAArrastar(false);
    if (para && (Math.abs(dx) > largura * 0.28 || rapido)) irPara(para, dx);
    else if (para && dx) {
      setTransicao({ para, dir: dx < 0 ? 'left' : 'right', dx, volta: true });
      setTimeout(() => { setTransicao(null); setArrasto(0); }, 300);
    } else setArrasto(0);
  };
  const cancelarToque = () => { toque.current = null; setAArrastar(false); setArrasto(0); };

  const conteudo = (id: string) => {
    switch (id) {
      case 'principal':
        return <Principal estado={visivel} todos={estado.transactions} mes={mes} ocultos={ocultos} lista={lista} mudarLista={setLista} vibrar={vibrar} abrirMovimento={setAEditar} />;
      case 'analise':
        return <Analise estado={visivel} mes={mes} ocultos={ocultos} tipo={tipoAnalise} mudarTipo={setTipoAnalise} />;
      case 'calendario':
        return <Calendario estado={visivel} mes={mes} ocultos={ocultos} diaEscolhido={diaEscolhido} escolherDia={setDiaEscolhido} aspetos={aspetosCategorias(visivel, mes)} abrirMovimento={setAEditar} />;
      case 'categorias':
        return (
          <Categorias
            estado={visivel} mes={mes} ocultos={ocultos} vista={vistaCategorias} mudarVista={(v) => setVistaCategorias((a) => ({ ...a, ...v }))}
            mudarEstado={setEstado} categoriaEliminada={(nome) => setEscolhas((e) => (e.categoria === nome ? { ...e, categoria: 'Outros' } : e))}
            categoriaRenomeada={(antigo, novo) => setEscolhas((e) => (e.categoria === antigo ? { ...e, categoria: novo } : e))}
          />
        );
      case 'resumo':
        return <Resumo estado={visivel} todos={estado.transactions} mes={mes} ocultos={ocultos} seccao={seccaoResumo} mudarSeccao={setSeccaoResumo} periodo={periodoResumo} mudarPeriodo={setPeriodoResumo} mudarEstado={setEstado} abrirMovimento={setAEditar} />;
      case 'combustivel':
        return <Combustivel estado={visivel} mes={mes} agora={agora} ocultos={ocultos} abrirMovimento={setAEditar} />;
      case 'veterinario':
        return <Veterinario estado={visivel} mes={mes} ocultos={ocultos} vista={vistaVet} mudarVista={mudarVistaVet} abrirMovimento={setAEditar} />;
      default:
        return <EmConstrucao titulo={PAGINAS.find((p) => p.id === id)?.label ?? id} />;
    }
  };

  const cabecalhoDe = transicao && !transicao.volta ? transicao.para : pagina;
  const nome = (estado.profile?.profileName || '').trim().split(/\s+/)[0];
  const ferramentas = (
    <div className="head-tools">
      <button
        type="button" className={ocultos ? 'head-tool head-tool-on' : 'head-tool'} aria-label={ocultos ? 'Mostrar valores' : 'Ocultar valores'}
        aria-pressed={ocultos} onClick={() => setOcultos((v) => !v)}
      ><Icone nome={ocultos ? 'eye-off' : 'eye'} /></button>
      <button
        type="button" className={menu ? 'head-tool head-tool-on' : 'head-tool'} aria-label="Definições" aria-expanded={!!menu}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ t: Math.round(r.bottom + 8), r: Math.max(8, Math.round(window.innerWidth - r.right)) }); }}
      >
        <Icone nome="settings" />
      </button>
    </div>
  );

  const k = ids.indexOf(pagina);
  const seguinte = transicao ? transicao.para : aArrastar && arrasto ? (arrasto < 0 ? ids[k + 1] : ids[k - 1]) : null;
  const sinal = (transicao ? transicao.dir : arrasto < 0 ? 'left' : 'right') === 'left' ? 1 : -1;
  const larguraVista = document.querySelector('.page-viewport')?.clientWidth || window.innerWidth || 400;
  const progresso = (v: number) => Math.min(1, Math.abs(v) / (larguraVista * 0.6));
  const curva = 'cubic-bezier(.22,1,.36,1)';
  const estiloAtual = transicao
    ? {
      '--pg-x': `${transicao.dx}px`, '--pg-sc': 1 - 0.04 * progresso(transicao.dx), '--pg-b0': `${6 * progresso(transicao.dx)}px`,
      '--pg-to': `${-sinal * 100}%`, animation: transicao.volta ? `pg-back-cur .3s ${curva} both` : `pg-out .34s ${curva} both`,
    }
    : aArrastar
      ? { transform: `translateX(${arrasto}px) scale(${1 - 0.04 * progresso(arrasto)})`, filter: `blur(${6 * progresso(arrasto)}px)`, transition: 'none' }
      : { transition: `transform .3s ${curva}, filter .3s` };
  const estiloSeguinte = transicao
    ? {
      '--pg-from': `calc(${sinal * 100}% + ${transicao.dx}px)`, '--pg-blur': `${6 * (1 - progresso(transicao.dx))}px`,
      '--pg-op': 0.35 + 0.65 * progresso(transicao.dx), '--pg-home': `${sinal * 100}%`,
      animation: transicao.volta ? `pg-back-in .3s ${curva} both` : `pg-in .34s ${curva} both`,
    }
    : { transform: `translateX(calc(${sinal * 100}% + ${arrasto}px))`, filter: `blur(${6 * (1 - progresso(arrasto))}px)`, opacity: 0.35 + 0.65 * progresso(arrasto) };

  const itemNav = (id: string) => {
    const p = PAGINAS.find((x) => x.id === id)!;
    return (
      <Botao key={id} variante="ghost" className={pagina === id ? 'nav-item nav-item-active' : 'nav-item'} onClick={() => irPara(id)}>
        <Icone nome={p.icone} /><span>{p.label}</span>
      </Botao>
    );
  };
  const maisAberto = !!mais && mais !== 'out';

  return (
    <div className={`cosmic-app accent-${tema === 'cosmico' ? aparencia.accent : 'violet'} background-${aparencia.backgroundIntensity} text-size-${aparencia.fontScale}`}>
      <div className="cosmic-field" aria-hidden="true" />
      <div
        className="app-shell" data-swipe={direcao}
        onTouchStart={inicioToque} onTouchMove={moverToque} onTouchEnd={fimToque} onTouchCancel={cancelarToque}
      >
        {cabecalhoDe === 'principal' ? (
          <header className="app-heading app-heading-welcome">
            <div className="welcome-sky" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgDoCeu(agora) }} />
            {ferramentas}
            <div className="min-w-0">
              <p className="eyebrow">{agora.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <h1>{nome ? `${saudacao(agora)}, ${nome}` : saudacao(agora)}</h1>
            </div>
          </header>
        ) : (
          <header className="app-heading app-heading-page">
            <h1 key={cabecalhoDe}>{PAGINAS.find((p) => p.id === cabecalhoDe)?.label}</h1>
            {ferramentas}
          </header>
        )}
        <div className="month-switcher" aria-label="Selecionar mês">
          <Botao variante="ghost" tamanho="icone" onClick={() => setDesvioMes((d) => d - 1)} aria-label="Mês anterior"><Icone nome="chevron-left" /></Botao>
          <span>{`${MESES[mes.getMonth()]} de ${mes.getFullYear()}`}</span>
          <Botao variante="ghost" tamanho="icone" onClick={() => setDesvioMes((d) => d + 1)} aria-label="Mês seguinte"><Icone nome="chevron-right" /></Botao>
        </div>
        <div className="page-viewport">
          <div key={`pg-${pagina}`} className="page-current" style={estiloAtual as React.CSSProperties}>{conteudo(pagina)}</div>
          {seguinte ? (
            <div key={`pg-${seguinte}`} className="page-incoming" style={estiloSeguinte as React.CSSProperties}>{conteudo(seguinte)}</div>
          ) : null}
        </div>
      </div>
      <Botao
        tamanho="icone" className="add-button ffplus"
        aria-label={pagina === 'veterinario' ? 'Adicionar despesa veterinária' : pagina === 'combustivel' ? 'Adicionar abastecimento' : 'Adicionar movimento'}
        onClick={() => {
          if (pagina === 'veterinario') { setDespesaVet(true); return; }
          if (pagina === 'combustivel') { setAbastecimento(true); return; }
          setEscolhas((e) => ({ ...e, recorrente: false, tipoValor: 'com', periodicidade: 1, revolut: false }));
          setNovoAberto(true);
        }}
      >
        <Icone nome="plus" />
      </Botao>
      <button
        type="button" className="jarvis-fab ffjv-fab" aria-label="Abrir Jarvis"
        onClick={() => { clearTimeout(fecharJarvisT.current); document.querySelector('.jarvis-overlay')?.classList.remove('is-out'); setJarvis(true); }}
      >
        <svg className="ffjv-orb o1" viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="16" rx="14.5" ry="5.2" fill="none" stroke="#9ff6ff" strokeOpacity=".75" strokeWidth=".7" transform="rotate(25 16 16)" />
          <circle cx="29.6" cy="12.6" r=".9" fill="#00F0FF" />
        </svg>
        <svg className="ffjv-orb o2" viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="16" rx="14.5" ry="5.2" fill="none" stroke="#9ff6ff" strokeOpacity=".45" strokeWidth=".7" transform="rotate(-30 16 16)" />
        </svg>
      </button>
      <Jarvis
        aberto={jarvis} fechar={fecharJarvis} motor={motor} contexto={contextoJarvis} vocabulario={vocabularioJarvis} lerAnexo={lerAnexo}
        pagina={pagina} nome={nome ?? ''} teclado={teclado} vibrar={vibrar} mensagens={mensagens} mudarMensagens={setMensagens}
      />
      {folha ? (
        <FolhaDefinicoes
          modo={folha} seccao={seccao} mudarSeccao={(s) => { if (s === 'backup') setMensagemBackup(''); setSeccao(s); }} fechar={fecharFolha} teclado={teclado} estado={visivel}
          mudarEstado={setEstado} ultimoBackup={ultimoBackup} mensagemBackup={mensagemBackup} acoesBackup={acoesBackup} limparDados={limparDados} acoesImportacao={acoesImportacao} protegido={protegido}
          categoriaRenomeada={(antigo, novo) => setEscolhas((e) => (e.categoria === antigo ? { ...e, categoria: novo } : e))}
          mudarPin={(pinHash) => setEstado((s) => ({ ...s, pinHash }))}
          mudarAparencia={(appearance) => setEstado((s) => ({ ...s, appearance }))}
        />
      ) : null}
      {menu ? (
        <MenuRapido
          posicao={menu} estado={visivel} versao={VERSAO} fechar={fecharMenu}
          abrir={(s) => { setMenu(null); abrirFolha(s ? 'direct' : 'list', s); }}
        />
      ) : null}
      <nav className="bottom-nav" aria-label="Navegação principal">
        <div className="bottom-nav-inner ffnav">
          {itemNav('principal')}
          {itemNav('analise')}
          <span className="ffnav-gap" aria-hidden="true" />
          {itemNav('calendario')}
          <Botao
            variante="ghost" aria-haspopup="menu" aria-expanded={maisAberto}
            className={`nav-item ffnav-more${PAGINAS_MAIS.includes(pagina) || maisAberto ? ' nav-item-active' : ''}`}
            onClick={() => (maisAberto ? fecharMais() : setMais(true))}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx={5} cy={12} r={2} /><circle cx={12} cy={12} r={2} /><circle cx={19} cy={12} r={2} /></svg>
            <span>Mais</span>
          </Botao>
        </div>
      </nav>
      {mais ? (
        <div className={`ffmore-ov${mais === 'out' ? ' is-out' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) fecharMais(); }}>
          <div className="ffmore" role="menu" aria-label="Mais páginas">
            {PAGINAS.filter((p) => PAGINAS_MAIS.includes(p.id)).map((p) => (
              <button key={p.id} type="button" role="menuitem" className={`ffmore-it${pagina === p.id ? ' on' : ''}`} onClick={() => { fecharMais(); irPara(p.id); }}>
                <Icone nome={p.icone} /><span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <NovoMovimento
        aberto={novoAberto} aoMudar={setNovoAberto} estado={visivel} escolhas={escolhas} mudarEscolhas={setEscolhas}
        aspetos={aspetosCategorias(visivel, mes)} aoGuardar={guardarNovo}
      />
      <NovaDespesaVet aberto={despesaVet} aoMudar={setDespesaVet} aoGuardar={guardarRegisto} animal={vistaVet.animal} />
      <NovoAbastecimento aberto={abastecimento} aoMudar={setAbastecimento} aoGuardar={guardarRegisto} />
      <EditarMovimento movimento={aEditar} fechar={() => setAEditar(null)} estado={visivel} aoGuardar={guardarEdicao} aoEliminar={eliminar} />
      <ApagarRecorrente movimento={aApagarSerie} fechar={() => setAApagarSerie(null)} saltar={saltarMes} parar={apagar} />
      <JanelaFotografia
        animal={vistaVet.fotografia} fotos={estado.petPhotos} fechar={() => mudarVistaVet({ fotografia: null })}
        mudarFotos={(f) => setEstado((s) => ({ ...s, petPhotos: f(s.petPhotos) }))}
      />
      {aviso ? <div className="ffv2-aviso" role="status">{aviso}</div> : null}
    </div>
  );
}
