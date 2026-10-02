// Ponto de entrada da app.
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
iniciarLembretes();
createRoot(document.getElementById('root')!).render(<App />);
