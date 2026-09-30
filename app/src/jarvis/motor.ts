// Motor do Jarvis (por regras, sem IA externa): perguntas, ações com confirmação e seguimento da conversa.
// Mesmas respostas da app atual (tests/referencias/jarvis.json); a lógica segue a ordem das regras originais.
import { anoMes, type Conta, type Estado, MESES, type Movimento, salariosDoMes } from '../dados';
import { CATEGORIAS_POR_OMISSAO } from '../dados/esquema';
import { categoriaDespesa, categoriaReceita } from '../movimentos/categorias';
import { tipoVisual } from '../movimentos/regras';
import { categoriasDoMes, eCombustivel, percentagem, variacao } from '../paginas/calculos';
import { ANIMAIS } from '../veterinario/animais';
import type { InfoLembrete, Lembrete } from '../veterinario/lembretes';
import type { PendenteRecibo } from './recibos';
import { categoriaNoTexto, normal, semAcentos, valorNoTexto } from './texto';

export type Pendente =
  | { type: 'vet-done'; payload: { id: string | number } }
  | { type: 'edit-tx'; payload: { id: number | string; patch: Partial<Movimento> } }
  | { type: 'remove-tx'; payload: Movimento }
  | PendenteRecibo;

interface Sujeito { t: 'cat' | 'loja'; name: string; key?: string }

/** O que o Jarvis precisa da app: dados, mês escolhido e ações. */
export interface ContextoJarvis {
  estado: Estado;
  /** Mês escolhido na app (as respostas sem mês usam este). */
  mes: Date;
  agora: Date;
  eur: (v: number) => string;
  saldoAtual: (c: Conta) => number;
  mudarMovimentos: (f: (l: Movimento[]) => Movimento[]) => void;
  definirSalario: (ano: string, pessoa: string, mes: number, valor: number) => void;
  mudarContas: (f: (l: Conta[]) => Conta[]) => void;
  vibrar: (p: number | number[]) => void;
  /** Cria e descarrega o backup. */
  criarBackup: () => void;
  vet: { todos: () => Lembrete[]; ordenados: () => Lembrete[]; feito: (id: string | number) => void; info: (r: Lembrete) => InfoLembrete };
  importacao: { desfazer: () => string; reabrir: () => string };
}

const P2 = (x: number) => String(x).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${P2(d.getMonth() + 1)}-${P2(d.getDate())}`;
const gastosDe = (l: Movimento[]) => l.filter((m) => m.movementType === 'expense').reduce((s, m) => s + Math.abs(m.amount), 0);
const pctAbs = (v: number) => `${Math.abs(v).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%`;
const deAnimal = (p: string) => (p === ANIMAIS[1] ? `da ${p}` : `do ${p}`);

export class MotorJarvis {
  /** Tema da última pergunta (seguimento: «E em julho?»). */
  tema: string | null = null;
  sujeito: Sujeito | null = null;
  pendente: Pendente | null = null;
  ultimaAdicao: number | null = null;

  limpar() { this.tema = null; this.sujeito = null; this.pendente = null; }

  /** Resposta a uma mensagem (já corrigida). */
  responder(q: string, c: ContextoJarvis): string {
    const n = semAcentos(q), f = c.estado.transactions, A = c.eur, hc = MESES;
    if (this.pendente) {
      if (/\b(confirmar?|confirmo|\bsim\b)\b/.test(n)) {
        const pd = this.pendente;
        this.pendente = null;
        return this.executar(pd, c);
      }
      if (/\b(cancelar?|n[aã]o)\b/.test(n)) { this.pendente = null; return 'Ok, não fiz essa alteração.'; }
      return 'Tens uma ação por confirmar. Escolhe «Confirmar» ou «Cancelar».';
    }
    if (/(desfaz|anula)\w*.*importa/.test(n)) return c.importacao.desfazer();
    if (/\brever (o )?extrato\b/.test(n)) return c.importacao.reabrir();
    if (/desfaz/.test(n)) {
      if (!this.ultimaAdicao) return 'Não há nenhuma adição recente do Jarvis para desfazer.';
      const id = this.ultimaAdicao;
      this.ultimaAdicao = null;
      c.mudarMovimentos((ls) => ls.filter((x) => x.id !== id));
      return 'Última adição revertida.';
    }
    if (/\bbackup\b/.test(n) && /\b(cria|criar|gera|gerar|faz|fazer|novo|nova)\b/.test(n)) {
      c.criarBackup(); c.vibrar([20, 40, 20]);
      return `Backup criado e descarregado (financas-familiar-backup-${iso(new Date())}.json). ✅`;
    }
    if (/\bbackup\b/.test(n) && /restaur|importa/.test(n)) return 'Para restaurar, anexa o ficheiro .json do backup usando o clip 📎.';
    if (/\b(muda\w*|alter\w*|corrig\w*|edit\w*|atualiz\w*|troca\w*)\b/.test(n) && /\bpara\b/.test(n) && !/\bbackup\b/.test(n)) return this.editar(q, n, c);
    if (/\b(adicion\w*|regist\w*|lan[çc]\w*)\b/.test(n)) {
      const isInc = /receita|rendimento extra/.test(n), amt = valorNoTexto(q);
      if (amt == null) return 'Não percebi o valor. Tenta algo como «adiciona despesa de 45,90€ em Alimentação».';
      const incCat = categoriaNoTexto(n, c.estado.incomeCategories), expCat = categoriaNoTexto(n, c.estado.categories);
      const cat = incCat || expCat || (isInc ? 'Outras receitas' : 'Outros');
      const ty = incCat ? 'income' : expCat ? (isInc ? 'income' : 'expense') : isInc ? 'income' : 'expense';
      const dd = new Date();
      const accM = c.estado.accounts.filter((a) => a.id !== 'principal').find((a) => {
        const an = semAcentos(a.name);
        return ` ${n} `.includes(` ${an} `) || (an.split(' ')[0]!.length > 3 && ` ${n} `.includes(` ${an.split(' ')[0]} `));
      });
      const obj: Movimento = {
        id: Date.now(), title: cat, detail: `${dd.getDate()} ${hc[dd.getMonth()]} · ${cat}`, amount: ty === 'income' ? amt : -amt,
        kind: tipoVisual(ty, cat), movementType: ty, date: iso(dd), affectsBalance: true, ...(accM ? { account: accM.id } : {}),
      };
      c.mudarMovimentos((e) => [obj, ...e]);
      this.ultimaAdicao = obj.id as number;
      c.vibrar([20, 40, 20]);
      return `Adicionado: ${cat} — ${A(amt)} · hoje${accM ? ` · conta ${accM.name}` : ''}. Escreve «desfazer» para reverter.`;
    }
    if (/\b(remov\w*|apag\w*|elimin\w*|anul\w*)\b/.test(n)) {
      const wantInc = /receita/.test(n), wantExp = /despesa|gasto/.test(n);
      const km = q.match(/(?:remov\w*|apag\w*|elimin\w*|anul\w*)\s+(?:a\s+)?(?:última|ultima)?\s*(?:despesa|receita|movimento|gasto)?\s*(?:de|do|da)?\s*(.+)/i);
      const kw = km && km[1] && semAcentos(km[1]).trim();
      const tipoOk = (t: Movimento) => (!wantInc || t.movementType === 'income') && (!wantExp || t.movementType === 'expense');
      let tgt = kw && kw.length > 1 ? f.find((t) => semAcentos(t.title).includes(kw) && tipoOk(t)) : undefined;
      if (!tgt) tgt = f.find((t) => t.movementType !== 'transfer' && tipoOk(t));
      if (!tgt) return 'Não encontrei nenhum movimento correspondente.';
      this.pendente = { type: 'remove-tx', payload: tgt };
      return `Vou remover: ${tgt.title} ${A(tgt.amount)} (${new Date(`${tgt.date}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}). Confirmas que queres apagar?`;
    }
    return this.perguntar(q, c);
  }

  private executar(pd: Pendente, c: ContextoJarvis): string {
    const A = c.eur;
    if (pd.type === 'vet-done') { c.vet.feito(pd.payload.id); return 'Lembrete marcado como feito. ✅'; }
    if (pd.type === 'edit-tx') {
      c.mudarMovimentos((ls) => ls.map((x) => (x.id === pd.payload.id ? { ...x, ...pd.payload.patch } : x)));
      c.vibrar([20, 40, 20]);
      return 'Movimento atualizado. ✏️';
    }
    if (pd.type === 'remove-tx') { c.mudarMovimentos((ls) => ls.filter((x) => x.id !== pd.payload.id)); c.vibrar([40, 60, 40]); return 'Movimento removido. 🗑️'; }
    if (pd.type === 'slip') {
      const { per, year: y, month: mo, net, tk, accId, key } = pd.payload, out: string[] = [];
      if (net != null) { c.definirSalario(y, per, mo, net); out.push(`Salário de ${MESES[mo]} de ${per}: ${A(net)}`); }
      if (tk != null) {
        const ym = anoMes(new Date());
        c.mudarContas((as) => as.map((a) => (a.id === accId
          ? { ...a, balance: Math.round(((a.balance || 0) + tk) * 100) / 100, ...(a.createdAt === ym ? {} : { adj: { ...a.adj, [ym]: (a.adj?.[ym] || 0) + tk } }), tickets: [...(a.tickets || []), key] }
          : a)));
        out.push(`${c.estado.accounts.find((a) => a.id === accId)?.name || 'Edenred'} +${A(tk)}`);
      }
      c.vibrar([20, 40, 20]);
      return `Registado ✅ ${out.join(' · ')}.`;
    }
    const { year: y, month: mo, valores } = pd.payload;
    const lista = Object.entries(valores);
    lista.forEach(([p, v]) => c.definirSalario(y, p, mo, v));
    c.vibrar([20, 40, 20]);
    return `Salários de ${MESES[mo]} atualizados: ${lista.map(([p, v]) => `${p} ${A(v)}`).join(' · ')}. ✅`;
  }

  private editar(q: string, n: string, c: ContextoJarvis): string {
    const A = c.eur, hc = MESES, f = c.estado.transactions;
    const Nn = (s: string) => semAcentos(s).replace(/[^a-z0-9]+/g, ' ').trim();
    const cut = n.lastIndexOf(' para '), tp = ` ${Nn(n.slice(0, cut))} `, cp = n.slice(cut + 6), cpq = q.slice(q.toLowerCase().lastIndexOf(' para ') + 6);
    const now = new Date();
    const dayOf = (s: string) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (/\bhoje\b/.test(s)) return iso(d);
      if (/\banteontem\b/.test(s)) { d.setDate(d.getDate() - 2); return iso(d); }
      if (/\bontem\b/.test(s)) { d.setDate(d.getDate() - 1); return iso(d); }
      const mm = hc.map(semAcentos);
      const m = s.match(new RegExp(`\\b(?:dia |a )?(\\d{1,2}) de (${mm.join('|')})\\b`)) || s.match(/\bdia (\d{1,2})\b/);
      if (m) {
        const mo = m[2] ? mm.indexOf(m[2]) : now.getMonth(), y = mo > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
        return `${y}-${P2(mo + 1)}-${P2(+m[1]!)}`;
      }
      return null;
    };
    const tDay = dayOf(n.slice(0, cut)), typ = /\breceit/.test(tp) ? 'income' : /\b(despes|gast|compr)/.test(tp) ? 'expense' : null;
    const pool = [...f].filter((t) => (t.movementType === 'expense' || t.movementType === 'income') && (!typ || t.movementType === typ) && (!tDay || t.date === tDay))
      .sort((a, b) => b.date.localeCompare(a.date) || (+b.id || 0) - (+a.id || 0));
    const hits = /\bultim[oa]\b/.test(tp) ? pool.slice(0, 1) : pool.filter((t) => { const k = Nn(t.title); return k.length >= 3 && tp.includes(` ${k} `); });
    if (!hits.length) return 'Não encontrei esse movimento. Indica o nome como aparece na lista, por exemplo «muda o Continente de ontem para 45 €».';
    const t = hits[0]!, patch: Partial<Movimento> = {}, chg: string[] = [], fmt = (d: string) => `${Number(d.slice(8, 10))}/${d.slice(5, 7)}`;
    const cat0 = t.movementType === 'income' ? categoriaReceita(t) : categoriaDespesa(t), dt0 = t.date;
    let cat = cat0;
    if (/\bcategoria\b/.test(n)) {
      const nova = categoriaNoTexto(cp, t.movementType === 'income' ? c.estado.incomeCategories : c.estado.categories);
      if (!nova) return `Não reconheci a categoria «${cpq.trim().replace(/[.?!]+$/, '')}». Usa o nome de uma categoria que exista na app.`;
      if (nova !== cat0) { cat = nova; chg.push(`categoria ${cat0} → ${nova}`); }
    } else if (/\b(data|dia|hoje|ontem|anteontem)\b/.test(cp) && !/\d+[,.]\d{1,2}|€|\beur/.test(cp)) {
      const d = dayOf(cp);
      if (!d) return 'Não percebi a nova data. Tenta «para dia 12» ou «para ontem».';
      if (d !== dt0) { patch.date = d; chg.push(`data ${fmt(dt0)} → ${fmt(d)}`); }
    } else {
      const v = valorNoTexto(cpq);
      if (v == null) return `Não percebi o novo valor. Tenta «muda o ${t.title} para 45,90 €».`;
      const nv = t.movementType === 'income' ? Math.abs(v) : -Math.abs(v);
      if (Math.abs(nv - t.amount) > 0.004) { patch.amount = nv; chg.push(`valor ${A(t.amount)} → ${A(nv)}`); }
    }
    if (!chg.length) return `${t.title} (${fmt(dt0)}) já está assim. Não há nada para alterar.`;
    const nd = patch.date || dt0;
    patch.detail = `${Number(nd.slice(8, 10))} ${hc[Number(nd.slice(5, 7)) - 1]} · ${cat}`;
    if (cat !== cat0) patch.kind = tipoVisual(t.movementType ?? 'expense', cat);
    this.pendente = { type: 'edit-tx', payload: { id: t.id, patch } };
    return `Vou alterar ${t.title} (${fmt(dt0)}): ${chg.join(' · ')}${hits.length > 1 ? `. É o mais recente de ${hits.length} com esse nome` : ''}. Confirmas?`;
  }

  /** Perguntas (sem alterar dados), exceto «marcar lembrete como feito», que pede confirmação. */
  private perguntar(q: string, c: ContextoJarvis): string {
    const n = semAcentos(q), hc = MESES, A = c.eur, f = c.estado.transactions, ffNow = c.agora, It = c.mes;
    const on = (D: Date) => f.filter((t) => t.date.startsWith(anoMes(D)));
    const un = (D: Date) => salariosDoMes(c.estado, D);
    const an = new Date(It.getFullYear(), It.getMonth() - 1, 1), mm = hc[It.getMonth()]!, mp = hc[an.getMonth()]!;
    const ffMo = hc.map(semAcentos);
    const ffL = (d: Date) => `${hc[d.getMonth()]}${d.getFullYear() !== ffNow.getFullYear() ? ` de ${d.getFullYear()}` : ''}`;
    const ffD = (() => {
      const m = n.match(new RegExp(`\\b(${ffMo.join('|')})\\b(?:\\s+(?:de\\s+)?(20\\d{2}))?`));
      if (m) {
        const mi = ffMo.indexOf(m[1]!), y = m[2] ? +m[2] : mi > ffNow.getMonth() ? ffNow.getFullYear() - 1 : ffNow.getFullYear();
        return new Date(y, mi, 1);
      }
      if (/mes (passado|anterior)|ultimo mes/.test(n)) return new Date(ffNow.getFullYear(), ffNow.getMonth() - 1, 1);
      const k = n.match(/ha (\d+) meses/);
      if (k) return new Date(ffNow.getFullYear(), ffNow.getMonth() - +k[1]!, 1);
      if (/(este|neste|deste) mes|mes atual/.test(n)) return new Date(ffNow.getFullYear(), ffNow.getMonth(), 1);
      return null;
    })();
    const reAnimais = new RegExp(`veterin|\\bvet\\b|${ANIMAIS.map((a) => `\\b${semAcentos(a)}\\b`).join('|')}|animal|animais`);
    let ik: string | null = /combust|gasolin|gasoleo|abastec/.test(n) ? 'comb' : reAnimais.test(n) ? 'vet' : /categor|maior/.test(n) ? 'cat'
      : /salari|ordenad|vencimento/.test(n) ? 'sal' : /rendiment/.test(n) ? 'ren' : /receit|recebi|ganhei/.test(n) ? 'rec'
        : /saldo|conta|revolut|dinheiro/.test(n) ? 'sld' : /gast|despes|paguei/.test(n) ? 'gas' : null;
    if (ik) this.tema = ik;
    const ffN2 = ` ${normal(n)} `;
    const ffYr = !ffD && (n.match(/\b(?:em|no ano(?: de)?|de) (20\d{2})\b/)?.[1]
      || (/\b(este|neste|deste) ano\b/.test(n) ? String(ffNow.getFullYear()) : /\bano passado\b/.test(n) ? String(ffNow.getFullYear() - 1) : null));
    const ffPer = ffYr ? { tx: f.filter((t) => t.date.startsWith(`${ffYr}-`)), L: ffYr } : { tx: on(ffD || It), L: ffL(ffD || It) };
    const ffExpP = ffPer.tx.filter((t) => t.movementType === 'expense');
    const ffCats = [...new Set([...CATEGORIAS_POR_OMISSAO, ...c.estado.categories, ...f.filter((t) => t.movementType === 'expense').map(categoriaDespesa)])].filter(Boolean);
    const ffTit = [...new Map(f.filter((t) => t.movementType === 'expense' && t.title).map((t) => [normal(t.title), t.title])).entries()].filter(([k]) => k.length >= 3);
    const ffCH = ffCats.map((x) => [normal(x), x] as const).filter(([k]) => k.length > 2 && ffN2.includes(` ${k} `)).sort((a, b) => b[0].length - a[0].length)[0];
    const ffSH = ffTit.filter(([k]) => ffN2.includes(` ${k} `)).sort((a, b) => b[0].length - a[0].length)[0];
    const ffSub: Sujeito | null = !ik || ik === 'gas'
      ? ffCH ? { t: 'cat', name: ffCH[1] } : ffSH ? { t: 'loja', name: ffSH[1], key: ffSH[0] } : !ik && (ffD || ffYr) && this.tema === 'sub' ? this.sujeito : null
      : null;

    // Lembretes veterinários
    const ffMes = (s: string) => { const d = new Date(`${s}T00:00`); return `${d.getDate()} de ${hc[d.getMonth()]}${d.getFullYear() !== ffNow.getFullYear() ? ` de ${d.getFullYear()}` : ''}`; };
    const ffPet = ANIMAIS.find((a) => new RegExp(`\\b${semAcentos(a)}\\b`).test(n)) ?? null;
    const ffRT = /vacin/.test(n) ? 'vacina' : /desparasit/.test(n) ? (/extern/.test(n) ? 'externa' : /intern/.test(n) ? 'interna' : 'desp') : null;
    if ((/lembret|vacin|desparasit|em atraso|atrasad/.test(n) || (/\bproxim[ao]s?\b|\bquando\b/.test(n) && (ffPet || /veterin|consulta/.test(n)))) && !/gast|pagu|custo|quanto custou|despes/.test(n)) {
      const V = c.vet, I = (r: Lembrete) => V.info(r);
      const all = V.ordenados().filter((r) => (!ffPet || r.pet === ffPet) && (!ffRT || (ffRT === 'desp' ? /interna|externa/.test(r.type) : r.type === ffRT)
        || (ffRT === 'vacina' && r.type === 'outro' && /vacin/.test(semAcentos(r.label || '')))));
      const nm = (r: Lembrete) => (ffPet ? I(r).label : `${r.pet} · ${I(r).label}`);
      if (!V.todos().length) return 'Ainda não tens lembretes. Cria-os na página Veterinário, em «+ Novo».';
      if (/(marca|regista|assinala)\w*.*\b(feit|dad|tomad)|\bja (fiz|dei|tomou|levou|fez)\b|\bfoi feit|\besta feit|\bja esta\b/.test(n)) {
        const r = all[0];
        if (!r) return `Não encontrei esse lembrete${ffPet ? ` ${deAnimal(ffPet)}` : ''}.`;
        this.pendente = { type: 'vet-done', payload: { id: r.id } };
        return `Vou marcar como feito hoje: ${r.pet} · ${I(r).label}${r.every > 0 ? '. A próxima data passa a ser calculada a partir de hoje' : '. Como é «só uma vez», o lembrete é removido'}. Confirmas?`;
      }
      if (/\bultim[ao]\b|quando foi/.test(n)) {
        const r = all.slice().sort((a, b) => b.last.localeCompare(a.last))[0];
        return r ? `A última ${I(r).label} ${deAnimal(r.pet)} foi a ${ffMes(r.last)}.` : `Não encontrei registo desse lembrete${ffPet ? ` ${deAnimal(ffPet)}` : ''}.`;
      }
      if (/atras/.test(n)) {
        const l = all.filter((r) => I(r).days < 0);
        return l.length
          ? `Tens ${l.length} ${l.length === 1 ? 'lembrete' : 'lembretes'} em atraso:\n${l.map((r) => `• ${nm(r)} — ${I(r).when.toLowerCase()}`).join('\n')}`
          : 'Não tens lembretes em atraso ✅';
      }
      if (!all.length) return `Não há lembretes${ffPet ? ` ${deAnimal(ffPet)}` : ''}${ffRT ? ' desse tipo' : ''}.`;
      if ((ffRT || /\bproxim[ao]\b|\bquando\b/.test(n)) && !/lembretes|\bproxim[ao]s\b/.test(n)) {
        const r = all[0]!, d = I(r).days;
        return d < 0
          ? `A ${I(r).label} ${deAnimal(r.pet)} está em atraso desde ${ffMes(I(r).next)} (${I(r).when.toLowerCase().replace('em atraso ', '')}).`
          : `A próxima ${I(r).label} ${deAnimal(r.pet)} é a ${ffMes(I(r).next)} (${I(r).when.toLowerCase()}).`;
      }
      return `${ffPet ? `Lembretes ${deAnimal(ffPet)}` : 'Próximos lembretes'}:\n${all.slice(0, 5).map((r) => `• ${nm(r)} — ${I(r).when.toLowerCase()} (${I(r).short})`).join('\n')}${all.length > 5 ? `\n…e mais ${all.length - 5}.` : ''}`;
    }

    // Notas
    if (/\bnotas?\b/.test(n)) {
      const wn = f.filter((t) => t.note);
      const term = (n.match(/\bnotas?\b.*?\b(?:com|sobre|a dizer|que (?:diga|digam|tenha|tenham|fala|falam) (?:de|em|sobre)?)\s+(.+?)[?.!]*$/) || [])[1];
      const fm = (t: Movimento) => `${Number(t.date.slice(8, 10))}/${t.date.slice(5, 7)} · ${t.title} ${A(t.amount)} — «${t.note}»`;
      if (!wn.length) return 'Ainda não tens movimentos com nota.';
      if (ffSH && !term) {
        const w = f.filter((x) => normal(x.title) === ffSH[0]).sort((a, b) => b.date.localeCompare(a.date)).find((x) => x.note);
        return w ? `Nota — ${ffSH[1]} (${Number(w.date.slice(8, 10))}/${w.date.slice(5, 7)}): «${w.note}»` : `${ffSH[1]} não tem nenhuma nota.`;
      }
      const l = (term ? wn.filter((t) => normal(t.note).includes(normal(term))) : wn).sort((a, b) => b.date.localeCompare(a.date));
      return l.length
        ? `${term ? `Notas com «${term}»` : 'Movimentos com nota'}:\n${l.slice(0, 5).map(fm).join('\n')}${l.length > 5 ? `\n…e mais ${l.length - 5}.` : ''}`
        : `Não encontrei notas com «${term}».`;
    }

    const ffRow = (t: Movimento) => `${Number(t.date.slice(8, 10))}/${t.date.slice(5, 7)} · ${t.title} ${A(t.amount)}`;
    const ffList = (l: Movimento[]) => l.slice(0, 5).map(ffRow).join('\n') + (l.length > 5 ? `\n…e mais ${l.length - 5}.` : '');
    const ffTyp = /receit|recebi|ganhei|entrad/.test(n) ? 'income' : /despes|gast|compr|pag/.test(n) ? 'expense' : null;
    const ffOk = (t: Movimento) => !ffTyp || t.movementType === ffTyp;
    const ffDay = ((): [string, string] | null => {
      const d = new Date(ffNow.getFullYear(), ffNow.getMonth(), ffNow.getDate());
      if (/\bhoje\b/.test(n)) return [iso(d), 'hoje'];
      if (/\banteontem\b/.test(n)) { d.setDate(d.getDate() - 2); return [iso(d), 'anteontem']; }
      if (/\bontem\b/.test(n)) { d.setDate(d.getDate() - 1); return [iso(d), 'ontem']; }
      const m = n.match(/\bdia (\d{1,2})\b/) || n.match(/\ba (\d{1,2}) de\b/);
      if (m && +m[1]! >= 1 && +m[1]! <= 31) { const D = ffD || It; return [`${anoMes(D)}-${P2(+m[1]!)}`, `a ${+m[1]!} de ${ffL(D)}`]; }
      return null;
    })();
    if (/\bultim[oa]s?\b/.test(n) && /moviment|despes|gast|compr|pagament|receit|registo/.test(n)) {
      const k = +(n.match(/\bultim[oa]s (\d{1,2})\b/)?.[1] || (/\bultim[oa]s\b/.test(n) ? 5 : 1));
      const l = [...f].filter(ffOk).sort((a, b) => b.date.localeCompare(a.date) || (+b.id || 0) - (+a.id || 0)).slice(0, Math.min(k, 10));
      return l.length
        ? l.length === 1
          ? `O último ${ffTyp === 'income' ? 'recebimento' : ffTyp === 'expense' ? 'gasto' : 'movimento'} foi: ${ffRow(l[0]!)}.`
          : `Últimos ${l.length} ${ffTyp === 'income' ? 'recebimentos' : ffTyp === 'expense' ? 'gastos' : 'movimentos'}:\n${ffList(l)}`
        : 'Ainda não há movimentos registados.';
    }
    if (/\b(maior|mais cara|mais caro|menor|mais barata|mais barato)\b/.test(n) && /despes|gast|compr|pagament|receit/.test(n) && !/categor/.test(n)) {
      const inc = /receit/.test(n), lo = /menor|barat/.test(n);
      const l = ffPer.tx.filter((t) => t.movementType === (inc ? 'income' : 'expense')).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      const t = lo ? l[l.length - 1] : l[0];
      return t
        ? `${lo ? 'A menor' : 'A maior'} ${inc ? 'receita' : 'despesa'} de ${ffPer.L} foi ${t.title}: ${A(Math.abs(t.amount))} (${Number(t.date.slice(8, 10))}/${t.date.slice(5, 7)}).`
        : `Não há ${inc ? 'receitas' : 'despesas'} registadas em ${ffPer.L}.`;
    }
    if (ffDay && ik !== 'sld' && (!ik || ik === 'gas' || ik === 'rec' || /moviment|o que|que (paguei|comprei|gastei)/.test(n))) {
      const l = f.filter((t) => t.date === ffDay[0] && ffOk(t)), s = l.reduce((e, t) => e + t.amount, 0);
      const nome = ffTyp === 'income' ? 'recebimentos' : ffTyp === 'expense' ? 'gastos' : 'movimentos';
      return l.length
        ? `${nome[0]!.toUpperCase() + nome.slice(1)} ${ffDay[1].startsWith('a ') ? ffDay[1] : `de ${ffDay[1]}`}:\n${ffList(l)}\nTotal: ${A(ffTyp === 'expense' ? Math.abs(s) : s)}.`
        : `Não há ${nome} registados ${ffDay[1]}.`;
    }

    const tipo = ffSub ? ffSub.t : ik === 'comb' || ik === 'rec' || ik === 'ren' || ik === 'sal' || ik === 'vet' ? ik : 'gas';
    const ffLbl = ffSub ? ffSub.name : ({ comb: 'combustível', rec: 'receitas', ren: 'rendimento', sal: 'salários', vet: 'veterinário', gas: 'gastos' } as Record<string, string>)[tipo]!;
    const ffVal = (D: Date) => {
      const tx = on(D);
      return tipo === 'cat' ? gastosDe(tx.filter((t) => t.movementType === 'expense' && categoriaDespesa(t) === ffSub!.name))
        : tipo === 'loja' ? gastosDe(tx.filter((t) => t.movementType === 'expense' && normal(t.title) === ffSub!.key))
          : tipo === 'comb' ? tx.filter(eCombustivel).reduce((e, t) => e + Math.abs(t.amount), 0)
            : tipo === 'rec' ? tx.filter((t) => t.movementType === 'income').reduce((e, t) => e + t.amount, 0)
              : tipo === 'ren' ? un(new Date(D.getFullYear(), D.getMonth() - 1, 1))
                : tipo === 'sal' ? un(D)
                  : tipo === 'vet' ? gastosDe(tx.filter((t) => t.pet)) : gastosDe(tx);
    };
    const ffCap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
    if (/\b(media|medias|em media|por mes)\b/.test(n) && ik !== 'sld') {
      const ms: Date[] = [], cy = ffYr || (/\b(este|neste|deste) ano\b/.test(n) ? String(ffNow.getFullYear()) : null);
      for (let k = 1; k <= (cy ? 12 : 36) && ms.length < (cy ? 12 : 6); k++) {
        const D = new Date(ffNow.getFullYear(), ffNow.getMonth() - k, 1);
        if (cy && String(D.getFullYear()) !== cy) continue;
        if (f.some((t) => t.date.startsWith(anoMes(D))) || ((tipo === 'ren' || tipo === 'sal') && ffVal(D))) ms.push(D);
      }
      if (!ms.length) return `Ainda não há meses completos com movimentos para calcular a média de ${ffLbl}.`;
      const avg = ms.reduce((e, D) => e + ffVal(D), 0) / ms.length, cur = ffVal(new Date(ffNow.getFullYear(), ffNow.getMonth(), 1)), o = [...ms].reverse();
      this.tema = ik || this.tema;
      return `Média mensal ${ffSub ? 'em' : 'de'} ${ffLbl} (${ms.length === 1 ? ffL(o[0]!) : `${ffL(o[0]!)} a ${ffL(o[o.length - 1]!)}`}): ${A(avg)}.${tipo !== 'ren' && tipo !== 'sal' ? ` Em ${hc[ffNow.getMonth()]} vais em ${A(cur)}${avg ? `, ${cur > avg ? 'acima' : 'abaixo'} da média` : ''}.` : ''}`;
    }
    if (/\b(mais|menos)\b.*\bdo que\b|compar|diferenca|\bvs\b|versus|em relacao/.test(n) && ik !== 'sld') {
      const re = new RegExp(`\\b(${ffMo.join('|')})\\b(?:\\s+(?:de\\s+)?(20\\d{2}))?`, 'g');
      const ds = [...n.matchAll(re)].map((m) => {
        const mi = ffMo.indexOf(m[1]!);
        return new Date(m[2] ? +m[2] : mi > ffNow.getMonth() ? ffNow.getFullYear() - 1 : ffNow.getFullYear(), mi, 1);
      });
      let A1: Date, A2: Date;
      if (ds.length >= 2) [A1, A2] = ds as [Date, Date];
      else if (ds.length === 1) { A1 = ds[0]!; A2 = new Date(A1.getFullYear(), A1.getMonth() - 1, 1); }
      else if (/mes (passado|anterior)|ultimo mes/.test(n)) { A1 = new Date(ffNow.getFullYear(), ffNow.getMonth(), 1); A2 = new Date(ffNow.getFullYear(), ffNow.getMonth() - 1, 1); }
      else { A1 = new Date(It.getFullYear(), It.getMonth(), 1); A2 = new Date(It.getFullYear(), It.getMonth() - 1, 1); }
      const v1 = ffVal(A1), v2 = ffVal(A2), d = v1 - v2;
      if (ffSub) { this.tema = 'sub'; this.sujeito = ffSub; }
      if (!v1 && !v2) return `Não há valores de ${ffLbl} em ${ffL(A1)} nem em ${ffL(A2)}.`;
      if (!v2) return `${ffCap(ffLbl)}: ${ffL(A1)} ${A(v1)} · ${ffL(A2)} sem valores, por isso não há comparação.`;
      return `${ffCap(ffLbl)}: ${ffL(A1)} ${A(v1)} · ${ffL(A2)} ${A(v2)} — ${Math.abs(d) < 0.005 ? 'iguais' : `${d > 0 ? 'mais' : 'menos'} ${A(Math.abs(d))} (${d > 0 ? '+' : '−'}${pctAbs(variacao(v1, v2))})`}.`;
    }
    if ((!ik || ik === 'gas') && /onde (e que )?(gastei|gasto|gastamos) mais|(maiores|principais) (lojas|compras|despesas)|em que lojas/.test(n)) {
      const by: Record<string, number> = {};
      ffExpP.forEach((t) => { by[t.title] = (by[t.title] || 0) + Math.abs(t.amount); });
      const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
      this.tema = 'top';
      return top.length ? `Onde gastaste mais em ${ffPer.L}: ${top.map(([t, v], i) => `${i + 1}. ${t} ${A(v)}`).join(' · ')}.` : `Não há gastos registados em ${ffPer.L}.`;
    }
    if (ffSub) {
      this.tema = 'sub'; this.sujeito = ffSub;
      if (ffSub.t === 'cat') {
        const l = ffExpP.filter((t) => categoriaDespesa(t) === ffSub.name), s = l.reduce((e, t) => e + Math.abs(t.amount), 0), tot = gastosDe(ffPer.tx);
        return l.length
          ? `${ffSub.name} em ${ffPer.L}: ${A(s)} em ${l.length} ${l.length === 1 ? 'movimento' : 'movimentos'}${tot ? ` (${percentagem(Math.round((s / tot) * 1000) / 10)} dos gastos)` : ''}.`
          : `Não há gastos em ${ffSub.name} em ${ffPer.L}.`;
      }
      const l = ffExpP.filter((t) => normal(t.title) === ffSub.key), s = l.reduce((e, t) => e + Math.abs(t.amount), 0);
      if (l.length) return `${ffSub.name} em ${ffPer.L}: ${A(s)} em ${l.length} ${l.length === 1 ? 'compra' : 'compras'}.`;
      const u = f.filter((t) => t.movementType === 'expense' && normal(t.title) === ffSub.key).sort((a, b) => b.date.localeCompare(a.date))[0];
      return `Não há compras em ${ffSub.name} em ${ffPer.L}.${u ? ` A última foi a ${Number(u.date.slice(8, 10))} de ${hc[Number(u.date.slice(5, 7)) - 1]}${u.date.slice(0, 4) !== String(ffNow.getFullYear()) ? ` de ${u.date.slice(0, 4)}` : ''} (${A(Math.abs(u.amount))}).` : ''}`;
    }
    if (!ik || ik === 'gas') {
      const w = n.match(/\b(?:no|na|nos|nas)\s+([a-z0-9][a-z0-9 ]{2,30}?)(?:\s+(?:em|este|neste|no|na|de|do|da|ha)\b|[?!.]|$)/);
      if (w && !/^(mes|ano|total|dia|semana|fim|geral|conta|contas|principal|revolut|edenred|ultimo|ultima|passado|passada|mes passado|mes anterior)\b/.test(w[1]!.trim())) {
        return `Não encontrei gastos com «${w[1]!.trim().replace(/(^|\s)\S/g, (x) => x.toUpperCase())}». Verifica se o nome está igual ao dos teus movimentos.`;
      }
    }
    const saldos = () => c.estado.accounts.map((a) => `${a.name}: ${A(c.saldoAtual(a))}`).join(' · ');
    if (ffD) {
      ik = ik || this.tema || 'res';
      const L = ffL(ffD), Dp = new Date(ffD.getFullYear(), ffD.getMonth() - 1, 1), Lp = ffL(Dp), tx = on(ffD), g = gastosDe(tx), gp = gastosDe(on(Dp));
      const rc = tx.filter((t) => t.movementType === 'income').reduce((e, t) => e + t.amount, 0);
      if (ik !== 'sld' && !tx.length && ffD > new Date(ffNow.getFullYear(), ffNow.getMonth(), 1)) return `${L[0]!.toUpperCase() + L.slice(1)} ainda não chegou — não há movimentos registados.`;
      if (ik === 'comb') {
        const l = tx.filter(eCombustivel), v = l.reduce((e, t) => e + Math.abs(t.amount), 0);
        return l.length ? `Combustível em ${L}: ${A(v)} em ${l.length} ${l.length === 1 ? 'abastecimento' : 'abastecimentos'}.` : `Não há abastecimentos registados em ${L}.`;
      }
      if (ik === 'vet') {
        const v = ANIMAIS.map((p) => gastosDe(tx.filter((t) => t.pet === p)));
        return `Veterinário em ${L}: ${A(v.reduce((s, x) => s + x, 0))} (${ANIMAIS.map((p, i) => `${p} ${A(v[i]!)}`).join(' · ')}).`;
      }
      if (ik === 'cat') {
        const by: Record<string, number> = {};
        tx.filter((t) => t.movementType === 'expense').forEach((t) => { const k = categoriaDespesa(t); by[k] = (by[k] || 0) + Math.abs(t.amount); });
        const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
        return top ? `A maior categoria em ${L} foi ${top[0]}: ${A(top[1])} (${percentagem(Math.round((top[1] / g) * 1000) / 10)} dos gastos).` : `Não há gastos registados em ${L}.`;
      }
      if (ik === 'sal') { const s = un(ffD); return s ? `Salários de ${L}: ${A(s)}.` : `Não há salários registados em ${L}.`; }
      if (ik === 'ren') {
        const r = un(Dp), rp = un(new Date(ffD.getFullYear(), ffD.getMonth() - 2, 1));
        return r ? `Rendimento de ${L} (salários de ${Lp}): ${A(r)}${rp ? `, ${r >= rp ? '+' : '−'}${pctAbs(variacao(r, rp))} face ao mês anterior` : ''}.` : `Não há salários registados em ${Lp}.`;
      }
      if (ik === 'rec') return `Receitas registadas em ${L}: ${A(rc)}.`;
      if (ik === 'sld') return `O saldo das contas é sempre o atual, não depende do mês — ${saldos()}.`;
      if (ik === 'gas') return g ? `Em ${L} gastaste ${A(g)}${gp ? `, ${g > gp ? 'mais' : 'menos'} ${pctAbs(variacao(g, gp))} do que em ${Lp}` : ''}.` : `Não há gastos registados em ${L}.`;
      return g || rc || un(Dp) ? `Resumo de ${L}: gastos ${A(g)} · receitas ${A(rc)} · rendimento ${A(un(Dp))}.` : `Não há movimentos registados em ${L}.`;
    }

    // Sem mês na pergunta: mês escolhido na app
    const sn = gastosDe(on(It)), cn = gastosDe(on(an));
    if (/combust|gasolin|gasoleo|abastec/.test(n)) {
      const Bt = It.getFullYear(), Vt = f.filter((t) => eCombustivel(t) && t.date.startsWith(`${Bt}-`)), Ht = Vt.filter((t) => Number(t.date.slice(5, 7)) === It.getMonth() + 1);
      const Gt = Vt.reduce((e, t) => e + Math.abs(t.amount), 0), Kt = Bt < ffNow.getFullYear() ? 12 : Bt > ffNow.getFullYear() ? 0 : ffNow.getMonth() + 1;
      return `Combustível em ${mm}: ${A(Ht.reduce((e, t) => e + Math.abs(t.amount), 0))} em ${Ht.length} ${Ht.length === 1 ? 'abastecimento' : 'abastecimentos'}. Média mensal de ${Bt}: ${Kt ? A(Gt / Kt) : '—'}.`;
    }
    if (reAnimais.test(n)) {
      const v = ANIMAIS.map((p) => gastosDe(on(It).filter((t) => t.pet === p)));
      return `Veterinário em ${mm}: ${A(v.reduce((s, x) => s + x, 0))} (${ANIMAIS.map((p, i) => `${p} ${A(v[i]!)}`).join(' · ')}).`;
    }
    if (/categor|maior/.test(n)) {
      const vn = categoriasDoMes(c.estado, It, 'despesas')[0];
      return vn && vn.amount > 0 ? `A maior categoria em ${mm} é ${vn.name}: ${A(vn.amount)} (${percentagem(vn.share)} dos gastos).` : `Ainda não há gastos registados em ${mm}.`;
    }
    if (/rendiment|salari|ordenad|vencimento/.test(n)) {
      const dn = un(an), fn = un(new Date(It.getFullYear(), It.getMonth() - 2, 1));
      return dn ? `Rendimento de ${mm} (salários de ${mp}): ${A(dn)}${fn ? `, ${dn >= fn ? '+' : '−'}${pctAbs(variacao(dn, fn))} face ao mês anterior` : ''}.` : `Ainda não há salários registados em ${mp}.`;
    }
    if (/receit|recebi|ganhei/.test(n)) return `Receitas registadas em ${mm}: ${A(on(It).filter((t) => t.movementType === 'income').reduce((e, t) => e + t.amount, 0))}.`;
    if (/saldo|conta|revolut|dinheiro/.test(n)) return `Saldos — ${saldos()}.`;
    if (/gast|despes|paguei/.test(n)) return sn ? `Em ${mm} gastaste ${A(sn)}${cn ? `, ${sn > cn ? 'mais' : 'menos'} ${pctAbs(variacao(sn, cn))} do que em ${mp}` : ''}.` : `Ainda não há gastos registados em ${mm}.`;
    if (/obrigad/.test(n)) return 'De nada! Sempre que precisares, estou aqui.';
    if (/^(ola|oi|bom dia|boa tarde|boa noite)/.test(n)) return 'Olá! Pergunta-me por gastos, saldo, rendimento, categorias, combustível ou veterinário.';
    return 'Ainda não sei responder a isso. Experimenta perguntar por gastos, saldo, rendimento, receitas, categorias, combustível ou veterinário.';
  }
}
