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
- Página principal com **Rendimento mensal em destaque** (círculo animado, só esse valor) e **frase do dia** do Jarvis (observação sobre os gastos do mês atual). Os **saldos das contas** estão no **Resumo** (no fim do mês escolhido) e os **gastos por conta** na **Análise › Gastos**.
- Movimentos (despesas, receitas, transferências), categorias, notas por movimento, filtro por conta, pesquisa. Nas despesas, campo **«Quem fez»** (membros do perfil; pré-escolhe a pessoa da última despesa), etiqueta na lista e **gastos por pessoa** na Análise. No «Novo movimento», sugestão de títulos e da categoria usada da última vez (só enquanto não se escolhe à mão).
- **Atalhos** no ícone da app (manifesto `shortcuts`): «Nova despesa» e «Jarvis» (`index.html?acao=despesa|jarvis`, executados depois do desbloqueio).
- Páginas: Principal, Análise, Calendário, Categorias, Resumo, Combustível, Veterinário.
  - Resumo › **Ano em revista**: ecrãs ao estilo «stories» com o ano em números (gasto, mês mais caro/leve, categorias, sítios, poupança, dias sem despesas); poupança não conta como gasto.
  - Resumo › **Recorrentes**: recorrentes do mês (pago / por pagar / atrasado), subidas de preço e custo anual (séries pelo título; despesas e transferências para a Revolut marcadas como recorrentes).
  - Calendário com **mapa de calor** dos gastos (4 níveis pela posição entre os dias com gastos; poupança não conta) e dias sem despesas assinalados.
  - Barra inferior: Principal · Análise · [+] · Calendário · **Mais** (painel com Categorias, Resumo, Combustível, Veterinário).
  - Ordem ao deslizar: Principal → Análise → Calendário → Categorias → Resumo → Combustível → Veterinário.
- **Ecrã de bloqueio**: imagem animada, gesto de deslizar para cima, teclado de PIN, **impressão digital (WebAuthn)**, bloqueio automático ao voltar à app, imagem desfocada no gestor de apps.
- **Jarvis** (assistente por regras, sem IA externa): perguntas por mês, loja, categoria, comparações, médias, consultas de movimentos, edição de movimentos com confirmação, lembretes veterinários, notas, tolerância a erros de escrita, sugestões por página, botões Confirmar/Cancelar.
- **Leitura de recibos de vencimento (PDF)** e **importação de extratos bancários** (XLSX/XLS/CSV) com revisão antes de gravar, deteção de duplicados, regras memorizadas e "desfazer importação".
- **Lembretes veterinários**, lembrete de backup, indicador de espaço de armazenamento e aviso de gravação falhada.
- **Proteção dos dados**: pedido de armazenamento persistente (o Android não apaga os dados por falta de espaço; estado em Definições › Dados) e **backup protegido com palavra-passe** (AES-256-GCM, chave PBKDF2-SHA256; o backup normal continua igual).
- **Juntar movimentos de outro telemóvel** (Definições › Backup): lê o backup do outro telemóvel (normal ou protegido) e acrescenta só os movimentos que ainda não existem (mesmo `id`, mesmo `importKey` ou mesma data/valor/título). Os juntados ficam com `affectsBalance:false` (os saldos deste telemóvel não mudam) e `mergeBatch`; «Desfazer a última junção» remove o lote mais recente.
- **Temas** (Definições › Aparência › Tema): Cósmico (original), Aurora, Pôr do sol e Noite dourada — cores, fundo, anel, botão +, letra, gráficos e velocidade das animações. Guardado em `appearance.theme`; aplicado em `<html data-tema>` (`app/src/ui/temas.ts`, `app/src/temas.css`); letras em `fonts/` (offline). A cor de destaque só se aplica ao Cósmico.
- Aviso **"Nova versão disponível"** com botões Ignorar/Atualizar.

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

- Testes: `npm run verificar` (tipos + unitários) e `python tests/correr.py` (interface, Playwright). `tests/teste_atualizacao.py` cobre a atualização com dados preservados e `tests/teste_retirados.py` a retirada das versões antigas.
- Diferenças intencionais face à 1.9.x em `docs/PLANO-FASE-2.md` §4.1, §4.2 e §7.

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
- **Movimentos:** campos `id, title, detail ("dia mês · Categoria"), amount (negativo = despesa), date (AAAA-MM-DD), movementType (expense|income|transfer), account?, recurring?, note?, pet?, affectsBalance?, importKey?, importBatch?, mergeBatch?, person?`.
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
- Página Principal (decisão do dono, 12/10/2026): o círculo mostra **apenas o rendimento mensal** (valor em cor neutra; o verde/vermelho fica só na percentagem) e **não há caixas das contas** (saldos no Resumo, gastos por conta na Análise). O «disponível do mês» no círculo foi experimentado na v2.07.0 e retirado na v2.08.0.
- Temas (decisão do dono, 13/10/2026): **sem tema claro**; o **ecrã de bloqueio não muda** com o tema (o atributo `data-tema` é retirado enquanto a app está bloqueada).
- Recibos de vencimento: ler o valor da linha que contém "Ticket Refeição" **e** um valor com "€".
- Importação de extratos: regras gerais de categorias em `app/src/importacao/classificacao.ts`; regras pessoais (salários, transferências a confirmar, movimentos ignorados, investimentos recorrentes) em **Definições › Importação**, guardadas no telemóvel (`importConfig`), nunca no código.
- Animais da família: vêm do perfil (`profile.pets`, Definições › Perfil e família); sem perfil, são deduzidos dos dados. Nunca escrever nomes de pessoas ou animais no código.
- Ideias **descartadas**: aviso de saldo baixo; orçamento por categoria; PIN com hash reforçado (risco para a impressão digital).
- Ideias **em pausa** (personalização): imagem do bloqueio à escolha; modo compacto; reordenar caixas das contas; escolher páginas da barra inferior; tom do Jarvis; perguntas favoritas; frequência do lembrete de backup.

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
