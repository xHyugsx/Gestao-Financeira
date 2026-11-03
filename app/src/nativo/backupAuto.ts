// Backup automático da APK: ao sair da app, se os dados mudaram, grava uma cópia em Documentos › Finanças › Automático
// (uma por dia, substituída durante o dia) e guarda só as últimas 7. As cópias ficam fora da app: sobrevivem a desinstalar.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { chave, type Backup } from '../dados';
import { PREFIXO } from '../config';
import { isoDia } from './avisos';
import { eNativo } from './plataforma';

export const PASTA_AUTO = 'Finanças/Automático';
const CHAVE = chave('backupAutomatico', PREFIXO);
const GUARDAR = 7;

export interface EstadoBackupAuto { ligado: boolean; ultimo?: string; movimentos?: number; copias?: number; assinatura?: string; erro?: string }

export function estadoBackupAuto(): EstadoBackupAuto {
  try {
    const e = JSON.parse(localStorage.getItem(CHAVE) || 'null') as EstadoBackupAuto | null;
    return e && typeof e === 'object' ? { ...e, ligado: e.ligado !== false } : { ligado: true };
  } catch { return { ligado: true }; }
}

export function gravarEstadoBackupAuto(e: EstadoBackupAuto): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event('ff-backup-auto'));
}

/** Assinatura do conteúdo (sem a data de exportação): só se grava quando os dados mudam. */
export function assinatura(b: Backup): string {
  const s = JSON.stringify({ ...b, exportedAt: '' });
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${s.length}:${(h >>> 0).toString(36)}`;
}

/** Nomes das cópias a apagar: ficam as `guardar` mais recentes. */
export function copiasAApagar(nomes: string[], guardar = GUARDAR): string[] {
  return nomes.filter((n) => /^financas-auto-\d{4}-\d{2}-\d{2}.*\.json$/.test(n)).sort().reverse().slice(guardar);
}

let aGravar = false;

/** Grava a cópia de hoje se o backup automático estiver ligado e os dados tiverem mudado. */
export async function fazerBackupAuto(conteudo: () => Backup | undefined, forcar = false): Promise<boolean> {
  if (!eNativo() || aGravar) return false;
  const e = estadoBackupAuto();
  if (!e.ligado) return false;
  const b = conteudo();
  if (!b || !Array.isArray(b.data.transactions) || !b.data.transactions.length) return false;
  const sig = assinatura(b);
  if (!forcar && sig === e.assinatura) return false;
  aGravar = true;
  try {
    await Filesystem.requestPermissions().catch(() => undefined);
    const texto = JSON.stringify(b, null, 2), agora = new Date();
    let nome = `financas-auto-${isoDia(agora)}.json`;
    try {
      await Filesystem.writeFile({ path: `${PASTA_AUTO}/${nome}`, data: texto, encoding: Encoding.UTF8, directory: Directory.Documents, recursive: true });
    } catch {
      // A cópia de hoje pode pertencer a uma instalação anterior da app (não se pode substituir): grava outra
      nome = `financas-auto-${isoDia(agora)}-${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}.json`;
      await Filesystem.writeFile({ path: `${PASTA_AUTO}/${nome}`, data: texto, encoding: Encoding.UTF8, directory: Directory.Documents, recursive: true });
    }
    let copias = 1;
    try {
      const { files } = await Filesystem.readdir({ path: PASTA_AUTO, directory: Directory.Documents });
      const nomes = files.map((f) => f.name);
      for (const n of copiasAApagar(nomes)) await Filesystem.deleteFile({ path: `${PASTA_AUTO}/${n}`, directory: Directory.Documents }).catch(() => undefined);
      copias = Math.min(GUARDAR, nomes.filter((n) => n.startsWith('financas-auto-')).length);
    } catch { /* sem listagem: fica a contagem mínima */ }
    gravarEstadoBackupAuto({ ...e, ultimo: agora.toISOString(), movimentos: b.data.transactions.length, copias, assinatura: sig, erro: undefined });
    return true;
  } catch {
    gravarEstadoBackupAuto({ ...e, erro: 'Não foi possível gravar em Documentos.' });
    return false;
  } finally { aGravar = false; }
}
