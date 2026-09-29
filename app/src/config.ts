import { PREFIXO_V2 } from './dados';
import versao from '../versao.json';

/** Versão da app nova (única fonte: app/versao.json). */
export const VERSAO: string = versao.versao;
/** Enquanto estiver em /v2/, a app nova usa só as chaves `financas-v2:*`. */
export const PREFIXO = PREFIXO_V2;
/** Nome da cache offline (tem de começar por "financas-" e ser diferente da app atual). */
export const CACHE = 'financas-v2';
