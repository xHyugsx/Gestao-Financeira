// Notificações da APK (plugin @capacitor/local-notifications): agenda os avisos de avisos.ts no telemóvel, sem servidor.
// A app volta a agendar tudo ao abrir, ao sair e quando a configuração muda.
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications';
import { chave, type Estado } from '../dados';
import { PREFIXO } from '../config';
import { feito, todos } from '../veterinario/lembretes';
import { adiar, avisosPrevistos, idDoAviso, lerConfig, type Aviso, type ConfigAvisos, type Destino } from './avisos';
import { eNativo } from './plataforma';

const CHAVE = chave('notificacoes', PREFIXO);
const CANAL = 'avisos';

export function configAvisos(): ConfigAvisos {
  try { return lerConfig(localStorage.getItem(CHAVE)); } catch { return lerConfig(null); }
}

export function gravarConfigAvisos(c: ConfigAvisos): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch { /* sem armazenamento */ }
}

const ultimoBackup = () => { try { return localStorage.getItem(chave('ultimoBackup', PREFIXO)) || ''; } catch { return ''; } };

/** O Android deixa a app mostrar notificações? Pede autorização se ainda não foi pedida. */
export async function autorizar(pedir: boolean): Promise<boolean> {
  try {
    let p = await LocalNotifications.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      if (!pedir) return false;
      p = await LocalNotifications.requestPermissions();
    }
    return p.display === 'granted';
  } catch { return false; }
}

const paraNotificacao = (a: Aviso) => ({
  id: idDoAviso(a.chave),
  title: a.titulo,
  body: a.texto,
  largeBody: a.texto,
  channelId: CANAL,
  smallIcon: 'ic_stat_financas',
  iconColor: '#A855F7',
  schedule: { at: a.quando, allowWhileIdle: true },
  actionTypeId: a.botoes,
  extra: { chave: a.chave, tipo: a.tipo, titulo: a.titulo, texto: a.texto, botoes: a.botoes, destino: a.destino },
});

let estadoAtual: () => Estado = () => { throw new Error('sem estado'); };

/** Apaga os avisos agendados e agenda os de agora. */
export async function reagendar(pedir = false): Promise<number> {
  if (!eNativo()) return 0;
  try {
    const pendentes = await LocalNotifications.getPending();
    if (pendentes.notifications.length) await LocalNotifications.cancel({ notifications: pendentes.notifications.map((n) => ({ id: n.id })) });
    const config = configAvisos();
    if (!config.ligado || !(await autorizar(pedir))) return 0;
    const avisos = avisosPrevistos(estadoAtual(), { agora: new Date(), lembretes: todos(), ultimoBackup: ultimoBackup(), config }).slice(0, 60);
    if (avisos.length) await LocalNotifications.schedule({ notifications: avisos.map(paraNotificacao) });
    return avisos.length;
  } catch { return 0; }
}

/** Notificação de teste, daqui a 3 segundos. */
export async function notificacaoDeTeste(): Promise<boolean> {
  if (!(await autorizar(true))) return false;
  await LocalNotifications.schedule({ notifications: [paraNotificacao({
    chave: 'teste', tipo: 'backup', quando: new Date(Date.now() + 3000), destino: {},
    titulo: 'As notificações estão a funcionar ✅', texto: 'É assim que os avisos da Finanças vão aparecer.',
  })] });
  return true;
}

/**
 * Prepara o canal, os botões e o que fazer ao tocar. `abrir` recebe o destino (página, movimento, backup) e é chamado
 * também quando a app é aberta por uma notificação (a App trata disso depois do desbloqueio).
 */
export async function iniciarNotificacoes(estado: () => Estado, abrir: (d: Destino) => void): Promise<void> {
  if (!eNativo()) return;
  estadoAtual = estado;
  try {
    await LocalNotifications.createChannel({ id: CANAL, name: 'Avisos', description: 'Recorrentes, ordenado, despesas anuais, veterinário e backup', importance: 4, visibility: 0 });
    await LocalNotifications.registerActionTypes({ types: [
      { id: 'recorrente', actions: [{ id: 'ver', title: 'Ver' }, { id: 'amanha', title: 'Lembrar amanhã' }] },
      { id: 'vet', actions: [{ id: 'ver', title: 'Ver' }, { id: 'feito', title: 'Marcar como feita' }] },
      { id: 'ordenado', actions: [{ id: 'confirmar', title: 'Confirmar' }] },
    ] });
    await LocalNotifications.addListener('localNotificationActionPerformed', (r: ActionPerformed) => {
      const extra = (r.notification.extra ?? {}) as Partial<Aviso>;
      const destino = extra.destino ?? {};
      if (r.actionId === 'amanha' && extra.chave && extra.tipo) {
        gravarConfigAvisos(adiar(configAvisos(), { chave: extra.chave, tipo: extra.tipo, titulo: extra.titulo ?? '', texto: extra.texto ?? '', botoes: extra.botoes, destino }, new Date()));
        void reagendar();
        return;
      }
      if (r.actionId === 'feito' && destino.vet !== undefined) { feito(destino.vet); void reagendar(); }
      abrir(destino);
    });
  } catch { /* sem notificações neste telemóvel */ }
}
