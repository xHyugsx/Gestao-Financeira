// Isolamento dos dados da versão de teste: tem de correr antes de qualquer acesso ao localStorage.
import '../../espelho-v2/prefixo.js';
// Módulo da app atual reaproveitado até às Definições (etapa 9).
import '../../js/modulos/armazenamento.js';
import '../../espelho-v2/menu-v2.js';
import '../../css/app.css';
import './v2.css';
import { createRoot } from 'react-dom/client';
import { iniciarAtualizacoes } from './atualizacoes';
import { iniciarAutobloqueio } from './bloqueio/autobloqueio';
import { ligacoes } from './bloqueio/estado';
import { iniciarPrivacidade } from './bloqueio/privacidade';
import { VERSAO } from './config';
import { App } from './layout/App';
import { iniciarLembretes } from './veterinario/lembretes';

window.ffVer = VERSAO;
iniciarAtualizacoes();
iniciarPrivacidade();
iniciarAutobloqueio(() => ligacoes.bloquear());
iniciarLembretes((p) => window.ffGoPg?.(p));
createRoot(document.getElementById('root')!).render(<App />);
