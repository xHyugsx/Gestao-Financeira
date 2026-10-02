# CLAUDE.md — App «Finanças»

Este ficheiro é lido automaticamente pelo Claude Code no início de cada sessão.
Contém o contexto do projeto e as regras de trabalho acordadas com o dono da app.

---

## 1. O projeto

- **O quê:** app web instalável (PWA) de finanças familiares, publicada no **GitHub Pages** a partir da raiz deste repositório.
- **Utilizadores:** uma família (duas pessoas adultas e dois animais de estimação). Uso diário no **telemóvel Android**, em modo instalado.
- **Dados:** 100% locais, no `localStorage` do navegador. **Não há servidor.** A cópia de segurança é um ficheiro JSON exportado pelo utilizador.
- **Versão atual:** ver `app/versao.json`.

### Funcionalidades principais
- Página principal com **Rendimento mensal em destaque** (círculo animado) e caixas das contas (Principal, Revolut Conjunta, Edenred…).
- Movimentos (despesas, receitas, transferências), categorias, notas por movimento, filtro por conta, pesquisa.
- Páginas: Principal, Análise, Calendário, Categorias, Resumo, Combustível, Veterinário.
  - Barra inferior: Principal · Análise · [+] · Calendário · **Mais** (painel com Categorias, Resumo, Combustível, Veterinário).
  - Ordem ao deslizar: Principal → Análise → Calendário → Categorias → Resumo → Combustível → Veterinário.
- **Ecrã de bloqueio**: imagem animada, gesto de deslizar para cima, teclado de PIN, **impressão digital (WebAuthn)**, bloqueio automático ao voltar à app, imagem desfocada no gestor de apps.
- **Jarvis** (assistente por regras, sem IA externa): perguntas por mês, loja, categoria, comparações, médias, consultas de movimentos, edição de movimentos com confirmação, lembretes veterinários, notas, tolerância a erros de escrita, sugestões por página, botões Confirmar/Cancelar.
- **Leitura de recibos de vencimento (PDF)** e **importação de extratos bancários** (XLSX/XLS/CSV) com revisão antes de gravar, deteção de duplicados, regras memorizadas e "desfazer importação".
- **Lembretes veterinários**, lembrete de backup, indicador de espaço de armazenamento e aviso de gravação falhada.
- Aviso **"Nova versão disponível"** com botões Ignorar/Atualizar.

---

## 2. Estrutura e arquitetura atual

Desde a **troca (etapa 13, v2.02.0)** a app publicada na raiz é a **app nova** (React + Vite + TypeScript, código em `app/`).

| Caminho | Conteúdo |
|---|---|
| `app/src/` | Código da app (TypeScript/React), por áreas: `dados/`, `movimentos/`, `paginas/`, `definicoes/`, `importacao/`, `jarvis/`, `veterinario/`, `bloqueio/`, `layout/`, `ui/` |
| `app/versao.json` | **Versão da app** (única fonte; o `version.json` publicado é gerado a partir dela) |
| `app/service-worker.js` | Cache offline e atualizações (limpa os ficheiros de versões anteriores) |
| `css/app.css`, `img/`, `fonts/`, `icons/`, `vendor/` | Estilos e recursos usados pela app (o Vite junta-os no build) |
| `scripts/montar-site.mjs` | Monta `_site/`: raiz = app, `/v1/` = app anterior (recuo), `/v2/` = versão de teste |
| `index.html`, `js/`, `service-worker.js`, `version.json`, `manifest.webmanifest` (raiz do repositório) | **App anterior 1.9.x**, publicada só em `/v1/` para recuo (sai na etapa 14) |

- **Recuo:** `/v1/` abre a app 1.9.x com os **mesmos dados** (mesmas chaves), com cache própria (`financas-v1`). Se for usada, os campos novos que ela não conhece no nível de topo (`categoryColors`, `importConfig`) perdem-se ao gravar.
- `/v2/` continua a existir como versão de teste isolada (prefixo `financas-v2:`), que **nunca** pode ler/escrever as chaves `financas-familiar:*` exceto pelo menu "Copiar dados" (só leitura).
- Plano e estado de cada etapa: `docs/PLANO-FASE-2.md`.
- Testes: `python tests/correr.py` (raiz = app de produção) e `FF_URL=v2/ FF_PREFIX=financas-v2: python tests/correr.py` (`/v2/`). `tests/teste_visual.py` compara o HTML da app anterior (`/v1/`) com o da raiz; `tests/teste_troca.py` simula um telemóvel com a 1.9.x a atualizar para a app nova.
- Núcleo de dados em `app/src/dados/`: `npm ci && npm run verificar` (tipos + testes unitários). Diferenças intencionais face à 1.9.x em `docs/PLANO-FASE-2.md` §4.1, §4.2 e §7.

---

## 3. Regras críticas — dados do utilizador (NÃO QUEBRAR)

Qualquer alteração deve manter **compatibilidade total** com os dados já guardados nos telemóveis.

**Chaves do `localStorage` (não renomear nem mudar o formato):**

| Chave | Conteúdo |
|---|---|
| `financas-familiar:v3` | Dados principais: `transactions`, `accounts`, `salaries`, `categories`, `incomeCategories`, `petPhotos`, `profile` (com `pets`), `appearance`, `pinHash`, `importConfig`, `categoryColors`, … |
| `financas-familiar:jarvis-threads:v2` | Conversa do Jarvis |
| `financas-familiar:last-backup` | Data do último backup |
| `financas-familiar:backup-snooze` | Adiamento do lembrete de backup |
| `financas-familiar:vet-reminders` / `:vet-snooze` | Lembretes veterinários |
| `financas-familiar:bio` / `:bio-offer` | Registo da impressão digital (ligado ao `pinHash`) |
| `financas-familiar:autolock` | Bloqueio automático |
| `financas-familiar:import-rules` / `:last-import` | Regras e "desfazer" da importação de extratos |
| `financas-familiar:storage-warn` | Aviso diário de espaço |

- **PIN:** `pinHash = SHA-256("financas-familiar:" + PIN)` em hexadecimal. O registo da impressão digital guarda este hash; se o formato mudar, a impressão digital deixa de funcionar e o utilizador pode ficar sem acesso.
- **Movimentos:** campos `id, title, detail ("dia mês · Categoria"), amount (negativo = despesa), date (AAAA-MM-DD), movementType (expense|income|transfer), account?, recurring?, note?, pet?, affectsBalance?, importKey?, importBatch?`.
- **Backup/restauro:** o JSON exportado tem de continuar a ser restaurável, incluindo `vetReminders` e `jarvisThreads`.
- **Rendimento do mês X = salários do mês X−1** (regra de negócio já em uso).
- **Saldo das contas:** saldo guardado + movimentos com efeito no saldo; movimentos importados de extratos têm `affectsBalance:false`. O saldo da Edenred **transita** de mês para mês (nunca volta a zero).

---

## 4. Regras de trabalho com o dono da app

- **Língua:** responder sempre em **português de Portugal**, de forma direta, concisa e estruturada (cabeçalhos, listas curtas, negrito nos termos-chave). Sem introduções artificiais.
- **Uma alínea de cada vez:** cada pedido é tratado como uma alínea individual.
- **Sem preview (decisão do dono, 30/09/2026):** nas etapas da Fase 2, implementar, testar e **fazer o merge do PR** quando os testes do GitHub ficarem verdes, sem esperar aprovação. Exceção: a **troca** (etapa 13), que mexe na app de produção e nos dados reais, é confirmada antes com o dono.
- **Parceiro crítico:** se houver uma alternativa melhor ou um risco, dizê-lo antes de avançar.
- **Versões:** formato `v#.##.#`. Em cada entrega:
  1. atualizar `versao` em `app/versao.json` (o `version.json` publicado e a lista de ficheiros offline são gerados pelo `montar-site.mjs`);
  2. indicar **a lista exata de ficheiros alterados** para publicar.
- **Publicação:** o dono publica pelo GitHub (muitas vezes a partir do telemóvel). O aviso "Nova versão disponível" depende da versão em `app/versao.json`; sem a atualizar, os telemóveis não recebem a versão nova.
- **Testar sempre** antes de entregar (ver secção 6) e reportar os resultados em tabela.

---

## 5. Decisões já tomadas (não reverter sem pedir)

- Ícone da app e do Jarvis: robô; botão "+" e anel do Rendimento com gradiente ciano → roxo → rosa.
- Limpar a conversa do Jarvis **não** pede confirmação.
- Sugestões de ação do Jarvis (ex.: "Adicionar despesa…") **preenchem a caixa de texto**, não enviam.
- Ações do Jarvis que alteram dados (apagar, editar, registar, marcar como feito) **pedem sempre confirmação** com botões.
- Recibos de vencimento: ler o valor da linha que contém "Ticket Refeição" **e** um valor com "€".
- Importação de extratos: regras gerais de categorias em `app/src/importacao/classificacao.ts`; regras pessoais (salários, transferências a confirmar, movimentos ignorados, investimentos recorrentes) em **Definições › Importação**, guardadas no telemóvel (`importConfig`), nunca no código.
- Animais da família: vêm do perfil (`profile.pets`, Definições › Perfil e família); sem perfil, são deduzidos dos dados. Nunca escrever nomes de pessoas ou animais no código.
- Ideias **descartadas**: aviso de saldo baixo; orçamento por categoria; PIN com hash reforçado (risco para a impressão digital).
- Ideias **em pausa** (personalização): mais temas de cor; imagem do bloqueio à escolha; modo compacto; tipo de letra; animação dos números; o que aparece no círculo em destaque; reordenar caixas das contas; escolher páginas da barra inferior; tom do Jarvis; perguntas favoritas; frequência do lembrete de backup.

---

## 6. Qualidade e testes

- Validar sintaxe de todos os JS alterados (`node --check`).
- Testes de interface com Playwright (pasta `tests/`, quando existir), a correr com um servidor local na raiz do repositório.
- Testar também: funcionamento **offline** (service worker), **atualização** de uma versão para a seguinte e **preservação dos dados** existentes.
- Respeitar `prefers-reduced-motion` em todas as animações.
- Desempenho: animar só `transform` e `opacity`; evitar `backdrop-filter` em elementos permanentes; evitar temporizadores contínuos.

---

## 7. Privacidade

- **Este repositório é público.** Nunca acrescentar dados pessoais: extratos, recibos, backups, capturas de ecrã com valores, IBAN, NIF.
- Os ficheiros de teste devem usar **dados fictícios**.
- A app não tem nomes nem entidades no código: regras pessoais da importação, pessoas (salários/perfil) e animais (perfil) vêm dos dados do telemóvel.
- Ainda com nomes reais (saem na etapa 14, quando a `/v1/` deixar de existir): os dados de teste usados na comparação com a 1.9.x (`tests/capturar_referencias_dados.py`, `tests/dados/dados_versao_antiga.json`, `tests/referencias/dados.json`) e a própria app 1.9.x (`js/`). O **histórico do Git** mantém-nos; apagá-lo exige reescrever o histórico — só com ordem explícita do dono.

---

## 8. Fase 2 — objetivo

Reconstruir a app com **código-fonte legível e organizado**, eliminando os remendos no bundle minificado, **sem mudar o aspeto nem o comportamento** e **mantendo os dados compatíveis** (secção 3).

Abordagem pedida:
1. Propor primeiro um **plano por etapas** (stack, estrutura, ordem de migração, estratégia de testes) e aguardar aprovação.
2. Migrar por partes, com os testes a passar em cada etapa.
3. Manter a publicação no GitHub Pages (se for preciso um passo de compilação, usar GitHub Actions).
