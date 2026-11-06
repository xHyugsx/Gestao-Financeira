import { useState } from 'react';
import { MESES } from '../dados';
import type { Estado } from '../dados';
import { erroNomeCategoria, renomearCategoria } from '../movimentos/categorias';
import { coresCategorias, corNova, TONS } from '../movimentos/cores';
import { agruparLinhas, comSubcategorias, definirGrupo, gruposDe, sugerirGrupos, tirarDosGrupos } from '../movimentos/grupos';
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { formatarEuros, formatarPercentagem } from '../ui/formatos';
import { Icone } from '../ui/Icone';
import { CATALOGO_ICONES } from '../ui/icones';
import { Segmentado } from '../ui/Segmentado';
import { categoriasDoMes, CORES, percentagem, variacao } from './calculos';

export type TipoCategoria = 'despesas' | 'receitas';

export interface VistaCategorias {
  tipo: TipoCategoria;
  mensagem: string;
}

export const VISTA_CATEGORIAS: VistaCategorias = { tipo: 'despesas', mensagem: '' };

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

interface Folha { antigo: string | null; nome: string; grupo: string; icone: string; cor: string; erro: string }

export function Categorias({ estado, mes, ocultos, vista, mudarVista, mudarEstado, categoriaEliminada, categoriaRenomeada }: Props) {
  const [folha, setFolha] = useState<Folha | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const eur = (v: number) => formatarEuros(v, ocultos);
  const receitas = vista.tipo === 'receitas';
  const linhas = categoriasDoMes(estado, mes, receitas ? 'receitas' : 'despesas');
  const nomes = linhas.map((l) => l.name);
  const mapa = gruposDe(estado, nomes), grupos = comSubcategorias(mapa);
  const itens = agruparLinhas(linhas, mapa);
  const total = linhas.reduce((s, l) => s + l.amount, 0);
  const cores = coresCategorias(estado);
  const vistas = Array.isArray(estado.extras.categoryGroupsSeen) ? (estado.extras.categoryGroupsSeen as string[]) : [];
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const sugestoes = sugerirGrupos(nomes, mapa, vistas);
  const idIcone = (nome: string) => estado.categoryIcons[nome] ?? CATALOGO_ICONES.find((c) => c.icone === linhas.find((l) => l.name === nome)?.icone)?.id ?? 'tags';

  const abrirFolha = (nome: string | null, grupo = '') => setFolha(nome === null
    ? { antigo: null, nome: '', grupo, icone: 'tags', cor: '', erro: '' }
    : { antigo: nome, nome, grupo: mapa[nome] ?? '', icone: idIcone(nome), cor: cores[nome] ?? linhas.find((l) => l.name === nome)?.tone ?? '', erro: '' });

  const guardar = () => {
    if (!folha) return;
    const nome = folha.nome.trim();
    const erro = folha.antigo !== null && nome === folha.antigo ? null : erroNomeCategoria(estado, nome, folha.antigo ?? undefined);
    if (erro) { setFolha({ ...folha, erro }); return; }
    const { antigo } = folha;
    mudarEstado((e) => {
      let r = e;
      if (antigo === null) {
        r = {
          ...r, ...(receitas ? { incomeCategories: [...r.incomeCategories, nome] } : { categories: [...r.categories, nome] }),
          // cor escolhida ou ao acaso, nunca repetida enquanto houver cores livres
          extras: { ...r.extras, categoryColors: { ...coresCategorias(r), [nome]: folha.cor || corNova(r) } },
        };
      } else {
        if (nome !== antigo) r = renomearCategoria(r, antigo, nome);
        if (folha.cor) r = { ...r, extras: { ...r.extras, categoryColors: { ...coresCategorias(r), [nome]: folha.cor } } };
      }
      return definirGrupo({ ...r, categoryIcons: { ...r.categoryIcons, [nome]: folha.icone } }, nome, grupos.has(antigo ?? '') ? '' : folha.grupo);
    });
    if (antigo !== null && nome !== antigo) categoriaRenomeada(antigo, nome);
    mudarVista({ mensagem: antigo === null ? 'Categoria criada.' : nome !== antigo ? 'Categoria renomeada nos movimentos existentes.' : 'Categoria guardada.' });
    if (folha.grupo) setAbertos((a) => new Set(a).add(folha.grupo));
    setFolha(null);
  };

  const eliminar = (nome: string) => {
    const usadas = new Set(estado.transactions.map((m) => m.detail.split('·').pop()?.trim()).filter(Boolean));
    if (usadas.has(nome)) { setFolha((f) => f && { ...f, erro: 'Esta categoria está a ser usada por movimentos e não pode ser eliminada.' }); return; }
    if (estado.incomeCategories.includes(nome) && estado.incomeCategories.length < 2) { setFolha((f) => f && { ...f, erro: 'Mantenha pelo menos uma categoria de receita.' }); return; }
    if (!window.confirm(`Eliminar a categoria "${nome}"?`)) return;
    mudarEstado((e) => {
      const icones = { ...e.categoryIcons };
      delete icones[nome];
      return tirarDosGrupos({ ...e, categories: e.categories.filter((c) => c !== nome), incomeCategories: e.incomeCategories.filter((c) => c !== nome), categoryIcons: icones }, nome);
    });
    categoriaEliminada(nome);
    mudarVista({ mensagem: 'Categoria eliminada.' });
    setFolha(null);
  };

  // Sugestões de grupos: «Aplicar» junta as marcadas; as que ficam de fora (ou «Agora não») não voltam a ser sugeridas
  const naoMarcadas = (g: string) => !marcadas.has(g);
  const aplicarSugestoes = (aplicar: boolean) => {
    mudarEstado((e) => {
      let r = e;
      for (const s of sugestoes) if (aplicar && naoMarcadas(s.grupo)) for (const c of s.categorias) r = definirGrupo(r, c, s.grupo);
      const recusadas = sugestoes.filter((s) => !aplicar || !naoMarcadas(s.grupo)).flatMap((s) => s.categorias);
      return recusadas.length ? { ...r, extras: { ...r.extras, categoryGroupsSeen: [...vistas, ...recusadas] } } : r;
    });
    if (aplicar) { setAbertos(new Set(sugestoes.filter((s) => naoMarcadas(s.grupo)).map((s) => s.grupo))); mudarVista({ mensagem: 'Categorias arrumadas nos grupos.' }); }
    setMarcadas(new Set());
  };

  const tom = (nome: string, t: string) => CORES[cores[nome] ?? t] ?? 'var(--primary)';
  const candidatos = folha ? nomes.filter((n) => n !== folha.antigo && !mapa[n]) : [];
  return (
    <main className="detail-view ffcategorias">
      <Segmentado
        valor={vista.tipo} rotulo="Tipo de categoria" aoMudar={(tipo) => mudarVista({ tipo, mensagem: '' })}
        opcoes={[{ valor: 'despesas', rotulo: 'Despesas' }, { valor: 'receitas', rotulo: 'Receitas' }]}
      />
      {sugestoes.length ? (
        <section className="ffsugest" aria-label="Arrumar em grupos">
          <div className="ffsugest-t"><span className="ffsugest-ic"><Icone nome="tags" /></span><div><strong>Arrumar em grupos</strong><small>{((n) => `Encontrei ${n} ${n === 1 ? 'categoria solta que pode' : 'categorias soltas que podem'} ir para um grupo`)(sugestoes.reduce((s, x) => s + x.categorias.length, 0))}</small></div></div>
          <ul>
            {sugestoes.map((s) => (
              <li key={s.grupo}>
                <label><input type="checkbox" checked={naoMarcadas(s.grupo)} onChange={() => setMarcadas((m) => { const n = new Set(m); if (n.has(s.grupo)) n.delete(s.grupo); else n.add(s.grupo); return n; })} />
                  <span>{s.categorias.join(', ')}</span></label>
                <b>{`→ ${s.grupo}`}</b>
              </li>
            ))}
          </ul>
          <div className="ffsugest-acoes">
            <Botao type="button" tamanho="pequeno" onClick={() => aplicarSugestoes(true)}>Aplicar</Botao>
            <Botao type="button" tamanho="pequeno" variante="ghost" onClick={() => aplicarSugestoes(false)}>Agora não</Botao>
          </div>
        </section>
      ) : null}
      <section className="ffresumo-mes ffcat-resumo" aria-label="Resumo das categorias">
        <div><p className="ffbloco-rot">{`${receitas ? 'Receitas' : 'Gastos'} em ${MESES[mes.getMonth()]}`}</p><strong className="ffresumo-valor">{eur(total)}</strong></div>
        <div className="ffcat-contagem">{grupos.size ? <p><b>{grupos.size}</b> {grupos.size === 1 ? 'grupo' : 'grupos'}</p> : null}<p><b>{nomes.length}</b> categorias</p></div>
      </section>
      <div className="ffcat-titulo">
        <p className="ffbloco-rot">{grupos.size ? 'Grupos' : 'Categorias'}</p>
        <Botao type="button" tamanho="pequeno" aria-label="Nova categoria" onClick={() => abrirFolha(null)}><Icone nome="plus" />Nova</Botao>
      </div>
      {vista.mensagem ? <p className="settings-message ffcat-mensagem" role="status">{vista.mensagem}</p> : null}
      <section className="ffcat-lista">
        {itens.map((g) => {
          const outras = g.subs.filter((x) => x.name !== g.name).length;
          const temSubs = g.subs.length > 0, aberto = temSubs && abertos.has(g.name), v = g.anterior ? variacao(g.amount, g.anterior) : null;
          const sobe = g.amount > g.anterior, bom = receitas ? sobe : !sobe;
          const cabeca = (
            <>
              <span className="ffcat-ic" style={{ '--c': tom(g.name, g.tone) } as React.CSSProperties}><Icone nome={g.icone} /></span>
              <span className="ffcat-nome"><b>{g.name}</b>
                <small>
                  {temSubs ? `${outras} ${outras === 1 ? 'categoria' : 'categorias'}` : g.auto ? 'automática' : 'sem grupo'}
                  {v !== null && g.amount !== g.anterior ? <em className={bom ? 'amount-positive' : 'amount-negative'}>{` · ${sobe ? '↑' : '↓'} ${formatarPercentagem(v)}`}</em> : null}
                </small>
              </span>
              <span className="ffcat-valor"><b>{eur(g.amount)}</b><small>{percentagem(g.share)}</small></span>
              {temSubs ? <span className="ffcat-chev" aria-hidden="true"><Icone nome="chevron-right" /></span> : null}
            </>
          );
          return (
            <article key={g.name} className={`ffcat-grupo${aberto ? ' ffcat-aberto' : ''}`}>
              {temSubs ? (
                <div className="ffcat-cab">
                  <button type="button" className="ffcat-linha" aria-expanded={aberto} aria-label={`${aberto ? 'Fechar' : 'Abrir'} ${g.name}`}
                    onClick={() => setAbertos((a) => { const n = new Set(a); if (n.has(g.name)) n.delete(g.name); else n.add(g.name); return n; })}>{cabeca}</button>
                  <Botao variante="ghost" tamanho="icone" className="ffcat-editar" aria-label={`Editar categoria ${g.name}`} onClick={() => abrirFolha(g.name)}><Icone nome="pencil" /></Botao>
                </div>
              ) : (
                <div className="ffcat-cab"><button type="button" className="ffcat-linha" aria-label={`Editar categoria ${g.name}`} onClick={() => abrirFolha(g.name)}>{cabeca}</button></div>
              )}
              <i className="ffcat-barra" aria-hidden="true"><b style={{ transform: `scaleX(${total ? g.amount / Math.max(...itens.map((x) => x.amount)) : 0})`, background: tom(g.name, g.tone) }} /></i>
              {aberto ? (
                <div className="ffcat-subs">
                  {g.subs.map((s) => (
                    <button key={s.name} type="button" className="ffcat-sub" aria-label={`Editar categoria ${s.name}`} onClick={() => abrirFolha(s.name)}>
                      <span className="ffcat-ic" style={{ '--c': tom(s.name, s.tone) } as React.CSSProperties}><Icone nome={s.icone} /></span>
                      <span>{s.name} <small>{s.amount ? percentagem(g.amount ? Math.round((s.amount / g.amount) * 1000) / 10 : 0) : 'sem gastos'}</small></span>
                      <b>{eur(s.amount)}</b>
                    </button>
                  ))}
                  <button type="button" className="ffcat-sub ffcat-sub-nova" onClick={() => abrirFolha(null, g.name)}>
                    <span className="ffcat-ic"><Icone nome="plus" /></span><span>{`Nova categoria em ${g.name}`}</span>
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
      <Dialogo
        folha aberto={folha !== null} aoMudar={(a) => { if (!a) setFolha(null); }} className="movement-dialog icon-edit-dialog ffcat-folha"
        titulo={folha?.antigo === null ? 'Nova categoria' : 'Editar categoria'} descricao="Nome, grupo, ícone e cor."
      >
        {folha ? (
          <>
            <label className="ffv2-nome-categoria">Nome
              <input value={folha.nome} maxLength={40} aria-label="Nome da categoria" placeholder={receitas ? 'Ex.: Prémios' : 'Ex.: Ginásio'} onChange={(ev) => setFolha({ ...folha, nome: ev.target.value, erro: '' })} />
            </label>
            <div className="ffcat-campo">
              <p>Pertence ao grupo</p>
              {folha.antigo !== null && grupos.has(folha.antigo) ? <small>{`É o grupo de ${Object.keys(mapa).filter((c) => mapa[c] === folha.antigo).join(', ')}.`}</small> : (
                <div className="ffcat-pilulas" role="radiogroup" aria-label="Grupo">
                  <button type="button" role="radio" aria-checked={!folha.grupo} className={!folha.grupo ? 'on' : ''} onClick={() => setFolha({ ...folha, grupo: '' })}>Nenhum</button>
                  {candidatos.map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={folha.grupo === c} className={folha.grupo === c ? 'on' : ''} onClick={() => setFolha({ ...folha, grupo: c })}>
                      <Icone nome={linhas.find((l) => l.name === c)?.icone ?? 'tags'} />{c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ffcat-campo">
              <p>Cor</p>
              <div className="ffcat-cores" role="radiogroup" aria-label="Cor">
                {TONS.map((t) => <button key={t} type="button" role="radio" aria-checked={folha.cor === t} aria-label={t} className={folha.cor === t ? 'on' : ''} style={{ background: CORES[t] }} onClick={() => setFolha({ ...folha, cor: t })} />)}
              </div>
            </div>
            <div className="ffcat-campo"><p>Ícone</p><EscolhaIcone valor={folha.icone} aoEscolher={(icone) => setFolha((f) => f && { ...f, icone })} /></div>
            {folha.erro ? <p className="settings-message" role="alert">{folha.erro}</p> : null}
          </>
        ) : null}
        <div className="dialog-actions">
          {folha?.antigo && !linhas.find((l) => l.name === folha.antigo)?.auto
            ? <Botao type="button" variante="destrutivo" onClick={() => eliminar(folha.antigo!)}><Icone nome="trash-2" />Eliminar</Botao>
            : <Botao type="button" variante="ghost" onClick={() => setFolha(null)}><Icone nome="x" />Cancelar</Botao>}
          <Botao type="button" onClick={guardar}>{folha?.antigo === null ? 'Criar' : 'Guardar'}</Botao>
        </div>
      </Dialogo>
    </main>
  );
}
