# CLAUDE.md — App «Finanças»

Este ficheiro é lido automaticamente pelo Claude Code no início de cada sessão.
Contém o contexto do projeto e as regras de trabalho acordadas com o dono da app.

---

## 1. O projeto

- **O quê:** app web instalável (PWA) de finanças familiares, publicada no **GitHub Pages** a partir da raiz deste repositório.
- **Utilizadores:** uma família (duas pessoas adultas e dois animais de estimação). Uso diário no **telemóvel Android**, em modo instalado.
- **Dados:** 100% locais, no `localStorage` do navegador. **Não há servidor.** A cópia de segurança é um ficheiro JSON exportado pelo utilizador.
- **Versão atual:** ver `app/versao.json`.

### Funcionalidades principais (resumo; pormenores por versão em `docs/HISTORICO.md`)
- **Aspeto «Órbita»** (v2.40–v2.47, cada etapa aprovada com maquetas): topo com olho (valores ocultos) e robô (`.head-jarvis`: menu com «Perguntar ao Jarvis» + Definições), doca flutuante com o «+» igual ao de sempre, meses em pílulas, separadores `Segmentado`, cartões com as cores do tema (`orbita.css`, `--orb-*`). **Temas**: Cósmico, Aurora, Pôr do sol, Noite dourada, Oceano, Floresta (`ui/temas.ts`, `temas.css`, `appearance.theme`); **cor das despesas** à escolha (`appearance.expenseColor`, `--despesa`).
- **Animações** (Definições › Aparência): **Todas · Leves · Desligadas** (`appearance.animations`: `true`/`'leves'`/`false`; sem valor = Leves na APK, Todas na web; `ui/movimento.ts`: `nivelAnimacoes`, `semAnimacoes`, `animacoesReduzidas`). Leves mantém transições, janelas e o deslizar; Desligadas = como movimento reduzido. Confirmação animada ao guardar/alterar/eliminar com som suave (`ui/Confirmacao.tsx`, `appearance.sounds`); vibração curta (`appearance.haptics`).
- **Principal**: cartão do **rendimento** (só esse valor; rendimento do mês X = salários de X−1, ou de X com `profile.salaryMonth:'proprio'`; no dia do ordenado — 3.º dia útil a contar do fim do mês — passa ao mês seguinte; sem salários, cartão pequeno com o que fazer), **frase do dia** do Jarvis, **Gastos do mês** com os pontos de calor da semana, **Agendado**, lista do mês agrupada por dia (ponto de calor verde → vermelho; «Ver todas» junta os dias sem movimentos). Saldos das contas **não aparecem em lado nenhum**.
- **Movimentos**: despesas, receitas e transferências (`transferValue`, `account` → `toAccount`); «+» abre sempre numa despesa limpa; **valor em grande**, escolhas em botões (`ui/Escolhas.tsx`), categoria num painel com pesquisa (`CampoCategoria`), título sugerido e **categoria pelo título** (`categoriaPeloTitulo`); valor ≥ 10 000 € pede um 2.º «Guardar» (`valorAltoPorConfirmar`); datas futuras = «Agendado» (contam nos gastos do mês). **Quem fez**: sem pessoa = «Ambos» (2 membros) / «Todos» (3+), com um só membro é dele (`quemFez`, `opcoesQuemFez`, `rotuloAmbos`; cores: 1.º azul, 2.º rosa, Ambos roxo). Nas receitas de salário, **Quem recebe** atualiza a tabela de Salários (`movimentos/salarios.ts`). Apagar mostra «Desfazer» 5 s; toque longo abre ações rápidas.
- **Recorrentes**: séries pelo título, periodicidade (`recurringEvery`, «dia do salário» `recurringDay:'salario'`), valor fixo ou variável («Valor por confirmar» com estimativa); cópia já registada à mão continua a série; apagar a última pergunta «Só este mês» (`skipped:true`) / «Parar a série». Resumo › Recorrentes: Atrasado · Por pagar (no próprio dia) · Por confirmar · **A seguir** · Agendado · Pago · Saltado, e **Receitas recorrentes** à parte.
- **Páginas**: Principal, Análise (gastos/receitas/diário; grupos ou categorias; contas e pessoas; **comparações com o mesmo período do mês anterior** — `diaLimite`, `mesAnteriorComparavel`, `rotuloComparacao`; média mensal desde o 1.º mês com dados), Calendário (mapa de calor, totais por semana com agendados, símbolos ▲▼○◆€), Categorias (**grupos** `categoryGroups`, sugestões «Arrumar em grupos»), Resumo (Ano em revista, Recorrentes, **Despesas anuais** `annualExpenses` com valor fixo/variável e edição, Fecho do Mês, Salários), Combustível (por viatura `profile.vehicles`, `vehicle`/`fuel`; escondida sem viaturas), Veterinário (animais `profile.pets`, lembretes; escondida sem animais). Barra: Principal · Análise · [+] · Calendário · Mais.
- **Jarvis** (regras, sem IA externa): perguntas por mês/loja/categoria/conta, comparações justas, previsão dos gastos, frases do dia a dia, registar/editar/apagar **sempre com confirmação**, recibos de vencimento e importação de extratos, perguntas de seguimento; saudação só com nome de pessoa (`nomeParaSaudar`).
- **Boas-vindas** (v2.58.0): tutorial de 5 ecrãs numa instalação nova (`boasvindas/Tutorial.tsx`, chave `:tutorial`) e 3 dicas (`Dicas.tsx`). Nos testes, `app.abrir` salta-o (exceto `tutorial=True`).
- **Segurança**: ecrã de bloqueio (logótipo animado ou imagem escolhida, `lockImage`), PIN, impressão digital, bloqueio ao voltar, «Esqueci-me do PIN» (apaga os dados e o restauro chega sem PIN). **«Algo correu mal»** (`ui/ErroApp.tsx`) em vez do ecrã vazio se a app falhar ao desenhar (Recarregar / Exportar backup, com PIN).
- **Dados e backups**: backup JSON normal ou **protegido** (AES-256-GCM, PBKDF2-SHA256), Google Drive (`dados/drive.ts`, só `drive.file`; na APK sem ID de cliente; o ecrã de autorização está «Em teste» — decisão do dono), juntar movimentos de outro telemóvel, importação de extratos (XLSX/XLS/CSV) e recibos (PDF), armazenamento persistente, aviso de espaço, lembrete de backup. Ao ler: uma só conta fica uma só conta; título e `detail` sempre texto.
- **Arrumação** (v2.65.2, auditoria de 10/11/2026): testes de interface em paralelo; este ficheiro passou a resumo (histórico em `docs/HISTORICO.md`); `css/app.css` sem as 458 regras de classes que já não existem no código (184 → 148 KB; capturas antes/depois iguais); código morto retirado (`ultimaPessoa`, `OpcoesCategoria`, `legendasDoGrafico`).
- **Atualizar sozinha** (v2.60.0, corrigida na v2.63.0 e confirmada no telemóvel): PWA aplica a versão nova ao ir para segundo plano; APK descarrega a parte web do GitHub Pages (`nativo/atualizarWeb.ts`, guarda de arranque de 20 s com a app à vista, caminho guardado só depois de arrancar; Definições mostra a última verificação). Aviso «Descarregar» só quando muda o **nível Android** (`nativo` em `app/versao.json`) — **subir `nativo` sempre que mudar `android/`, plugins Capacitor ou `capacitor.config.ts`**.

---

## 2. Estrutura e arquitetura atual

A app é feita em **React + Vite + TypeScript** (código em `app/`), compilada pelo GitHub Actions e publicada na raiz do site. A reconstrução (Fase 2) terminou na v2.03.0; histórico em `docs/PLANO-FASE-2.md`.

| Caminho | Conteúdo |
|---|---|
| `app/src/` | Código da app, por áreas: `dados/`, `movimentos/`, `paginas/`, `definicoes/`, `importacao/`, `jarvis/`, `veterinario/`, `bloqueio/`, `layout/`, `ui/` |
| `app/versao.json` | **Versão da app** (única fonte; o `version.json` publicado é gerado a partir dela) |
| `app/service-worker.js` | Cache offline (`financas-app`) e atualizações (limpa os ficheiros de versões anteriores) |
| `app/estatico/manifest.webmanifest` | Dados de instalação (copiado tal como está; não mudar o endereço nem o `start_url`) |
| `app/retirado/` | Página e service worker publicados em `/v1/` e `/v2/`: apagam a cache e o service worker dessas versões antigas (e os dados `financas-v2:*`) e abrem a app |
| `css/app.css`, `img/`, `fonts/`, `icons/`, `vendor/` | Estilos e recursos usados pela app |
| `scripts/montar-site.mjs` | Monta `_site/` |

- Testes: `npm run verificar` (tipos + unitários) e `python tests/correr.py` (interface, Playwright; **4 testes em paralelo**, `FF_PARALELO=1` corre um a um; ~7 min). **Publicação mais rápida** (07/11/2026, pedido do dono, com a segurança como prioridade): o `testes.yml` corre em cada PR (já não em cada envio para um ramo) e no `main`; no `main`, se o conteúdo for **exatamente igual** (mesma árvore de ficheiros) à última versão de um PR fundido cujos testes `testes` passaram, só corre os testes rápidos e os de publicação (arranque, atualização com os dados, offline, bloqueio, compatibilidade) e publica em poucos minutos; em qualquer outro caso (alteração direta no `main`, PR desatualizado, testes do PR não verdes, `workflow_dispatch`) corre a bateria completa antes de publicar. `correr.py` aceita vários filtros separados por vírgulas. `tests/teste_atualizacao.py` cobre a atualização com dados preservados e `tests/teste_retirados.py` a retirada das versões antigas.
- Diferenças intencionais face à 1.9.x em `docs/PLANO-FASE-2.md` §4.1, §4.2 e §7.

---

## 3. Regras críticas — dados do utilizador (NÃO QUEBRAR)

Qualquer alteração deve manter **compatibilidade total** com os dados já guardados nos telemóveis.

**Chaves do `localStorage` (não renomear nem mudar o formato):**

| Chave | Conteúdo |
|---|---|
| `financas-familiar:v3` | Dados principais (`lockImage`: imagem do bloqueio da APK, desde a v2.55.0): `transactions`, `accounts`, `salaries`, `categories`, `incomeCategories`, `petPhotos`, `profile` (com `pets`), `appearance`, `pinHash`, `importConfig`, `categoryColors`, `categoryGroups`, `categoryGroupsSeen`, … (`profile.vehicles` desde a v2.43.0) |
| `financas-familiar:jarvis-threads:v2` | Conversa do Jarvis |
| `financas-familiar:last-backup` | Data do último backup |
| `financas-familiar:backup-snooze` | Adiamento do lembrete de backup |
| `financas-familiar:vet-reminders` / `:vet-snooze` | Lembretes veterinários |
| `financas-familiar:bio` / `:bio-offer` | Registo da impressão digital (ligado ao `pinHash`) |
| `financas-familiar:autolock` | Bloqueio automático |
| `financas-familiar:import-rules` / `:last-import` | Regras e "desfazer" da importação de extratos |
| `financas-familiar:storage-warn` | Aviso diário de espaço |
| `financas-familiar:drive` | Google Drive deste telemóvel: ID de cliente, conta, nome do telemóvel, pasta/ficheiro, último envio, verificador da palavra-passe (não vai no backup; `:drive-pendente`/`:drive-resposta` são passagens temporárias da autorização) |
| `financas-familiar:live-update` / `:atualizada` | Atualização sozinha (v2.60.0): na APK, a APK instalada (versionCode e nível Android), a versão web descarregada e as que falharam; na PWA, a versão de antes de atualizar (para o aviso). Não vão no backup |
| `financas-familiar:tutorial` | Boas-vindas já vistas ou saltadas neste telemóvel (v2.58.0; não vai no backup) |
| `financas-familiar:pin-forgot` | Marca de «Esqueci-me do PIN» (v2.57.0): os dados foram apagados e o próximo restauro chega sem PIN; sai depois do restauro |
| `financas-familiar:notifications` / `:auto-backup` | Só na APK (v2.51.0): configuração das notificações (ligado, hora, tipos, avisos adiados) e estado do backup automático (ligado, última cópia, assinatura); não vão no backup |

- **PIN:** `pinHash = SHA-256("financas-familiar:" + PIN)` em hexadecimal. O registo da impressão digital guarda este hash; se o formato mudar, a impressão digital deixa de funcionar e o utilizador pode ficar sem acesso.
- **Movimentos:** campos `id, title, detail ("dia mês · Categoria"), amount (negativo = despesa), date (AAAA-MM-DD), movementType (expense|income|transfer), account?, transferValue? (valor das transferências, que ficam com `amount:0`), toAccount? (conta de destino de uma transferência, v2.56.0), recurring? (`true`/`"com"` = valor fixo, `"sem"` = valor variável), note?, pet?, affectsBalance?, importKey?, importBatch?, mergeBatch?, person?, vehicle?, fuel?, recurringEvery?, recurringDay?, recurringDone?, skipped?` (`skipped:true` = cópia de recorrente saltada; as páginas usam os dados sem elas, os recorrentes contam-nas para as datas da série).
- **Backup/restauro:** o JSON exportado tem de continuar a ser restaurável, incluindo `vetReminders` e `jarvisThreads`.
- **Rendimento do mês X = salários do mês X−1** (regra de negócio já em uso; com `profile.salaryMonth:'proprio'`, desde a v2.57.0, = salários do mês X). Na Principal, o círculo muda para o mês seguinte no dia do ordenado (decisão do dono, 30/10/2026, v2.37.0).
- **Contas e saldos** (v2.36.0): os saldos **deixaram de aparecer** (Resumo, Jarvis, importação, Definições › Contas só com nomes), mas os campos guardados nas contas (`balance`, `adj`, `adjDays`, `lowAt`, `tickets`, `createdAt`) e o `affectsBalance` dos movimentos **mantêm-se como estão** (não apagar nem converter). Movimentos importados de extratos e juntados de outro telemóvel continuam com `affectsBalance:false`. As regras de cálculo antigas ficam em `dados/saldos.ts` (com testes), sem uso na interface.
- **Movimentos agendados** (data futura, data local do telemóvel): na lista têm a etiqueta «Agendado»; os gastos do mês contam-nos (decisão do dono, 21/10/2026, v2.15.0).

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
- **APK Android** (Capacitor, desde a v2.48.0; pormenores em `docs/HISTORICO.md`, plano em `docs/PLANO-APK.md`, guia em `docs/APK.md`): mesmo código em `app/src/`; o que é só da APK fica em `app/src/nativo/` (`eNativo()`), `android/`, `capacitor.config.ts` e `.github/workflows/apk.yml` (publica `apk-vX.YY.Z` nas Releases; versão = `app/versao.json`). Tem: notificações locais, backup automático diário (sem palavra-passe, decisão do dono), widgets (seguem «Valores ocultos»), Google Drive direto (ID de cliente Android com o pacote `io.github.xhyugsx.financas` e a SHA-1 da chave), imagem do bloqueio à escolha, ecrã escondido nos recentes (FLAG_SECURE — **não alterar**), taxa de atualização máxima. A chave de assinatura só nos segredos do GitHub (`APK_*`) e com o dono, **nunca no repositório**. Funções novas na APK: uma alínea de cada vez, com maquetas e aprovação.

---

## 5. Decisões já tomadas (não reverter sem pedir)

- Ícone da app e do Jarvis: robô; botão "+" e anel do Rendimento com gradiente ciano → roxo → rosa. Na reformulação «Órbita» o botão «+» **não muda** (aspeto, posição, brilho e animação; decisão do dono, 01/11/2026) e o Jarvis abre pelo robô do topo (menu com «Perguntar ao Jarvis» + Definições).
- Limpar a conversa do Jarvis **não** pede confirmação.
- Sugestões de ação do Jarvis (ex.: "Adicionar despesa…") **preenchem a caixa de texto**, não enviam.
- Ações do Jarvis que alteram dados (apagar, editar, registar, marcar como feito) **pedem sempre confirmação** com botões.
- Página Principal (decisão do dono, 12/10/2026): o círculo mostra **apenas o rendimento mensal** (valor em cor neutra; o verde/vermelho fica só na percentagem) e **não há caixas das contas** (gastos por conta na Análise). O «disponível do mês» no círculo foi experimentado na v2.07.0 e retirado na v2.08.0.
- Temas (decisão do dono, 13/10/2026): **sem tema claro**; o **ecrã de bloqueio não muda** com o tema (o atributo `data-tema` é retirado enquanto a app está bloqueada).
- Recibos de vencimento: ler o valor da linha que contém "Ticket Refeição" **e** um valor com "€".
- Importação de extratos: regras gerais de categorias em `app/src/importacao/classificacao.ts`; regras pessoais (salários, transferências a confirmar, movimentos ignorados, investimentos recorrentes) em **Definições › Importação**, guardadas no telemóvel (`importConfig`), nunca no código.
- Animais da família: vêm do perfil (`profile.pets`, Definições › Perfil e família); sem perfil, são deduzidos dos dados. Nunca escrever nomes de pessoas ou animais no código.
- Saldos das contas (decisão do dono, 30/10/2026, v2.36.0): **não se mostram em lado nenhum** nem se acertam em Definições › Contas (às vezes entra dinheiro de contas que não estão na app e os saldos ficavam errados). Continua a escolher-se a conta em cada movimento e os gastos por conta ficam na Análise.
- Ideias **descartadas**: «Partilhar com Finanças» e **câmara** na APK (decisões do dono, 03/11/2026); aviso de saldo baixo; orçamento por categoria; PIN com hash reforçado (risco para a impressão digital).
- Ideias **em pausa** (personalização): modo compacto; reordenar caixas das contas; escolher páginas da barra inferior; tom do Jarvis; perguntas favoritas; frequência do lembrete de backup.

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
- O repositório foi **recriado sem histórico** (13/10/2026, v2.14.0, um único commit inicial): o histórico antigo tinha nomes reais e ficou no repositório privado `Gestao-Financeira-antigo`. Não voltar a juntar esse histórico.

---

## 8. Fase 2 — objetivo (concluída na v2.03.0)

Reconstruir a app com **código-fonte legível e organizado**, eliminando os remendos no bundle minificado, **sem mudar o aspeto nem o comportamento** e **mantendo os dados compatíveis** (secção 3).

Abordagem pedida:
1. Propor primeiro um **plano por etapas** (stack, estrutura, ordem de migração, estratégia de testes) e aguardar aprovação.
2. Migrar por partes, com os testes a passar em cada etapa.
3. Manter a publicação no GitHub Pages (se for preciso um passo de compilação, usar GitHub Actions).
