import { PREFIXO_REAL, PREFIXO_V2 } from './dados';
import versao from '../versao.json';

/** Versão da app (única fonte: app/versao.json). */
export const VERSAO: string = versao.versao;
/** Compilada para a raiz (app de produção) ou para a versão de teste /v2/ (`vite build --mode raiz|v2`). */
export const NA_RAIZ = import.meta.env.MODE === 'raiz';
/** Na raiz usa as chaves reais `financas-familiar:*`; na /v2/ só as chaves `financas-v2:*`. */
export const PREFIXO = NA_RAIZ ? PREFIXO_REAL : PREFIXO_V2;
/** Nome da cache offline: o mesmo da app anterior na raiz (a atualização reaproveita-a e limpa-a). */
export const CACHE = NA_RAIZ ? 'financas-app' : 'financas-v2';
