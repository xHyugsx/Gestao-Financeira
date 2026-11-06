import { PREFIXO_REAL } from './dados';
import versao from '../versao.json';

/** Versão da app (única fonte: app/versao.json). */
export const VERSAO: string = versao.versao;
/** Nível da parte Android: sobe quando muda o que só a APK tem (plugins, android/). Com o mesmo nível, a APK atualiza-se sozinha. */
export const NATIVO: number = (versao as { nativo?: number }).nativo ?? 1;
/** Prefixo das chaves do localStorage (secção 3 do CLAUDE.md). */
export const PREFIXO = PREFIXO_REAL;
/** Nome da cache offline (o mesmo da 1.9.x: as atualizações reaproveitam-na e limpam-na). */
export const CACHE = 'financas-app';
