// Isolamento dos dados da versão de teste: tem de correr antes de qualquer acesso ao localStorage.
import '../../espelho-v2/prefixo.js';
// Módulos da app atual reaproveitados até serem reescritos (bloqueio: etapa 5).
import '../../js/modulos/bloqueio.js';
import '../../js/modulos/autobloqueio.js';
import '../../js/modulos/privacidade.js';
import '../../espelho-v2/menu-v2.js';
import '../../css/app.css';
import './v2.css';
import { createRoot } from 'react-dom/client';
import { iniciarAtualizacoes } from './atualizacoes';
import { VERSAO } from './config';
import { App } from './layout/App';

window.ffVer = VERSAO;
iniciarAtualizacoes();
createRoot(document.getElementById('root')!).render(<App />);
