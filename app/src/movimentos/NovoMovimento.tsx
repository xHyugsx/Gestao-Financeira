import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { dia, eReceitaDeSalario, type Estado, type Movimento, type TipoMovimento } from '../dados';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { Icone } from '../ui/Icone';
import { Segmentado } from '../ui/Segmentado';
import type { aspetosCategorias } from './categorias';
import { alfabetica } from './cores';
import { DIA_DO_SALARIO, PERIODICIDADES } from './recorrentes';
import { novoMovimento } from './regras';
import { COLUNA_SEM_MEMBROS } from './salarios';
import { opcoesQuemFez, pessoasDaFamilia } from './pessoas';
import { categoriaPeloTitulo, categoriaSugerida, titulosAnteriores } from './sugestoes';
import { CamposCombustivel } from './CamposCombustivel';
import { CampoCategoria } from './EscolhaCategoria';
import { EscolhaData, Escolhas, LinhaInterruptor, Rotulo, ValorGrande } from '../ui/Escolhas';
import { simplificar as simplificarTitulo } from './categorias';
import { eCategoriaCombustivel } from './viaturas';

/** Escolhas do formulário que a app atual mantém entre aberturas (tipo e categoria) ou repõe ao abrir. */
export interface EscolhasNovo {
  tipo: TipoMovimento;
  categoria: string;
  recorrente: boolean;
  tipoValor: string;
  /** Meses entre repetições (Mensal = 1, Bimestral = 2, Trimestral = 3, Anual = 12). */
  periodicidade: number;
  /** Cópias no dia do salário (3.º dia útil a contar do fim do mês). */
  diaSalario?: boolean;
  revolut: boolean;
}

interface Props {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  estado: Estado;
  escolhas: EscolhasNovo;
  mudarEscolhas: (e: EscolhasNovo) => void;
  aspetos: ReturnType<typeof aspetosCategorias>;
  aoGuardar: (m: Movimento) => void;
}

const TIPOS = [{ valor: 'expense', rotulo: 'Despesa' }, { valor: 'income', rotulo: 'Receita' }, { valor: 'transfer', rotulo: 'Transferência' }] as const;

export function NovoMovimento({ aberto, aoMudar, estado, escolhas: e, mudarEscolhas, aspetos, aoGuardar }: Props) {
  const mudar = (o: Partial<EscolhasNovo>) => mudarEscolhas({ ...e, ...o });
  const lista = alfabetica(e.tipo === 'income' ? estado.incomeCategories : estado.categories);
  const mapa = e.tipo === 'income' ? aspetos.receitas : aspetos.despesas;
  const semValor = e.recorrente && e.tipoValor === 'sem';
  // Sugestão de categoria pelo histórico, só enquanto a pessoa não escolher a categoria à mão
  const [manual, setManual] = useState(false);
  const [sugerida, setSugerida] = useState<string | null>(null);
  const [origemSugestao, setOrigemSugestao] = useState('do histórico');
  useEffect(() => { if (aberto) { setManual(false); setSugerida(null); } }, [aberto]);
  const tipoComCategoria = e.tipo === 'income' ? 'income' : 'expense';
  const titulos = useMemo(() => (e.tipo === 'transfer' ? [] : titulosAnteriores(estado.transactions, tipoComCategoria)), [estado.transactions, e.tipo, tipoComCategoria]);
  const pessoas = useMemo(() => pessoasDaFamilia(estado), [estado]);
  // «Quem fez» começa em «Ambos» (valor vazio); com um só membro, é dele (v2.61.0)
  const pessoaSugerida = pessoas.length === 1 ? pessoas[0]! : '';
  const escolherCategoria = (categoria: string) => { setManual(true); setSugerida(null); mudar({ categoria }); };
  const [pessoa, setPessoa] = useState(pessoaSugerida);
  const [conta, setConta] = useState('principal');
  const contas = estado.accounts.map((c) => ({ valor: c.id, rotulo: c.name }));
  const temRevolut = estado.accounts.some((c) => c.id === 'revolut');
  const outraConta = (id: string) => contas.find((c) => c.valor !== id)?.valor ?? id;
  const [origem, setOrigem] = useState('principal');
  const [destino, setDestino] = useState(() => outraConta('principal'));
  // cada abertura começa com o formulário limpo (sem o título, o valor ou a nota da vez anterior)
  const [abertura, setAbertura] = useState(0);
  useEffect(() => {
    if (!aberto) return;
    setPessoa(pessoaSugerida); setConta('principal'); setOrigem('principal'); setDestino(outraConta('principal')); setTitulo(''); setAbertura((n) => n + 1);
  }, [aberto, pessoaSugerida]); // eslint-disable-line react-hooks/exhaustive-deps
  const mudarOrigem = (id: string) => { setOrigem(id); if (id === destino) setDestino(outraConta(id)); };
  const mudarDestino = (id: string) => { setDestino(id); if (id === origem) setOrigem(outraConta(id)); };
  const aoEscreverTitulo = (titulo: string) => {
    if (e.tipo === 'transfer' || manual) return;
    // 1.º a categoria usada da última vez com este título; senão, pelas palavras do título («Renda» → Habitação)
    const doHistorico = categoriaSugerida(estado.transactions, titulo, tipoComCategoria);
    const c = doHistorico && lista.includes(doHistorico) ? doHistorico : categoriaPeloTitulo(titulo, lista, tipoComCategoria);
    if (c) { setSugerida(c); setOrigemSugestao(c === doHistorico ? 'do histórico' : 'sugerida'); if (c !== e.categoria) mudar({ categoria: c }); } else setSugerida(null);
  };

  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const r = novoMovimento(new FormData(form), { ...e, hoje: new Date(), id: Date.now() });
    if (Array.isArray(r)) {
      const campo = form.elements.namedItem(r[0]) as HTMLInputElement | null;
      if (campo) {
        campo.setCustomValidity(r[1]);
        campo.reportValidity();
        campo.addEventListener('input', () => campo.setCustomValidity(''), { once: true });
      }
      return;
    }
    aoGuardar(r);
  };

  const pessoasOp = opcoesQuemFez(pessoas);
  const tituloRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState('');
  const recentes = titulos.filter((t) => !titulo.trim() || (simplificarTitulo(t).includes(simplificarTitulo(titulo)) && t !== titulo)).slice(0, 4);
  const usarTitulo = (t: string) => { if (tituloRef.current) tituloRef.current.value = t; setTitulo(t); aoEscreverTitulo(t); };
  // sem categoria escolhida: nas receitas, o Salário (antes ficava a 1.ª por ordem alfabética, «Investimentos»)
  const categoriaAtual = lista.includes(e.categoria) ? e.categoria : (e.tipo === 'income' ? lista.find((c) => /^sal[aá]rio/i.test(c)) : undefined) ?? lista[0] ?? '';
  // salário: «Quem recebe» (a tabela de Salários acompanha); pré-escolhe quem recebeu o último
  const salario = e.tipo === 'income' && !e.revolut && eReceitaDeSalario({ movementType: 'income', title: titulo, detail: categoriaAtual });
  const ultimoRecebe = useMemo(() => estado.transactions.find((m) => eReceitaDeSalario(m) && typeof m.person === 'string' && pessoas.includes(m.person))?.person ?? pessoas[0] ?? '', [estado.transactions, pessoas]);
  const [recebe, setRecebe] = useState(ultimoRecebe);
  useEffect(() => { if (aberto) setRecebe(ultimoRecebe); }, [aberto, ultimoRecebe]);
  const rotuloGuardar = e.tipo === 'expense' ? 'Guardar despesa' : e.tipo === 'income' ? 'Guardar receita' : 'Guardar transferência';

  return (
    <Dialogo folha aberto={aberto} aoMudar={aoMudar} className="movement-dialog ffregisto" titulo="Novo movimento" descricao="Regista uma despesa, receita ou transferência.">
      <Segmentado valor={e.tipo} rotulo="Tipo de movimento" opcoes={TIPOS} aoMudar={(tipo) => mudar({ tipo })} />
      <form key={abertura} className="movement-form ffregisto-form" onSubmit={guardar}>
        <ValorGrande tipo={e.revolut ? 'transfer' : e.tipo} placeholder={semValor ? 'A definir' : '0,00'} required={!semValor} />
        <label className="fftitulo"><Icone nome="pencil" /><span className="sr-only">Descrição</span>
          <input
            ref={tituloRef} name="title" placeholder={e.tipo === 'transfer' ? 'Ex.: Reforço Revolut' : 'Ex.: Continente'} required autoComplete="off"
            onChange={(x) => { setTitulo(x.target.value); aoEscreverTitulo(x.target.value); }}
          />
        </label>
        {recentes.length ? (
          <div className="ffescolhas fftitulos" aria-label="Títulos recentes">
            {recentes.map((t) => <button key={t} type="button" className="ffescolha" onClick={() => usarTitulo(t)}><span>{t}</span></button>)}
          </div>
        ) : null}
        {e.tipo === 'transfer' ? (
          <>
            <Rotulo>Conta de origem</Rotulo>
            <Escolhas nome="origin" rotulo="Conta de origem" valor={origem} aoMudar={mudarOrigem} opcoes={contas} />
            <Rotulo>Conta de destino</Rotulo>
            <Escolhas nome="destination" rotulo="Conta de destino" valor={destino} aoMudar={mudarDestino} opcoes={contas} />
          </>
        ) : (
          <>
            <Rotulo extra={sugerida && sugerida === e.categoria ? origemSugestao : undefined}>Categoria</Rotulo>
            <CampoCategoria estado={estado} lista={lista} valor={categoriaAtual} aoMudar={escolherCategoria} receita={e.tipo === 'income'} mapaAspetos={aspetos} />
            {sugerida && sugerida === e.categoria ? <small className="ffv2-sugestao sr-only" role="status">Categoria {origemSugestao}: {sugerida}</small> : null}
          </>
        )}
        {aberto && e.tipo === 'expense' && !e.revolut && eCategoriaCombustivel(categoriaAtual) ? <CamposCombustivel estado={estado} /> : null}
        <Rotulo>Data</Rotulo>
        <EscolhaData />
        {e.tipo === 'expense' && !e.revolut && pessoas.length > 1 ? (
          <div className="ffv2-extra"><Rotulo>Quem fez</Rotulo><Escolhas nome="person" rotulo="Quem fez" valor={pessoa} aoMudar={setPessoa} opcoes={pessoasOp} /></div>
        ) : e.tipo === 'expense' && !e.revolut && pessoas.length === 1 ? <input type="hidden" name="person" value={pessoas[0]} /> : null}
        {salario ? (
          pessoas.length
            ? <div className="ffv2-extra"><Rotulo>Quem recebe</Rotulo><Escolhas nome="person" rotulo="Quem recebe" valor={recebe} aoMudar={setRecebe} opcoes={pessoasOp.filter((o) => o.valor)} /></div>
            : <input type="hidden" name="person" value={COLUNA_SEM_MEMBROS} />
        ) : null}
        {e.tipo !== 'transfer' && !e.revolut ? (
          <><Rotulo>Conta</Rotulo><Escolhas nome="account" rotulo="Conta" valor={conta} aoMudar={setConta} opcoes={estado.accounts.map((c) => ({ valor: c.id, rotulo: c.name }))} /></>
        ) : null}
        <div className="movement-checks ffregisto-mais">
          <LinhaInterruptor icone="calendar-clock" rotulo="Recorrente" ligado={e.recorrente} aoMudar={(v) => mudar({ recorrente: v })} />
          {salario && !e.recorrente ? <p className="ffdica-linha">Dica: liga «Recorrente» para o salário aparecer sozinho todos os meses.</p> : null}
          {e.recorrente && e.diaSalario ? <p className="ffdica-linha">O «dia do salário» é o 3.º dia útil a contar do fim do mês (sem fins de semana nem feriados).</p> : null}
          {e.recorrente ? (
            <div className="form-grid">
              <label className="ffv2-extra">Periodicidade
                <select
                  name="recurringEvery" value={e.diaSalario ? DIA_DO_SALARIO.valor : e.periodicidade}
                  onChange={(x) => mudar(x.target.value === DIA_DO_SALARIO.valor ? { periodicidade: 1, diaSalario: true } : { periodicidade: Number(x.target.value), diaSalario: false })}
                >
                  {PERIODICIDADES.map((p) => <option key={p.meses} value={p.meses}>{p.rotulo}</option>)}
                  <option value={DIA_DO_SALARIO.valor}>{DIA_DO_SALARIO.rotulo}</option>
                </select>
              </label>
              <label>Tipo de valor
                <select value={e.tipoValor} onChange={(x) => mudar({ tipoValor: x.target.value })}>
                  <option value="com">Valor fixo</option>
                  <option value="sem">Valor variável (confirmar todos os meses)</option>
                </select>
              </label>
            </div>
          ) : null}
          {/* só para quem tem a conta Revolut (numa instalação nova pelo tutorial não existe) */}
          {temRevolut || e.revolut ? <LinhaInterruptor icone="arrow-right-left" rotulo="Transferência para Revolut" ligado={e.revolut} aoMudar={(v) => mudar({ revolut: v })} /> : null}
          {e.revolut ? (
            <div className="form-grid">
              <label>Revolut Conjunta
                {/* A app atual lista nomes fixos no código; aqui vêm do perfil (privacidade, plano §4.1). */}
                <select name="revolutHolder" defaultValue="Conjunta">
                  {/* «Poupança Conjunta»: destino próprio, que não soma ao saldo da Revolut Conjunta */}
                  {['Conjunta', 'Poupança Conjunta', ...estado.profile.members.filter((n) => n && n !== 'Conjunta' && n !== 'Poupança Conjunta')].map((n) => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label>Finalidade
                <select name="revolutPurpose" defaultValue="Carregamento">
                  <option>Carregamento</option><option>Poupança</option><option>Investimento</option><option>Outros</option>
                </select>
              </label>
            </div>
          ) : null}
          <label className="ffnota"><Icone nome="pencil" /><span className="sr-only">Nota (opcional)</span><textarea name="note" rows={1} maxLength={140} placeholder="Nota (opcional)" /></label>
        </div>
        <div className="ffregisto-rodape">
          <Botao type="submit" className="ffguardar">{rotuloGuardar}</Botao>
        </div>
      </form>
    </Dialogo>
  );
}
