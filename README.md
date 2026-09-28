# Finanças · app de finanças familiares

App web instalável (PWA) para gerir as finanças da família, com assistente **Jarvis**, ecrã de bloqueio com PIN e impressão digital, lembretes veterinários e importação de extratos bancários.

**Versão:** 1.9.0

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `index.html` | Página base: carrega estilos, módulos e o núcleo da app |
| `manifest.webmanifest` | Dados de instalação (nome, cores, ícones) |
| `service-worker.js` | Funcionamento offline e atualizações |
| `version.json` | Versão atual e lista de ficheiros guardados offline |
| `css/app.css` | Todos os estilos da app |
| `js/app.js` | Núcleo da app (React, compilado) |
| `js/modulos/bloqueio.js` | Ecrã de bloqueio, PIN e impressão digital |
| `js/modulos/autobloqueio.js` | Bloquear ao voltar à app |
| `js/modulos/privacidade.js` | Imagem desfocada no gestor de apps |
| `js/modulos/veterinario.js` | Lembretes veterinários |
| `js/modulos/extratos.js` | Importação de extratos (XLSX, XLS, CSV) |
| `js/modulos/armazenamento.js` | Indicador de espaço e aviso de gravação falhada |
| `js/modulos/lembrete-backup.js` | Lembrete de cópia de segurança |
| `js/modulos/jarvis-sugestoes.js` | Sugestões do Jarvis por página |
| `js/modulos/jarvis-correcao.js` | Tolerância a erros de escrita do Jarvis |
| `js/modulos/animacoes.js` | Animação de fecho das Definições |
| `js/modulos/atualizacoes.js` | Aviso "Nova versão disponível" |
| `img/` | Imagens (fundo do bloqueio, fundo cósmico, Jarvis) |
| `fonts/` | Tipos de letra |
| `icons/` | Ícones da app instalada |

## Como publicar uma atualização

1. Substituir **apenas os ficheiros alterados** (a lista vem com cada versão).
2. Substituir sempre o **`version.json`** — é ele que faz aparecer o aviso "Nova versão disponível".
3. Na app, carregar em **Atualizar**.

Os dados ficam guardados no navegador do telemóvel; fazer backup em Definições › Backup.
