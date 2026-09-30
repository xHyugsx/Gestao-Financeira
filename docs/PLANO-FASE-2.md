# Plano — Fase 2 da app «Finanças»

> Estado: **aprovado**. Etapa 0 **concluída** (v1.9.3). Etapa 1 **concluída** (`/v2/` 2.00.1, 44/44 na raiz e na `/v2/`). Etapa 2 **concluída** (núcleo de dados em `app/src/dados`, 53 testes unitários). Etapa 3 **concluída** (`/v2/` 2.00.2 = app nova: Principal, navegação e bloqueio). Etapa 4 **concluída** (`/v2/` 2.00.3: registar, editar e eliminar movimentos). Etapa 5 **concluída** (`/v2/` 2.00.4: bloqueio, impressão digital, bloqueio automático e privacidade reescritos em `app/src/bloqueio/`; 2.00.5 mostra a versão no menu «V2 · teste»). Etapa 6 **concluída** (`/v2/` 2.00.6: Definições › Segurança, antecipada; as etapas seguintes passaram uma posição abaixo). Etapa 7 **concluída** (`/v2/` 2.00.7: Análise, Calendário, Categorias, Resumo e botão "voltar" nas páginas). Etapa 8 **concluída** (`/v2/` 2.00.8: Combustível, Veterinário e lembretes veterinários). **Correções pedidas pelo dono** (`/v2/` 2.00.9, só na app nova — ver §4.2). Etapa 9 **concluída** (`/v2/` 2.01.0: restantes Definições, backup/restauro/CSV, espaço, lembrete de backup, saldo corrigido só a partir do dia).
> Base de referência: versão **1.9.2**, **36/36 testes a passar** (medido a 28-09-2026).

---

## 1. Diagnóstico

### 1.1 `js/app.js` (473 KB, minificado)

Bundle Vite/Rollup de uma app originalmente feita com **TanStack Start** (há vestígios: `createFileRoute` e `createServerFn` substituídos por funções vazias; o Jarvis original era um serviço online — hoje responde `"O Jarvis precisa da versão online da app"` nesse caminho morto).

| Bloco (posição aprox.) | Conteúdo |
|---|---|
| 0 – 190 KB | **React 19.2.8** + React DOM + scheduler |
| 190 – 250 KB | **lucide-react** (ícones, com ícones extra acrescentados: `ffBaby`, …), `clsx`/**tailwind-merge** (padrão shadcn/ui) |
| 250 – 285 KB | **Radix UI** (Dialog, foco, `DismissableLayer`, bloqueio de scroll) |
| 285 – 334 KB | **Zod** (validação dos formulários) |
| 334 – 357 KB | Sub-vistas das Definições, leitura/gravação do `localStorage` (`rc()` lê `financas-familiar:v3`, `ic()` grava e chama `ffSaveOk`/`ffSaveFail`), conversa do Jarvis |
| 357 – 473 KB | **Um único componente gigante** (`xc`, ~115 KB): 62 `useState`, 11 `useEffect`, todas as páginas, diálogos, Jarvis por regras (datas, lojas, categorias, confirmações), leitura de recibos PDF (pdf.js por CDN), PIN (`Rn()` = SHA-256), saldos, rendimento, swipe entre páginas |

Remendos identificados: ~190 identificadores `ff*` injetados (`ffNow`, `ffSub`, `ffInc`, `ffPet`, `ffJm`, `ffAccTx`, …), com nomes minificados partilhados entre âmbitos (`p`, `f`, `Bn`, `vt`…). É isto que torna cada alteração arriscada.

### 1.2 `js/modulos/` (JavaScript simples, ~65 KB)

Carregados por `<script>` **antes** do núcleo (exceto `atualizacoes.js`, no fim do `<body>`). Injetam HTML diretamente no DOM e falam com o núcleo por globais.

| Módulo | Função | Expõe | Consome |
|---|---|---|---|
| `bloqueio.js` | Ecrã de bloqueio, PIN, WebAuthn | `ffBio`, `ffBioSettings`, `ffLockMount` | `ffPrivacyOff`, `ffRelockPending` |
| `autobloqueio.js` | Bloquear ao voltar | `ffAutoLockSettings`, `ffRelockPending` | `ffRelock`, `ffPrivacyOff` |
| `privacidade.js` | Imagem desfocada no gestor de apps | `ffPrivacyOff` | `ffRelockPending` |
| `veterinario.js` | Lembretes veterinários | `ffVet` | `ffGoPg` |
| `extratos.js` | Importação XLSX/XLS/CSV (SheetJS por CDN) | `ffStmt` | `ffImpApi` |
| `armazenamento.js` | Indicador de espaço, falha de gravação | `ffStorage`, `ffSaveFail`, `ffSaveOk` | `ffBk`, `ffOpenBackup` |
| `lembrete-backup.js` | Lembrete de backup | — | `ffBk`, `ffVet` |
| `jarvis-sugestoes.js` | Sugestões por página | `ffJvS` | — |
| `jarvis-correcao.js` | Correção de erros de escrita | `ffFix` | — |
| `animacoes.js` | Fecho animado das Definições | `ffSheetOut` | — |
| `atualizacoes.js` | Regista o SW e mostra "Nova versão" | — | cache `financas-app` |

**O núcleo expõe** para os módulos: `ffBk` (backup), `ffImpApi` (gravar importação), `ffRelock`, `ffGoPg`, `ffOpenBackup`, `ffVocab`, `ffJvChips`, `ffJvClose`, `ffMoreClose`.

```
            ┌──────────── window.ff* (≈23 globais) ────────────┐
 módulos ──►│ ffSaveOk/Fail  ffVet  ffStmt  ffFix  ffJvS  ffBio │◄── núcleo (xc)
 núcleo  ──►│ ffBk  ffImpApi  ffRelock  ffGoPg  ffOpenBackup    │◄── módulos
            └───────────────────────────────────────────────────┘
      ordem de carregamento é implícita; qualquer erro num lado parte o outro
```

### 1.3 Outros achados (importantes)

| # | Achado | Impacto |
|---|---|---|
| A1 | A pasta do CI chama-se **`.github/wrokflows/`** (gralha) | **Os testes não correm no GitHub**, ao contrário do que diz o README |
| A2 | `service-worker.js` (raiz) responde a **qualquer navegação** dentro do seu âmbito com o `index.html` da raiz | Abrir `/v2/` num telemóvel com a app atual instalada mostraria a **app antiga** — tem de ser corrigido antes de existir `/v2/` |
| A3 | O SW, ao ativar, **apaga todas as caches** que não se chamem `financas-app` | Apagaria a cache offline da `/v2/` a cada atualização |
| A4 | SheetJS e pdf.js vêm de **cdnjs** e não entram na cache offline | Importar extratos e ler recibos não funciona sem rede |
| A5 | `ffVer` existe em 2 sítios do bundle + `version.json` + README | Versão manual em 3–4 locais; lista `files` também manual |
| A6 | Nomes de pessoas, entidades patronais e dos animais estão no código (`extratos.js`, `app.js`, `veterinario.js`) | Repositório público (ver secção 7) |
| A7 | `localStorage` é partilhado por **toda a origem** `xhyugsx.github.io` (todos os repositórios Pages do mesmo utilizador) | Justifica prefixo separado na `/v2/` |
| A8 | `css/app.css` = Tailwind 4.3.3 compilado + 20 secções `ff-*` | Pode ser reaproveitado tal como está (garante aspeto igual) |
| A9 | O Jarvis **grava logo** «Adiciona despesa/receita de …» (oferece «desfazer»), sem os botões Confirmar/Cancelar | Contradiz a decisão do CLAUDE.md («registar pede sempre confirmação»). A v2 reproduz o comportamento atual até o dono decidir |
| A10 | Várias perguntas do Jarvis caem numa resposta genérica (ex.: «este ano», «esta semana», «entre 1 e 15 de agosto», «acima de 100 €» respondem com o mês atual) | Ficam gravadas tal como estão na referência; melhorias só depois da troca, uma a uma |
| A11 | Ao gravar, a 1.9.x guarda só os campos que conhece: qualquer campo extra em `financas-familiar:v3` desaparece. Também o rendimento lê só dois nomes fixos da tabela de salários (e falharia com outro) | O núcleo novo **preserva** campos desconhecidos (topo, movimentos, contas) e soma todas as pessoas da tabela; ver as diferenças intencionais abaixo (secção 4.1) |
| A12 | «Novo movimento › Transferência»: os campos **Conta de origem** e **Conta de destino** aparecem mas **não são gravados** (a transferência não mexe em nenhum saldo, salvo com «Transferência para Revolut») | Copiado tal como está na V2; decidir depois da troca |
| A13 | «Transferência para Revolut» pode ser marcada com qualquer tipo (até numa despesa) e transforma o movimento em transferência | Copiado tal como está; decidir depois da troca |

---

## 2. Proposta de stack

### Opção A — Módulos JavaScript sem compilação (Preact + `htm`, ficheiros locais)

| Prós | Contras |
|---|---|
| Edita-se um ficheiro no telemóvel e fica publicado | Sem Radix: diálogos, foco e scroll reescritos à mão → **risco de diferenças de comportamento** |
| Sem dependência do GitHub Actions para publicar | Sem JSX nem tipos: erros só aparecem em execução |
| O que está no repositório é o que corre | Versão e lista `files` continuam **manuais** (causa atual de esquecimentos) |
| | Sem nomes com hash → problemas de cache mais prováveis |

### Opção B — React 19 + Vite + TypeScript, compilado por GitHub Actions ⭐ recomendada

| Prós | Contras |
|---|---|
| **Mesmas bibliotecas** do bundle atual (React 19, Radix Dialog, lucide-react, Zod) → aspeto e comportamento iguais com menos esforço | Precisa de um passo de compilação (Actions, ~3–5 min por publicação) |
| Reaproveita o `app.css` e os nomes de classes atuais | Editar no telemóvel continua possível, mas o resultado só aparece depois do Actions |
| TypeScript protege o **formato dos dados** (secção 3 do CLAUDE.md) | Mudança única nas definições: *Settings › Pages › Source: GitHub Actions* |
| **Versão num só sítio** (`package.json`) → `ffVer` e `version.json` (incluindo `files`) gerados automaticamente | Mais ficheiros de configuração no repositório |
| **Testes a travar a publicação**: se falharem, a versão antiga continua no ar | |
| Publicar = aprovar/fundir um PR a partir da app do GitHub (sem carregar ficheiros um a um) | |

### Opção C — Híbrida (módulos sem compilação + `// @ts-check` validado no CI)

Meio-termo: mantém a edição direta, ganha alguma verificação de tipos. Tem os mesmos contras de comportamento da Opção A (sem Radix) e a versão continua manual.

### Recomendação

**Opção B.** O objetivo principal é "sem mudar aspeto nem comportamento", e isso é muito mais seguro com as mesmas bibliotecas. O argumento "publico do telemóvel" até melhora: em vez de carregar 3–5 ficheiros e lembrar-se do `version.json`, passa a ser **um botão "Merge"** no PR, e o Actions trata do resto.

⚠️ **Parceiro crítico:** com a Opção B, a regra "dar a lista exata de ficheiros alterados para publicar" passa a ser "lista de ficheiros alterados no PR" — já não é preciso copiar ficheiros à mão. Proponho atualizar o CLAUDE.md nessa altura (etapa 13).

---

## 3. Estrutura de pastas final

```
/
├── app/                        ← código-fonte da app (raiz do Vite)
│   ├── index.html
│   ├── public/                 ← copiado tal como está
│   │   ├── img/  fonts/  icons/
│   │   └── manifest.webmanifest
│   └── src/
│       ├── main.tsx            ← arranque, registo do SW
│       ├── config.ts           ← prefixo de armazenamento, versão, base URL
│       ├── dados/              ← NÚCLEO DE DADOS (sem UI)
│       │   ├── chaves.ts       ← todas as chaves `financas-familiar:*`
│       │   ├── armazenamento.ts← ler/gravar, aviso de falha, medição de espaço
│       │   ├── esquema.ts      ← tipos + Zod tolerante (preserva campos desconhecidos)
│       │   ├── backup.ts       ← exportar/restaurar (inclui vetReminders, jarvisThreads)
│       │   ├── saldos.ts       ← saldo guardado + movimentos; Edenred transita
│       │   ├── rendimento.ts   ← rendimento do mês X = salários de X−1
│       │   └── datas.ts
│       ├── estado/             ← store React (contexto + reducer) sobre `dados/`
│       ├── ui/                 ← Dialog, Button, Sheet… (Radix, iguais aos atuais)
│       ├── layout/             ← App, cabeçalho, barra inferior, painel «Mais», swipe
│       ├── paginas/            ← Principal, Analise, Calendario, Categorias,
│       │                          Resumo, Combustivel, Veterinario
│       ├── movimentos/         ← diálogo, lista, filtro, pesquisa, notas
│       ├── definicoes/         ← perfil, aparência, backup, armazenamento, PIN
│       ├── bloqueio/           ← EcraBloqueio, pin.ts, biometria.ts,
│       │                          autobloqueio.ts, privacidade.ts
│       ├── jarvis/
│       │   ├── motor/          ← intenções, datas, lojas, comparações (funções puras)
│       │   ├── correcao.ts  sugestoes.ts  acoes.ts (com confirmação)
│       │   └── Jarvis.tsx
│       ├── importacao/
│       │   ├── leitores/       ← csv, xlsx, pdf (recibos)
│       │   ├── regras-gerais.ts← só regras genéricas (lojas → categorias)
│       │   ├── regras-pessoais.ts ← lê a configuração do telemóvel
│       │   └── Revisao.tsx
│       ├── veterinario/  lembrete-backup/  atualizacoes/
│       ├── sw/service-worker.ts
│       └── estilos/            ← app.css dividido pelas secções atuais
├── vendor/                     ← SheetJS e pdf.js locais (funcionam offline)
├── tests/
│   ├── correr.py  teste_*.py   ← 36 testes atuais (parametrizados)
│   ├── visual/                 ← capturas de referência (dados fictícios)
│   ├── unit/                   ← Vitest: dados, saldos, motor do Jarvis, importação
│   └── dados/                  ← apenas dados fictícios
├── legado/                     ← (temporário) app 1.9.x, servida em /v1/ para recuo
├── docs/                       ← este plano, decisões, notas de migração
├── .github/workflows/          ← testes + compilação + publicação
├── package.json  vite.config.ts  tsconfig.json
└── CLAUDE.md  README.md
```

---

## 4. Ordem de migração

Princípio: **a produção (raiz) só muda nas etapas 0 e 13.** Todas as outras publicam apenas em `/v2/`, isolada dos dados reais.

| # | Etapa | Onde publica | O que se testa no telemóvel | Testes atuais no ar |
|---|---|---|---|---|
| **0** | **Preparação segura** — corrigir `wrokflows` → `workflows`; SW da raiz ignora `/v2/` e `/v1/` (A2) e só apaga as suas caches (A3); parametrizar `correr.py` (URL e prefixo); gravar as **respostas de referência do Jarvis** da 1.9.x ✅ | **Raiz** (v1.9.3) | App igual; aparece "Nova versão" e atualiza normalmente | 39/39 raiz |
| **1** | **Publicação pelo Actions + `/v2/` espelho** ✅ — `scripts/montar-site.mjs` monta `_site/` (raiz = ficheiros atuais sem alterações; `/v2/` = cópia adaptada); Actions: testes (raiz e `/v2/`) → publica. A `/v2/` arranca **a app atual** com os dados isolados (`espelho-v2/prefixo.js` traduz `financas-familiar:*` → `financas-v2:*` em tempo de execução, sem mexer no código minificado), manifesto próprio («Finanças V2»), SW e cache próprios, SheetJS e pdf.js locais (`vendor/`), faixa "V2 · teste" com **"Copiar dados da versão atual"** e **"Apagar dados da V2"**. O projeto Vite passa para a etapa 2 (só é preciso quando houver código novo para compilar) | `/v2/` | Instalar «Finanças V2» ao lado da atual; copiar dados; confirmar que a app real não mudou | 44/44 raiz · 44/44 v2 |
| **2** | **Núcleo de dados** ✅ (`app/src/dados/`) em TypeScript + testes unitários com o ficheiro `dados_versao_antiga.json` e dados fictícios grandes; **arranque do projeto Vite + TypeScript + Vitest em `app/`** | `/v2/` (sem mudança visível) | — (só testes automáticos) | 36/36 raiz · 36/36 v2 |
| **3** | **Esqueleto React** ✅ — layout, barra inferior, painel «Mais», swipe e ordem das páginas, página **Principal** (anel do rendimento, caixas das contas, lista) | `/v2/` passa a ser a app nova | Aspeto da Principal, navegação, swipe | 36/36 raiz · grupo `arranque` na v2 |
| **4** | **Movimentos** ✅ — criar/editar/apagar, transferências, notas, filtro por conta, pesquisa, saldos | `/v2/` | Registar movimentos reais de teste | + `movimentos` |
| **5** | **Bloqueio** ✅ — PIN (mesmo hash), impressão digital (mesmo registo e mesmos parâmetros WebAuthn), autobloqueio, privacidade; as opções das Definições (ligar/desligar digital, tempo do autobloqueio) passaram para a etapa 6 | `/v2/` | Deslizar, PIN, digital, voltar à app | + `bloqueio` + `biometria` (sensor simulado; registo da app atual abre a nova) |
| **6** | **Definições › Segurança** ✅ *(antecipada a pedido do dono, para se poder definir o PIN na V2)* — menu rápido da roda dentada, lista das Definições (restantes secções "Em construção"), PIN (ativar, alterar, remover — mesmo hash), impressão digital (ligar/desligar), ocultar valores ao sair, bloqueio ao voltar | `/v2/` | Definir o PIN na V2; testar bloqueio, digital e bloqueio ao voltar | + `definicoes` (HTML igual ao da app atual) |
| **7** | **Análise, Calendário, Categorias, Resumo** ✅ — e o botão "voltar" do telemóvel nas páginas | `/v2/` | Comparar lado a lado com a app atual | + `calendario` + `paginas` (HTML igual ao da app atual em 26 estados) |
| **8** | **Combustível e Veterinário** (+ lembretes) ✅ — páginas, janelas do "+", fotografias dos animais, lembretes (lista, criar/editar, "Feito", ponto no «Mais», aviso ao abrir) | `/v2/` | Lembretes, "feito" | + `veterinario` + `combustivel_vet` (HTML igual em 17 estados) |
| **9** | **Restantes Definições** ✅ — perfil, categorias, contas, aparência, backup/restauro/CSV, dados, espaço, lembrete de backup; **saldo editado com efeito só a partir do dia da alteração** (pedido do dono, §4.2). Os recibos em PDF são lidos pelo Jarvis (anexar ficheiro) e passam para a etapa 11 | `/v2/` | Exportar backup e restaurar na V2 | + `compatibilidade` |
| **10** | **Importação de extratos** + **regras pessoais no telemóvel** (secção 7) | `/v2/` | Importar um extrato real na V2 | + `extratos` |
| **11** | **Jarvis** — motor por regras + interface + ações com confirmação + **leitura de recibos PDF** (anexo) | `/v2/` | Perguntas do dia a dia | + `jarvis` |
| **12** | **Offline e atualizações** — SW gerado com lista de ficheiros automática, aviso "Nova versão" | `/v2/` | Modo avião; publicar 2 versões seguidas | 36/36 v2 |
| **13** | **Troca** — build nova passa para a raiz com o prefixo real `financas-familiar:`; app 1.9.x fica em `/v1/` para recuo | **Raiz** (v2.x — ver secção 9) | Backup obrigatório antes; atualizar; confirmar dados, PIN e digital | 36/36 raiz |
| **14** | **Limpeza** — remover `legado/`/`/v1/` após 2–4 semanas sem problemas; atualizar CLAUDE.md e README | Raiz | — | 36/36 |

Notas:
- As etapas 3–11 podem ter subetapas (ex.: 7a Análise, 7b Calendário) se ficarem grandes. **Uma etapa por vez, com preview antes.**
- Enquanto uma página ainda não estiver migrada, a `/v2/` mostra "Em construção" nesse separador.
- **Nomes dos animais** (Sam, Lola): a app atual tem-nos fixos no código; na nova ficam num só sítio (`app/src/veterinario/animais.ts`) até passarem para a configuração guardada no telemóvel na etapa 10, com as regras pessoais da importação (secção 7).
- O botão "voltar" do telemóvel numa página que não seja a Principal volta à Principal (`history.pushState` com `financeTab`), como na app atual: feito na etapa 7.

---

### 4.0 Como ficou a etapa 3

- `/v2/` passou a ser **a app nova** (opção A): React 19 + Vite, compilada de `app/` por `scripts/montar-site.mjs`.
- Já feito na app nova: Principal (anel do rendimento, contas, tendências, transações recentes, "Ver todas" com pesquisa e filtro por conta), cabeçalho com céu/saudação, seletor do mês, animação dos números, deslizar entre páginas, barra inferior e painel «Mais», ocultar valores (incluindo ao sair da app).
- **Bloqueio mantido** reaproveitando `js/modulos/bloqueio.js`, `autobloqueio.js` e `privacidade.js` (a V2 tem uma cópia do `pinHash`; sem isto abriria sem PIN). Reescritos na etapa 5 (`app/src/bloqueio/`).
- Ícones extraídos do núcleo atual (`scripts/extrair-icones.mjs` → `app/src/ui/icones.ts`) para ficarem iguais ao pixel.
- Testes da `/v2/`: só correm os listados em `tests/v2_ativos.txt`; os restantes aparecem como **pendente** (nunca como aprovados). `tests/teste_visual.py` compara o HTML e a imagem da Principal entre a raiz e a `/v2/` em vários estados.
- Por fazer na app nova (avisos "em construção"): restantes páginas, "+", editar movimentos, Jarvis, Definições.

### 4.1 Diferenças intencionais do núcleo novo face à 1.9.x (etapa 2)

Todas invisíveis no uso normal e mais seguras para os dados; os testes de equivalência (`app/src/dados/referencias.test.ts`) aplicam-nas explicitamente.

| Diferença | Porquê |
|---|---|
| Campos desconhecidos são preservados ao gravar e no backup | A 1.9.x apagava-os; preservar nunca perde dados e a 1.9.x ignora-os ao ler |
| Perfil de uma instalação nova vem vazio (a 1.9.x traz nomes da família fixos) | Privacidade (repositório público); só afeta telemóveis sem dados |
| Rendimento soma todas as pessoas da tabela de salários | A 1.9.x lê dois nomes fixos e falharia com outros; resultado igual com os dados atuais |
| Restauro de backup dá data aos movimentos que não a têm | A 1.9.x só o fazia ao reabrir a app; evita erros até lá |
| Titulares da Revolut no «Novo movimento» vêm do perfil («Conjunta» + membros) | A 1.9.x tem nomes da família fixos no código (privacidade); com o perfil atual a lista é a mesma |
| Colunas da tabela de salários (Resumo › Salários) vêm das pessoas já gravadas nos salários; sem nenhuma, dos membros do perfil | A 1.9.x tem dois nomes fixos no código (privacidade); com os dados atuais as colunas são as mesmas |

### 4.2 Correções pedidas pelo dono (só na app nova, 2.00.9)

Diferenças intencionais face à 1.9.x. As comparações de HTML apagam-nas antes de comparar (`intencionais()` em `tests/teste_visual.py`) e usam dados já pela ordem nova (`preparar()`); cada uma tem testes de funcionamento em `tests/teste_correcoes.py` (só na `/v2/`).

| Correção | Como ficou | Dados |
|---|---|---|
| «Recorrente mensal» → «Recorrente» com periodicidade | Mensal, Bimestral, Trimestral, Anual; a app **cria sozinha** a cópia seguinte quando chega a data (e as que faltarem). Parar: apagar a última ou desmarcar «Recorrente» ao editar. Recorrentes antigos (sem periodicidade) não geram cópias até se escolher uma | Campos novos no movimento: `recurringEvery` (meses), `recurringDone` |
| Categorias por ordem alfabética | Listas de escolha (novo movimento, atalhos, editar movimento). A página Categorias continua por gasto | — |
| Cor ao acaso e nunca repetida para categorias novas | 16 cores (8 novas); escolhe uma que nenhuma categoria usa; esgotadas, a menos usada | Campo novo `categoryColors` |
| «Poupança Conjunta» na transferência para a Revolut | Destino próprio; sai da Principal mas **não soma** ao saldo da Revolut Conjunta | `revolut.holder = "Poupança Conjunta"` |
| Categoria no «Editar movimento» | Lista de escolha com as categorias do tipo do movimento (mais a atual), por ordem alfabética | — |
| «Transações recentes» | Da mais recente para a mais antiga (no mesmo dia, a última registada primeiro) | — |
| Mudar o nome de uma categoria | Na página Categorias, o ícone abre «Editar categoria» (nome e ícone); o nome muda nos movimentos, no ícone e na cor | — |
| Saldo editado só a partir do dia (etapa 9) | Em Definições › Contas, o campo «Saldo» mostra o saldo de hoje; o valor escrito passa a ser o saldo a partir de hoje e os dias anteriores ficam com o valor antigo. Na Principal, nos meses anteriores, os cartões das contas mostram o saldo no fim desse mês (a 1.9.x mostrava sempre o de hoje) | Campo novo `adjDays` na conta (AAAA-MM-DD → acerto); o antigo `adj` (por mês) continua a ser lido |

⚠️ **Duplicados com a importação:** uma cópia automática de um recorrente e a mesma linha num extrato importado podem aparecer duas vezes; a etapa 10 acrescenta essa deteção.

## 5. Estratégia de testes

### 5.1 Os 36 testes atuais

- **Na raiz (produção): 36/36 em todas as etapas**, sempre, porque a produção só muda nas etapas 0 e 13.
- **Na `/v2/`**: o `correr.py` passa a aceitar `FF_URL` e `FF_PREFIX`; o CI corre os 36 contra a raiz **e** contra a `/v2/`. A partir da etapa 3, cada grupo é ativado na `/v2/` quando a respetiva parte é migrada (tabela da secção 4). **Condição para a troca (etapa 12): 36/36 na `/v2/`.**
- ⚠️ **Honestidade:** entre as etapas 3 e 11 a `/v2/` não passa os 36 (as páginas ainda não existem). A alternativa — manter a app antiga "dentro" da nova — obrigaria a continuar a remendar o bundle, que é precisamente o que queremos eliminar.
- Dois testes dependem do ficheiro `js/app.js` (`versao_igual…`, `todos_os_ficheiros…`). Com a build, os nomes levam hash; adapto-os para ler a versão da build **mantendo a mesma intenção**. Mostro a diferença antes.

### 5.2 Testes novos

| Tipo | Testes | Porquê |
|---|---|---|
| **Visual** (Playwright, capturas) | Cada página, ecrã de bloqueio, diálogos, painel «Mais», Jarvis — comparação **ao vivo** entre a raiz (1.9.x) e a `/v2/` na mesma execução, tolerância pequena (sem imagens guardadas → sem falsos alarmes por versões do navegador) | Garantir "aspeto igual" |
| **Respostas do Jarvis** ("golden master") ✅ | 118 conversas (126 perguntas) com dados fictícios, gravadas da 1.9.3 em `tests/referencias/jarvis.json` (`tests/capturar_referencias.py`); `teste_referencias.py` compara | O Jarvis é a parte com mais regras escondidas |
| **Compatibilidade de dados** | Abrir dados antigos → usar → exportar: campos desconhecidos preservados; backup da v2 restaura na 1.9.x e vice-versa | Secção 3 do CLAUDE.md |
| **Isolamento da `/v2/`** | Espiar o `localStorage`: a v2 **nunca escreve** em `financas-familiar:*` | Proteger os dados reais |
| **PIN** | PIN fictício → hash conhecido (valor fixo no teste). O sal `financas-familiar:` **não depende do prefixo de armazenamento** (também na `/v2/`) | O formato não pode mudar |
| **Impressão digital** | Autenticador WebAuthn **virtual** do Chromium: registar, desbloquear, invalidar ao mudar o PIN | Evitar ficar sem acesso |
| **Atualização** | Servir 1.9.x, instalar SW, trocar para a v2, carregar "Atualizar" → dados, PIN e digital intactos | Etapa 13 |
| **Offline** | Importar extrato e ler recibo em modo avião (bibliotecas locais) | Achado A4 |
| **Acessibilidade de movimento** | Com `prefers-reduced-motion`, sem animações | Regra do CLAUDE.md |
| **Unitários** (Vitest) | Saldos (Edenred transita), rendimento X−1, datas, leitura CSV/XLSX, classificador, deteção de duplicados, motor do Jarvis | Rápidos, correm em segundos |
| **Privacidade** | Verificação no CI que falha se aparecerem nomes/entidades pessoais (lista guardada como **hashes**, para não revelar os próprios nomes) | Secção 7 |

---

## 6. Como testar cada etapa no telemóvel

| Item | Produção (atual) | Teste |
|---|---|---|
| Endereço | `…github.io/Gestao-Financeira/` | `…github.io/Gestao-Financeira/v2/` |
| Nome instalado | Finanças | **Finanças V2** (ícone com marca "V2") |
| Prefixo do armazenamento | `financas-familiar:` | **`financas-v2:`** |
| Service worker / cache | `service-worker.js` · `financas-app` | `v2/service-worker.js` (âmbito `/v2/`) · `financas-v2` |
| Impressão digital | registo atual | registo próprio (volta a registar na V2) |

Fluxo em cada etapa:
1. Eu mostro a **preview** (descrição + capturas com dados fictícios) e espero pelo "avança".
2. Implemento, corro os testes e abro um **PR**; o CI corre tudo.
3. Faz **Merge** no telemóvel → o Actions publica em `/v2/` (a raiz não muda).
4. Abre «Finanças V2» → "Nova versão disponível" → Atualizar.
5. (Opcional) Definições › **"Copiar dados da versão atual"**: lê as chaves reais **só para leitura** e grava cópias em `financas-v2:*`. Alternativa: restaurar um backup JSON.
6. Aprova ou pede correções. A app real nunca é tocada.

Pré-requisito: a **etapa 0 tem de estar instalada no telemóvel** antes de abrir a `/v2/` (achado A2). A `/v2/` confirma isso ao arrancar e, se detetar o SW antigo, mostra um aviso em vez de arrancar.

---

## 7. Privacidade — regras pessoais da importação

### Situação atual
- `js/modulos/extratos.js` tem regras com **nomes de pessoas** (transferências a confirmar), **entidades patronais** (salário → pessoa), um **empréstimo pessoal ignorado** e **investimentos recorrentes**.
- O núcleo e `veterinario.js` têm os **nomes das pessoas e dos animais** fixos no código (salários por pessoa, fotos, Jarvis).

### Proposta
1. **Nova chave** `financas-familiar:import-config` (acrescentar não quebra nada; nenhuma chave existente muda):
   ```json
   { "v": 1, "regras": [ { "contem": "…", "acao": "salario|transferir|ignorar|investimento", "pessoa": "…", "categorias": ["…"] } ] }
   ```
2. No código ficam **só as regras genéricas** (lojas → categorias, portagens, combustível…).
3. Ecrã **Definições › Importação › Regras pessoais**: listar, acrescentar, editar, apagar.
4. A configuração entra no **backup** e no **restauro** (compatível: backups antigos sem ela continuam a restaurar).
5. **Passagem para o telemóvel sem pôr os nomes no repositório**: a versão da etapa 10 lê as regras que já existem nas "regras memorizadas" (`:import-rules`) e, se a configuração estiver vazia, mostra um assistente curto para as criar (preenchido com sugestões a partir dos últimos movimentos importados, que já estão no telemóvel).
6. Nomes das pessoas e animais: passar a vir do `profile` (já existe nos dados) — mesmo tratamento, na etapa correspondente (4, 7 e 10).

⚠️ **Parceiro crítico:** retirar do código **não apaga o histórico do Git**. Os nomes continuam visíveis em commits antigos. Apagá-los exige reescrever o histórico (`git filter-repo` + *force-push*), o que é irreversível e parte cópias locais. Recomendo decidir isto à parte, depois da etapa 9; não faço nada disso sem ordem explícita. Os ficheiros de teste também têm nomes reais (`tests/dados/dados_versao_antiga.json`, `teste_veterinario.py`, `tests/referencias/jarvis.json`). Como o núcleo tem esses nomes fixos no código, só podem passar a fictícios quando os nomes migrarem para o `profile` (etapas 4, 7 e 10).

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| **Perda de dados na troca** | Produção só muda na etapa 13; `/v2/` usa prefixo separado; teste de isolamento; **backup obrigatório** antes da troca; esquema Zod **tolerante** (nunca apaga campos desconhecidos); nenhuma migração que reescreva `financas-familiar:v3` sem necessidade; recuo possível para `/v1/` |
| **Dados antigos com formatos variados** | Testes com `dados_versao_antiga.json` e dados fictícios grandes; leitura defensiva igual à atual (`rc()` devolve `{}` se falhar) |
| **Espaço de armazenamento** (~5 MB) | Não duplicar dados na mesma chave; a cópia para a V2 avisa se não houver espaço; indicador de espaço mantido |
| **PIN** | Hash **exatamente igual**: `SHA-256("financas-familiar:" + PIN)` em hex; teste com valor fixo; sem "hash reforçado" (decisão já tomada) |
| **Impressão digital** | Mesmo formato em `:bio` (`{id, pin}`) e mesmo hostname (o WebAuthn usa o domínio, não a pasta) → o registo atual continua válido após a troca; teste com autenticador virtual; o PIN continua sempre disponível como alternativa |
| **SW antigo interfere com a `/v2/`** | Etapa 0 corrige a navegação (A2) e a limpeza de caches (A3); a `/v2/` verifica ao arrancar |
| **Atualização 1.9.x → 2.x falha** | O `service-worker.js` mantém o **mesmo caminho e âmbito**; o `version.json` mantém o formato (`version` + `files`), por isso o "Atualizar" da 1.9.x descarrega a v2 corretamente; teste automático de atualização |
| **Telemóvel fica com versão meio atualizada** | O SW só troca quando todos os ficheiros estão em cache; nomes com hash evitam misturar ficheiros de versões diferentes |
| **Build partida publicada** | O Actions só publica se os testes passarem; se falhar, fica no ar a versão anterior |
| **Diferenças visuais subtis** | Mesmo CSS e mesmas classes; testes visuais contra a 1.9.x; comparação lado a lado no telemóvel |
| **Comportamento escondido no bundle** (ex.: regras do Jarvis) | Golden master de respostas; leitura sistemática do bundle por área antes de cada etapa, com notas em `docs/` |
| **CDN indisponível** | SheetJS e pdf.js locais em `vendor/` (etapa 1, na v2) |

---

## 9. Decisões que preciso que confirmes

1. **Stack:** Opção B (React + Vite + TypeScript + Actions)?
2. **Publicação pelo Actions:** mudar *Settings › Pages › Source* para "GitHub Actions" na etapa 1? (Alternativa mais conservadora: o Actions grava a build na pasta `v2/` do próprio repositório, sem mexer nas definições — mais ruído nos commits.)
3. **Versões:** a atual é `1.9.2`, mas o formato combinado é `v#.##.#`. Proponho: produção `1.9.3` (etapa 0); builds de teste `2.00.1 … 2.00.9`, `2.01.0…` na `/v2/`; troca como **`2.10.0`** ou outro número à tua escolha.
4. **Bibliotecas locais** (SheetJS, pdf.js): importar/ler recibos passa a funcionar offline. É uma melhoria de comportamento — aceitas?
5. **Histórico do Git** com nomes: tratar à parte, depois da etapa 9?

**Próximo passo proposto:** preview da **etapa 0** (lista exata de alterações e ficheiros), só depois do teu "avança".
