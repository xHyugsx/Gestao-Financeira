import { useState } from 'react';
import type { Estado } from '../dados';
import { erroNomeCategoria, renomearCategoria } from '../movimentos/categorias';
import { coresCategorias, corNova } from '../movimentos/cores';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { CATALOGO_ICONES } from '../ui/icones';
import { Segmentado } from '../ui/Segmentado';
import { categoriasDoMes, percentagem } from './calculos';

export type TipoCategoria = 'despesas' | 'receitas';
export type FiltroCategoria = 'todas' | 'recorrentes' | 'pontuais';

export interface VistaCategorias {
  tipo: TipoCategoria;
  filtro: FiltroCategoria;
  nova: string;
  icone: string;
  mensagem: string;
}

export const VISTA_CATEGORIAS: VistaCategorias = { tipo: 'despesas', filtro: 'todas', nova: '', icone: 'tags', mensagem: '' };

const GRUPOS = [...new Set(CATALOGO_ICONES.map((e) => e.grupo))].map((g) => [g, CATALOGO_ICONES.filter((e) => e.grupo === g)] as const);

/** Grelha de ícones para escolher o de uma categoria. */
export function EscolhaIcone({ valor, aoEscolher }: { valor: string; aoEscolher: (id: string) => void }) {
  return (
    <div className="category-icon-groups" role="radiogroup" aria-label="Ícone da categoria">
      {GRUPOS.map(([grupo, icones]) => (
        <div key={grupo} className="category-icon-group">
          <p>{grupo}</p>
          <div className="category-icon-picker">
            {icones.map((e) => (
              <Botao
                key={e.id} type="button" variante="ghost" tamanho="icone" role="radio" aria-checked={valor === e.id} aria-label={e.label} title={e.label}
                className={valor === e.id ? 'category-icon-choice category-icon-choice-active' : 'category-icon-choice'} onClick={() => aoEscolher(e.id)}
              ><Icone nome={e.icone} /></Botao>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  estado: Estado;
  mes: Date;
  ocultos: boolean;
  vista: VistaCategorias;
  mudarVista: (v: Partial<VistaCategorias>) => void;
  mudarEstado: (f: (e: Estado) => Estado) => void;
  categoriaEliminada: (nome: string) => void;
  categoriaRenomeada: (antigo: string, novo: string) => void;
}

export function Categorias({ estado, mes, ocultos, vista, mudarVista, mudarEstado, categoriaEliminada, categoriaRenomeada }: Props) {
  // Janela «Editar categoria» (nome e ícone; a app atual só deixava mudar o ícone aqui)
  const [aEditar, setAEditar] = useState<{ antigo: string; nome: string; icone: string; erro: string } | null>(null);
  const receitas = vista.tipo === 'receitas';
  const lista = receitas
    ? categoriasDoMes(estado, mes, 'receitas')
    : categoriasDoMes(estado, mes, 'despesas').filter((e) => vista.filtro === 'todas' || e.type === vista.filtro.slice(0, -1));

  const adicionar = () => {
    const nome = vista.nova.trim();
    if (!nome) { mudarVista({ mensagem: 'Escreva o nome da nova categoria.' }); return; }
    if (nome.length > 40) { mudarVista({ mensagem: 'Use no máximo 40 caracteres.' }); return; }
    if ([...estado.categories, ...estado.incomeCategories].some((c) => c.toLocaleLowerCase('pt-PT') === nome.toLocaleLowerCase('pt-PT'))) {
      mudarVista({ mensagem: 'Essa categoria já existe.' }); return;
    }
    mudarEstado((e) => ({
      ...e,
      ...(receitas ? { incomeCategories: [...e.incomeCategories, nome] } : { categories: [...e.categories, nome] }),
      categoryIcons: { ...e.categoryIcons, [nome]: vista.icone },
      // cor ao acaso, nunca repetida enquanto houver cores livres (só na app nova)
      extras: { ...e.extras, categoryColors: { ...coresCategorias(e), [nome]: corNova(e) } },
    }));
    mudarVista({ nova: '', icone: 'tags', mensagem: 'Categoria criada.' });
  };

  const guardarEdicao = () => {
    if (!aEditar) return;
    const nome = aEditar.nome.trim();
    const erro = nome === aEditar.antigo ? null : erroNomeCategoria(estado, nome, aEditar.antigo);
    if (erro) { setAEditar({ ...aEditar, erro }); return; }
    mudarEstado((e) => {
      const renomeada = nome === aEditar.antigo ? e : renomearCategoria(e, aEditar.antigo, nome);
      return { ...renomeada, categoryIcons: { ...renomeada.categoryIcons, [nome]: aEditar.icone } };
    });
    if (nome !== aEditar.antigo) { categoriaRenomeada(aEditar.antigo, nome); mudarVista({ mensagem: 'Categoria renomeada nos movimentos existentes.' }); }
    setAEditar(null);
  };

  const eliminar = (nome: string) => {
    const usadas = new Set(estado.transactions.map((m) => m.detail.split('·').pop()?.trim()).filter(Boolean));
    if (usadas.has(nome)) { mudarVista({ mensagem: 'Esta categoria está a ser usada por movimentos e não pode ser eliminada.' }); return; }
    if (estado.incomeCategories.includes(nome) && estado.incomeCategories.length < 2) { mudarVista({ mensagem: 'Mantenha pelo menos uma categoria de receita.' }); return; }
    if (!window.confirm(`Eliminar a categoria "${nome}"?`)) return;
    mudarEstado((e) => {
      const icones = { ...e.categoryIcons };
      delete icones[nome];
      return { ...e, categories: e.categories.filter((c) => c !== nome), incomeCategories: e.incomeCategories.filter((c) => c !== nome), categoryIcons: icones };
    });
    categoriaEliminada(nome);
    mudarVista({ mensagem: 'Categoria eliminada.' });
  };

  return (
    <main className="detail-view">
      <Segmentado
        valor={vista.tipo} rotulo="Tipo de categoria" aoMudar={(tipo) => mudarVista({ tipo })}
        opcoes={[{ valor: 'despesas', rotulo: 'Despesas' }, { valor: 'receitas', rotulo: 'Receitas' }]}
      />
      {!receitas ? (
        <Segmentado
          valor={vista.filtro} rotulo="Filtrar categorias" aoMudar={(filtro) => mudarVista({ filtro })}
          opcoes={[{ valor: 'todas', rotulo: 'Todas' }, { valor: 'recorrentes', rotulo: 'Recorrentes' }, { valor: 'pontuais', rotulo: 'Pontuais' }]}
        />
      ) : null}
      <section className="category-manager">
        <div className="inline-add">
          <input
            value={vista.nova} maxLength={40} onChange={(e) => mudarVista({ nova: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } }}
            placeholder={receitas ? 'Nova categoria de receita' : 'Nova categoria'} aria-label="Nova categoria"
          />
          <Botao tamanho="icone" aria-label="Adicionar categoria" onClick={adicionar}><Icone nome="plus" /></Botao>
        </div>
        <EscolhaIcone valor={vista.icone} aoEscolher={(icone) => mudarVista({ icone })} />
        {vista.mensagem ? <p className="settings-message" role="status">{vista.mensagem}</p> : null}
      </section>
      <section className="category-list">
        {lista.map((e) => (
          <article key={e.name} className="category-row">
            <button
              type="button" className={`category-icon category-icon-edit tone-${e.tone}`} aria-label={`Editar categoria ${e.name}`}
              onClick={() => setAEditar({ antigo: e.name, nome: e.name, erro: '', icone: estado.categoryIcons[e.name] ?? CATALOGO_ICONES.find((c) => c.icone === e.icone)?.id ?? 'tags' })}
            >
              <Icone nome={e.icone} />
              <i className="category-icon-badge" aria-hidden="true"><Icone nome="pencil" /></i>
            </button>
            <div className="category-data">
              <div>
                <h2>{e.name}</h2>
                <strong>{formatarEuros(e.amount, ocultos)}</strong>
                <span>{percentagem(e.share)}</span>
                <em className={e.trend > 0 ? 'positive' : 'amount-negative'}>{e.trend > 0 ? '↑' : '↓'}{Math.abs(e.trend)}%</em>
              </div>
              <div className="progress-track"><i className={`tone-${e.tone} progress-${e.bucket}`} /></div>
            </div>
            {e.auto
              ? <span className="category-auto" title="Categoria automática: vem dos movimentos">auto</span>
              : <Botao variante="ghost" tamanho="icone" className="category-delete" aria-label={`Eliminar ${e.name}`} onClick={() => eliminar(e.name)}><Icone nome="trash-2" /></Botao>}
          </article>
        ))}
      </section>
      <Dialogo
        aberto={aEditar !== null} aoMudar={(a) => { if (!a) setAEditar(null); }} className="movement-dialog icon-edit-dialog"
        titulo="Editar categoria" descricao="Mude o nome ou o ícone desta categoria."
      >
        {aEditar ? (
          <>
            <label className="ffv2-nome-categoria">Nome
              <input value={aEditar.nome} maxLength={40} aria-label="Nome da categoria" onChange={(ev) => setAEditar({ ...aEditar, nome: ev.target.value, erro: '' })} />
            </label>
            {aEditar.erro ? <p className="settings-message" role="alert">{aEditar.erro}</p> : null}
            <EscolhaIcone valor={aEditar.icone} aoEscolher={(icone) => setAEditar((a) => a && { ...a, icone })} />
          </>
        ) : null}
        <div className="dialog-actions">
          <Botao type="button" variante="ghost" onClick={() => setAEditar(null)}><Icone nome="x" />Cancelar</Botao>
          <Botao type="button" onClick={guardarEdicao}>Guardar</Botao>
        </div>
      </Dialogo>
    </main>
  );
}
