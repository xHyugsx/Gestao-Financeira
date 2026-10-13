# Finanças · app de finanças familiares

App web instalável (PWA) para gerir as finanças da família, com assistente **Jarvis**, ecrã de bloqueio com PIN e impressão digital, lembretes veterinários e importação de extratos bancários.

**Versão:** ver `app/versao.json`.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `app/src/` | Código da app (React + TypeScript), por áreas |
| `app/src/dados/` | Núcleo de dados: leitura/gravação, saldos, rendimento, backup, PIN |
| `app/src/movimentos/`, `paginas/`, `definicoes/` | Movimentos, páginas (Principal, Análise, Calendário, Categorias, Resumo, Combustível, Veterinário) e Definições |
| `app/src/importacao/` | Importação de extratos (XLSX, XLS, CSV) com revisão |
| `app/src/jarvis/` | Jarvis: motor por regras, correção de erros de escrita, recibos PDF |
| `app/src/veterinario/`, `bloqueio/`, `layout/`, `ui/` | Lembretes e animais, ecrã de bloqueio, estrutura da app, componentes |
| `app/versao.json` | Versão da app |
| `app/service-worker.js` | Funcionamento offline e atualizações |
| `app/estatico/manifest.webmanifest` | Dados de instalação (nome, cores, ícones) |
| `app/retirado/` | Página e service worker que retiram as antigas `/v1/` e `/v2/` dos telemóveis |
| `css/app.css`, `img/`, `fonts/`, `icons/` | Estilos, imagens, tipos de letra e ícones |
| `vendor/` | Bibliotecas de terceiros guardadas localmente (SheetJS, pdf.js) |
| `scripts/montar-site.mjs` | Monta o site publicado em `_site/` |
| `tests/` | Testes de interface (Playwright) e respostas de referência |
| `docs/PLANO-FASE-2.md` | Plano e histórico da reconstrução da app |

## Como publicar uma atualização

O site é publicado pelo **GitHub Actions** a partir do `main` (*Settings › Pages › Source: GitHub Actions*):

1. Atualizar a versão em `app/versao.json`.
2. Juntar as alterações ao `main` (normalmente com **Merge** no pull request).
3. O Actions compila a app e corre os testes; **só publica se todos passarem**. Se falharem, fica no ar a versão anterior.
4. Na app, carregar em **Atualizar** quando aparecer "Nova versão disponível".

Os dados ficam guardados no navegador do telemóvel; fazer backup em Definições › Backup.

## Testes automáticos

- **Núcleo de dados e partes da app**: `npm ci` e depois `npm run verificar` (tipos + testes unitários, segundos). `tests/referencias/dados.json` guarda os resultados da 1.9.x com dados fictícios; as diferenças intencionais estão no plano (§4.1).
- **Interface** (`tests/`, dados **fictícios**): `pip install playwright`, `python -m playwright install chromium`, Node.js, e depois `python tests/correr.py` (ou `python tests/correr.py jarvis` para correr só um grupo). Os testes montam e servem `_site/`.
- **Respostas de referência do Jarvis**: `tests/referencias/jarvis.json` guarda as respostas a ~120 perguntas; o teste `referencias` avisa se alguma mudar. Para fixar um novo comportamento de propósito: `python tests/capturar_referencias.py`.
- No GitHub: correm sozinhos a cada envio (separador **Actions**). Visto verde = tudo bem; cruz vermelha = algo falhou (o GitHub envia um email).
