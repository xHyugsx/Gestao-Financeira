// Ponto de entrada da app.
import '../../css/app.css';
import './v2.css';
import './temas.css';
import { createRoot } from 'react-dom/client';
import { iniciarAtualizacoes } from './atualizacoes';
import { iniciarAutobloqueio } from './bloqueio/autobloqueio';
import { ligacoes } from './bloqueio/estado';
import { iniciarPrivacidade } from './bloqueio/privacidade';
import { VERSAO } from './config';
import { tratarRespostaGoogle } from './dados/drive';
import { App } from './layout/App';
import { iniciarLembretes } from './veterinario/lembretes';

window.ffVer = VERSAO;
// Janela aberta só para a autorização do Google Drive: entrega a resposta à app e fecha-se
if (tratarRespostaGoogle()) {
  createRoot(document.getElementById('root')!).render(<p className="ffdrive-volta">Ligação ao Google Drive feita. Pode voltar à app.</p>);
} else {
  iniciarAtualizacoes();
  iniciarPrivacidade();
  iniciarAutobloqueio(() => ligacoes.bloquear());
  iniciarLembretes();
  createRoot(document.getElementById('root')!).render(<App />);
}
