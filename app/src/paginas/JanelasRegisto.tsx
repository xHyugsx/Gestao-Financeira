// Janelas do botão "+" nas páginas Combustível e Veterinário (mesmos campos e regras da app atual).
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { dia, type Estado, type Movimento } from '../dados';
import { CamposCombustivel } from '../movimentos/CamposCombustivel';
import { opcoesQuemFez, pessoasDaFamilia } from '../movimentos/pessoas';
import { camposCombustivel } from '../movimentos/viaturas';
import { diaEMes, lerValor } from '../movimentos/regras';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { EscolhaData, Escolhas, Rotulo, ValorGrande } from '../ui/Escolhas';
import { Icone } from '../ui/Icone';
import { animais } from '../veterinario/animais';

const CATEGORIAS_VET = ['Consultas', 'Vacinas', 'Medicação', 'Exames', 'Cirurgia', 'Outros'];

function Guardar({ rotulo }: { rotulo: string }) {
  return <div className="ffregisto-rodape"><Botao type="submit" className="ffguardar">{rotulo}</Botao></div>;
}

interface PropsJanela { aberto: boolean; aoMudar: (a: boolean) => void; aoGuardar: (m: Movimento) => void }

/** Abastecimento a partir do formulário (`null` se o valor não for válido). */
export function novoAbastecimento(f: FormData, hoje: Date): Movimento | null {
  const valor = lerValor(f.get('amount')), data = String(f.get('date') || dia(hoje)), posto = String(f.get('station') || '').trim();
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const pessoa = String(f.get('person') || '').trim();
  return {
    id: Date.now(), title: posto ? `Combustível — ${posto}` : 'Combustível', detail: `${diaEMes(data)} · Combustível`, amount: -valor, kind: 'car', movementType: 'expense', date: data,
    ...Object.fromEntries(Object.entries(camposCombustivel(f)).filter(([, v]) => v)), ...(pessoa ? { person: pessoa } : {}),
  };
}

/** Despesa veterinária a partir do formulário (`null` se o valor não for válido). */
export function novaDespesaVet(f: FormData, hoje: Date): Movimento | null {
  const animal = String(f.get('pet') || animais()[0] || ''), titulo = String(f.get('title') || '').trim() || 'Despesa veterinária';
  const clinica = String(f.get('clinic') || '').trim(), categoria = String(f.get('vetCategory') || 'Consultas');
  const valor = lerValor(f.get('amount')), data = String(f.get('date') || dia(hoje));
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const conta = String(f.get('account') || 'principal');
  return {
    id: Date.now(), title: titulo, detail: `${diaEMes(data)} · ${clinica || categoria}`, amount: -valor, kind: 'health', movementType: 'expense', date: data, pet: animal, vetCategory: categoria,
    ...(conta !== 'principal' ? { account: conta } : {}),
  };
}

const submeter = (criar: (f: FormData, hoje: Date) => Movimento | null, aoGuardar: (m: Movimento) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const m = criar(new FormData(e.currentTarget), new Date());
  if (m) aoGuardar(m);
};

export function NovoAbastecimento({ aberto, aoMudar, aoGuardar, estado }: PropsJanela & { estado: Estado }) {
  const pessoas = useMemo(() => pessoasDaFamilia(estado), [estado]);
  const sugerida = pessoas.length === 1 ? pessoas[0]! : '';
  const [pessoa, setPessoa] = useState(sugerida);
  const posto = useRef<HTMLInputElement>(null);
  useEffect(() => { if (aberto) setPessoa(sugerida); }, [aberto, sugerida]);
  // postos usados antes (pelo título «Combustível — posto»), do mais recente para o mais antigo
  const postos = useMemo(() => [...new Set(estado.transactions.filter((m) => m.title.startsWith('Combustível — ')).sort((x, y) => y.date.localeCompare(x.date))
    .map((m) => m.title.slice('Combustível — '.length).trim()).filter(Boolean))].slice(0, 4), [estado.transactions]);
  return (
    <Dialogo folha aberto={aberto} aoMudar={aoMudar} className="movement-dialog ffregisto" titulo="Novo abastecimento" descricao="Regista um gasto de combustível.">
      <form className="movement-form ffregisto-form" onSubmit={submeter(novoAbastecimento, aoGuardar)}>
        <ValorGrande tipo="expense" required />
        {aberto ? <CamposCombustivel estado={estado} /> : null}
        {pessoas.length > 1 ? (
          <><Rotulo>Quem fez</Rotulo><Escolhas nome="person" rotulo="Quem fez" valor={pessoa} aoMudar={setPessoa} opcoes={opcoesQuemFez(pessoas)} /></>
        ) : pessoas.length === 1 ? <input type="hidden" name="person" value={pessoas[0]} /> : null}
        <Rotulo>Posto</Rotulo>
        <label className="fftitulo"><Icone nome="fuel" /><span className="sr-only">Posto</span><input ref={posto} name="station" placeholder="Ex.: Galp (opcional)" autoComplete="off" /></label>
        {postos.length ? (
          <div className="ffescolhas fftitulos" aria-label="Postos usados antes">
            {postos.map((t) => <button key={t} type="button" className="ffescolha" onClick={() => { if (posto.current) posto.current.value = t; }}><span>{t}</span></button>)}
          </div>
        ) : null}
        <Rotulo>Data</Rotulo>
        <EscolhaData />
        <Guardar rotulo="Guardar abastecimento" />
      </form>
    </Dialogo>
  );
}

export function NovaDespesaVet({ aberto, aoMudar, aoGuardar, animal, contas = [] }: PropsJanela & { animal: string | null; contas?: { id: string; name: string }[] }) {
  const lista = [...animais(), 'A confirmar'];
  const [pet, setPet] = useState(animal || lista[0]!);
  const [cat, setCat] = useState('Consultas');
  const [conta, setConta] = useState('principal');
  useEffect(() => { if (aberto) { setPet(animal || lista[0]!); setCat('Consultas'); setConta('principal'); } }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialogo folha aberto={aberto} aoMudar={aoMudar} className="movement-dialog ffregisto" titulo="Nova despesa veterinária" descricao="Regista uma consulta, medicação ou outro cuidado.">
      <form className="movement-form ffregisto-form" onSubmit={submeter(novaDespesaVet, aoGuardar)}>
        <ValorGrande tipo="expense" required />
        <label className="fftitulo"><Icone nome="pencil" /><span className="sr-only">Descrição</span><input name="title" placeholder="Ex.: consulta, medicação..." autoComplete="off" /></label>
        <Rotulo>Animal</Rotulo>
        <Escolhas nome="pet" rotulo="Animal" valor={pet} aoMudar={setPet} opcoes={lista.map((a) => ({ valor: a, rotulo: a, icone: a === 'A confirmar' ? undefined : 'paw-print' as const }))} />
        <Rotulo>Categoria</Rotulo>
        <Escolhas nome="vetCategory" rotulo="Categoria" valor={cat} aoMudar={setCat} opcoes={CATEGORIAS_VET.map((c) => ({ valor: c, rotulo: c }))} />
        <Rotulo>Data</Rotulo>
        <EscolhaData />
        <Rotulo>Local / clínica</Rotulo>
        <label className="fftitulo"><Icone nome="house" /><span className="sr-only">Local / clínica</span><input name="clinic" placeholder="Opcional" autoComplete="off" /></label>
        {contas.length > 1 ? (
          // a conta, como nas outras despesas (antes: «Origem do dinheiro» com a Revolut fixa, que nem era gravada)
          <><Rotulo>Conta</Rotulo><Escolhas nome="account" rotulo="Conta" valor={conta} aoMudar={setConta} opcoes={contas.map((c) => ({ valor: c.id, rotulo: c.name }))} /></>
        ) : null}
        <Guardar rotulo="Guardar despesa" />
      </form>
    </Dialogo>
  );
}
