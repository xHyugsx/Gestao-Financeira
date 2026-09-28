# Finanças · app de finanças familiares

App web instalável (PWA) para gerir as finanças da família, com assistente **Jarvis**, ecrã de bloqueio com PIN e impressão digital, lembretes veterinários e importação de extratos bancários.

**Versão:** 1.9.3

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
| `vendor/` | Bibliotecas de terceiros guardadas localmente (SheetJS, pdf.js) |
| `espelho-v2/` | Peças só da versão de teste `/v2/` (dados isolados e menu "V2 · teste") |
| `scripts/montar-site.mjs` | Monta o site publicado em `_site/` (raiz + `/v2/`) |
| `docs/PLANO-FASE-2.md` | Plano da reconstrução da app |

## Como publicar uma atualização

O site é publicado pelo **GitHub Actions** a partir do `main` (*Settings › Pages › Source: GitHub Actions*):

1. Juntar as alterações ao `main` (normalmente com **Merge** no pull request).
2. O Actions corre os testes; **só publica se todos passarem**. Se falharem, fica no ar a versão anterior.
3. Na app, carregar em **Atualizar** quando aparecer "Nova versão disponível" (depende do `version.json`).

### Versão de teste (`/v2/`)

- Endereço: `…/Gestao-Financeira/v2/` — instala-se como **«Finanças V2»**, ao lado da app atual.
- Tem **dados próprios** (prefixo `financas-v2:`) e nunca altera os da app atual.
- A faixa **"V2 · teste"** no topo abre o menu: **Copiar dados da versão atual** (só lê os dados reais) e **Apagar dados da V2**.

Os dados ficam guardados no navegador do telemóvel; fazer backup em Definições › Backup.

## Testes automáticos

- `tests/`: testes de interface com dados **fictícios** (arranque, bloqueio, movimentos, Jarvis, respostas de referência, extratos, veterinário, calendário, offline e compatibilidade de dados).
- No computador: `pip install playwright`, `python -m playwright install chromium`, Node.js, e depois `python tests/correr.py` (ou `python tests/correr.py jarvis` para correr só um grupo). Os testes montam e servem `_site/`.
- No GitHub: correm sozinhos a cada envio (separador **Actions**). Visto verde = tudo bem; cruz vermelha = algo falhou (o GitHub envia um email).
- **Respostas de referência do Jarvis**: `tests/referencias/jarvis.json` guarda as respostas da versão atual a ~120 perguntas; o teste `referencias` avisa se alguma mudar. Para fixar um novo comportamento de propósito: `python tests/capturar_referencias.py`.
- Versão de teste: `FF_URL=v2/ FF_PREFIX=financas-v2: python tests/correr.py` corre os mesmos testes contra a `/v2/` (o GitHub corre os dois).
