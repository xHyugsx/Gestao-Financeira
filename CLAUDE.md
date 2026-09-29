# CLAUDE.md — App «Finanças»

Este ficheiro é lido automaticamente pelo Claude Code no início de cada sessão.
Contém o contexto do projeto e as regras de trabalho acordadas com o dono da app.

---

## 1. O projeto

- **O quê:** app web instalável (PWA) de finanças familiares, publicada no **GitHub Pages** a partir da raiz deste repositório.
- **Utilizadores:** uma família (duas pessoas adultas e dois animais de estimação). Uso diário no **telemóvel Android**, em modo instalado.
- **Dados:** 100% locais, no `localStorage` do navegador. **Não há servidor.** A cópia de segurança é um ficheiro JSON exportado pelo utilizador.
- **Versão atual:** ver `version.json` e a constante `ffVer` em `js/app.js`.

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

| Caminho | Conteúdo |
|---|---|
| `index.html` | Página base: carrega o CSS, os módulos e o núcleo |
| `css/app.css` | Todos os estilos (secções marcadas com `/* ===== nome ===== */`) |
| `js/app.js` | **Núcleo React já compilado e minificado** (não existe código-fonte) |
| `js/modulos/*.js` | Funcionalidades acrescentadas em JavaScript simples (ver `README.md`) |
| `img/`, `fonts/`, `icons/` | Recursos estáticos |
| `manifest.webmanifest` | Dados de instalação |
| `service-worker.js` | Cache offline e atualizações |
| `version.json` | Versão + lista de ficheiros guardados offline |

### ⚠️ Limitação conhecida (motivo da Fase 2)
`js/app.js` é um bundle React **minificado**, alterado por **remendos de substituição de texto** (nomes como `Bn`, `vt`, `ht`, `f`, `p`). É frágil: nomes minificados repetem-se em âmbitos diferentes. Ao mexer nele:
- confirmar que cada substituição encontra **exatamente uma** ocorrência;
- validar a sintaxe (`node --check js/app.js`) depois de cada alteração;
- preferir acrescentar lógica em `js/modulos/` e expor pontos de ligação mínimos (`window.ff…`).

Os módulos comunicam com o núcleo através de globais `window.ff*` (ex.: `ffImpApi`, `ffBk`, `ffVet`, `ffStmt`, `ffStorage`, `ffGoPg`, `ffRelock`).

### Fase 2 em curso
- Plano e estado de cada etapa: `docs/PLANO-FASE-2.md`.
- O site publicado é montado por `scripts/montar-site.mjs` em `_site/` e publicado pelo GitHub Actions: raiz = app atual (sem alterações); `/v2/` = versão de teste com dados isolados (prefixo `financas-v2:`), que **nunca** pode ler/escrever as chaves `financas-familiar:*` exceto pelo menu "Copiar dados" (só leitura).
- Testes: `python tests/correr.py` (raiz) e `FF_URL=v2/ FF_PREFIX=financas-v2: python tests/correr.py` (`/v2/`).
- Núcleo de dados novo em `app/src/dados/` (TypeScript): `npm ci && npm run verificar`. Tem de dar os mesmos resultados que a 1.9.x (`tests/referencias/dados.json`); diferenças intencionais listadas em `docs/PLANO-FASE-2.md` §4.1.

---

## 3. Regras críticas — dados do utilizador (NÃO QUEBRAR)

Qualquer alteração deve manter **compatibilidade total** com os dados já guardados nos telemóveis.

**Chaves do `localStorage` (não renomear nem mudar o formato):**

| Chave | Conteúdo |
|---|---|
| `financas-familiar:v3` | Dados principais: `transactions`, `accounts`, `salaries`, `categories`, `incomeCategories`, `petPhotos`, `profile`, `appearance`, `pinHash`, … |
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
- **Preview antes de implementar:** mostrar sempre como vai ficar (descrição, capturas ou página de teste) e **só implementar depois de o dono dizer** "avança", "prossegue", "próximo", "continua" ou "ok".
- **Parceiro crítico:** se houver uma alternativa melhor ou um risco, dizê-lo antes de avançar.
- **Versões:** formato `v#.##.#`. Em cada entrega:
  1. atualizar `ffVer` em `js/app.js`;
  2. atualizar `version` em `version.json` (e a lista `files`, se houver ficheiros novos);
  3. indicar **a lista exata de ficheiros alterados** para publicar.
- **Publicação:** o dono publica pelo GitHub (muitas vezes a partir do telemóvel). O aviso "Nova versão disponível" depende do `version.json`; sem o atualizar, os telemóveis não recebem a versão nova.
- **Testar sempre** antes de entregar (ver secção 6) e reportar os resultados em tabela.

---

## 5. Decisões já tomadas (não reverter sem pedir)

- Ícone da app e do Jarvis: robô; botão "+" e anel do Rendimento com gradiente ciano → roxo → rosa.
- Limpar a conversa do Jarvis **não** pede confirmação.
- Sugestões de ação do Jarvis (ex.: "Adicionar despesa…") **preenchem a caixa de texto**, não enviam.
- Ações do Jarvis que alteram dados (apagar, editar, registar, marcar como feito) **pedem sempre confirmação** com botões.
- Recibos de vencimento: ler o valor da linha que contém "Ticket Refeição" **e** um valor com "€".
- Importação de extratos: ver as regras em `js/modulos/extratos.js` (regras gerais de categorias + regras pessoais de salários, transferências a confirmar, movimentos ignorados e investimentos recorrentes).
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
- Na Fase 2, mover as regras pessoais da importação (nomes e entidades) do código para uma **configuração guardada no telemóvel**, para deixarem de estar no repositório público.

---

## 8. Fase 2 — objetivo

Reconstruir a app com **código-fonte legível e organizado**, eliminando os remendos no bundle minificado, **sem mudar o aspeto nem o comportamento** e **mantendo os dados compatíveis** (secção 3).

Abordagem pedida:
1. Propor primeiro um **plano por etapas** (stack, estrutura, ordem de migração, estratégia de testes) e aguardar aprovação.
2. Migrar por partes, com os testes a passar em cada etapa.
3. Manter a publicação no GitHub Pages (se for preciso um passo de compilação, usar GitHub Actions).
