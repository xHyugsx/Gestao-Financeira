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
- Movimentos (despesas, receitas, transferências), categorias, notas por movimento, filtro por conta, pesquisa. Movimentos com data futura ficam **«Agendado»** e só mexem no saldo no próprio dia; na Principal ficam num grupo «Agendados» à parte (fechada, uma linha «N agendados · próximo: …») para não taparem os recentes (v2.20.0). A lista da Principal mostra **só os movimentos do mês escolhido** nas setas (por omissão, o mês atual), também em «Ver todas», na pesquisa e nos agendados; sem movimentos, «Sem movimentos em <mês>.» (v2.28.0). Nas despesas, campo **«Quem fez»** (membros do perfil; pré-escolhe a pessoa da última despesa), etiqueta na lista e **gastos por pessoa** na Análise. No «Novo movimento», sugestão de títulos e da categoria usada da última vez (só enquanto não se escolhe à mão).
- **Atalhos** no ícone da app (manifesto `shortcuts`): «Nova despesa» e «Jarvis» (`index.html?acao=despesa|jarvis`, executados depois do desbloqueio).
- Páginas: Principal, Análise, Calendário, Categorias, Resumo, Combustível, Veterinário.
  - Resumo › **Ano em revista**: ecrãs ao estilo «stories» com o ano em números (gasto, mês mais caro/leve, categorias, sítios, poupança, dias sem despesas); poupança não conta como gasto.
  - Resumo › **Recorrentes**: recorrentes do mês (pago / por pagar / atrasado / agendado / por confirmar; agendado e por confirmar contam em «falta pagar»), subidas de preço e custo anual (séries pelo título; despesas e transferências para a Revolut marcadas como recorrentes). Séries de **valor variável**: cada cópia nasce «Valor por confirmar» (sem mexer no saldo), com estimativa «≈» (média dos últimos 3 valores), «Da última vez» ao editar e lembrete na frase do dia; enquanto não têm valor, não contam no Ano em revista nem nos dias sem despesas. Mudar o tipo de valor ou a periodicidade num movimento da série aplica-se ao movimento que cria as cópias (desmarcar «Recorrente» num antigo só o tira da série). Se no mês já houver um movimento da mesma série registado à mão ou agendado (com efeito no saldo), a app não cria a cópia: esse movimento passa a continuar a série (v2.19.1); no sentido inverso, registar pelo «+» um movimento cuja série já tem cópia no mês preenche a cópia por confirmar ou pergunta «Substituir / Registar na mesma» (v2.22.1). Periodicidade **«Mensal · dia do salário»** (`recurringDay:"salario"`): as cópias caem no 3.º dia útil a contar do fim do mês (sem fins de semana nem feriados nacionais, incluindo Sexta-feira Santa e Corpo de Deus; v2.23.1); o valor variável também funciona nas **receitas** (salário: cópia «Valor por confirmar», estimativa na previsão) e ler o **recibo de vencimento** no Jarvis preenche a receita por confirmar desse mês com o líquido (v2.21.0); confirmar ou corrigir essa receita (à mão ou pelo Jarvis) atualiza também a tabela de Salários (pessoa pelo nome no título) (v2.23.0/v2.23.3). Apagar a cópia mais recente de uma série pergunta **«Só este mês»** (fica `skipped:true`: escondida, sem efeito em saldos e totais, e a série continua) ou **«Parar a série»** (apaga); o mês saltado aparece em Recorrentes como «Saltado» com **«Repor»** e o Jarvis faz a mesma pergunta ao apagar (v2.22.0).
  - Resumo › **Despesas anuais** (lista de planeamento `annualExpenses`, não são movimentos): total e reserva mensal só dos **próximos 12 meses**; no mês previsto ficam «Por pagar» (antes, «Em atraso») com **«Registar pagamento»** (cria o movimento de hoje, abre-o para acertar e passa a despesa para o ano seguinte) e **«Renovar sem registar»**; as por pagar entram na previsão do saldo e na frase do dia (v2.19.0). Uma despesa com o **mesmo título** registada desde o mês anterior ao previsto conta como paga e a despesa anual passa sozinha para o ano seguinte (v2.23.0), desde que não seja um recorrente com periodicidade inferior a um ano e o valor fique entre metade e o dobro do previsto (v2.23.3).
  - Análise › **gráficos** (v2.24.0): o circular é um SVG com uma fatia por categoria (entram uma a uma; tocar numa fatia ou na legenda destaca-a e mostra o valor no centro; tocar de novo ou no centro volta ao total); setas só para fatias de 5% ou mais (as mais pequenas juntam-se em «Outras»); categorias com o mesmo tom recebem cores diferentes no gráfico e na legenda (`coresDistintas`, pela ordem alfabética); barras crescem em sequência, o mês escolhido (ou hoje, no Diário) fica realçado e tocar numa barra mostra o valor; médias em cor neutra.
  - **Transições** (v2.25.0): a pílula dos separadores (`Segmentado`) desliza entre as opções (também em duas linhas, no Resumo); ao mudar de mês, a página e o nome do mês deslizam no sentido da seta (Web Animations, sem remontar a página); as primeiras 8 linhas das listas entram em cascata; os dias do Calendário entram em cascata ao abrir e ao mudar de mês. Nada disto com movimento reduzido.
  - **Menus** (v2.26.0): no painel «Mais» as páginas entram em cascata, cada ícone tem a sua cor (`COR_MAIS`) e arrastar o painel para baixo fecha-o; o botão «+» encolhe, o «+» roda e sai uma onda ao tocar; a linha do movimento acabado de gravar ou editar brilha por instantes (`data-id` na linha). A rotação do «+» para «×» foi posta de lado: a janela tapa o botão.
  - **Folhas de registo** (v2.27.0): Novo/Editar movimento, Novo abastecimento e Nova despesa veterinária abrem como folha que sobe do fundo (`Dialogo` com `folha`), com pega; arrastar a pega ou o título para baixo fecha; a folha fica por cima do teclado (`visualViewport`). As confirmações (apagar série, duplicado, editar categoria) continuam ao centro.
  - **Movimentos** (v2.30.0): apagar (na edição, nas ações rápidas ou «Parar a série») já não pede confirmação: apaga e mostra **«Desfazer»** durante 5 s (repõe no mesmo sítio); **toque longo** numa linha (ou botão direito) abre as **ações rápidas** (Editar · Duplicar para hoje · Apagar; `AcoesMovimento`/`AcoesRapidas`; duplicar tira as marcas de série/importação/junção e também tem «Desfazer»). O deslizar nas linhas foi posto de lado porque colidia com o deslizar entre páginas. **Valores ocultos** ficam desfocados (os «••••••» viram uma mancha; o valor real nunca vai para a página; `layout/ocultos.ts`). **Vibração curta** (8 ms) ao trocar de separador, de mês e de página, respeitando `appearance.haptics` (`ui/vibracao.ts`).
  - **Cabeçalho compacto e estados vazios** (v2.31.0): quando o seletor do mês sai do ecrã ao fazer scroll, aparece no topo uma barra fina com a página e o mês (setas «Recuar/Avançar um mês»; `IntersectionObserver`, sem `backdrop-filter`); os estados vazios (Principal, Análise, Calendário, Recorrentes, Despesas anuais, Combustível, Veterinário) mostram o **robô** (`ui/RoboVazio.tsx`), que flutua e pisca os olhos (parado com movimento reduzido).
  - **Comparações** (v2.32.0): no Resumo, cada conta tem um **mini-gráfico da evolução do saldo** nos últimos 12 meses (desde a criação da conta ou o primeiro movimento; com os previstos num mês futuro; escondido com os valores ocultos; `evolucaoDoSaldo`); na Análise, cada categoria da legenda mostra a **variação face ao mês anterior** (↑/↓ %, «=» ou «novo»; verde quando é bom) e uma barra fantasma com o valor desse mês (`anterior` em `LinhaCategoria`); no Calendário, uma coluna **«Total»** com o gasto de cada semana e o gasto do dia escolhido no título «Movimentos do dia».
  - **Jarvis e Ano em revista** (v2.33.0): no Jarvis, as mensagens novas entram com efeito de mola (as antigas aparecem logo ao reabrir) e, depois de cada resposta, aparecem **perguntas de seguimento** (↪ «Quanto gastei no mês passado?», «Previsão do saldo em <mês seguinte>», …; `jarvis/seguimentos.ts`; enviam logo, como as sugestões de perguntas; as ações não têm seguimento). No **Ano em revista**, o botão «Partilhar» desenha o ecrã atual numa imagem 1080×1350 (`paginas/cartaoRevista.ts`) e abre o menu «Partilhar» do Android ou guarda o PNG; não aparece com os valores ocultos.
  - Calendário com **mapa de calor** dos gastos (4 níveis pela posição entre os dias com gastos; poupança não conta) e dias sem despesas assinalados; dias futuros com agendados têm contorno tracejado e ficam fora dos níveis e do dia mais caro (v2.20.0). Cores (v2.29.0, iguais em todos os temas): **verde (pouco) → amarelo → laranja → vermelho (muito)**; sem despesas = contorno verde; agendado = tracejado branco. Para não se confundir com as cores, os tipos de movimento são **símbolos brancos** (▲ receita, ▼ despesa, ○ recorrente, ◆ transferência; € salário em branco), o fim de semana fica em cinzento e o dia escolhido é um anel branco que não tapa a cor do gasto.
  - Barra inferior: Principal · Análise · [+] · Calendário · **Mais** (painel com Categorias, Resumo, Combustível, Veterinário).
  - Ordem ao deslizar: Principal → Análise → Calendário → Categorias → Resumo → Combustível → Veterinário.
- **Ecrã de bloqueio**: imagem animada, gesto de deslizar para cima, teclado de PIN, **impressão digital (WebAuthn)**, bloqueio automático ao voltar à app, imagem desfocada no gestor de apps.
- **Jarvis** (assistente por regras, sem IA externa): perguntas por mês, loja, categoria, comparações, médias, consultas de movimentos, edição de movimentos com confirmação, saldo no fim de um mês passado ou **previsão** de um mês futuro (sem ano, o mês mais próximo), lembretes veterinários, notas, tolerância a erros de escrita, sugestões por página, botões Confirmar/Cancelar.
- **Leitura de recibos de vencimento (PDF)** e **importação de extratos bancários** (XLSX/XLS/CSV) com revisão antes de gravar, deteção de duplicados, regras memorizadas e "desfazer importação".
- **Lembretes veterinários**, lembrete de backup, indicador de espaço de armazenamento e aviso de gravação falhada.
- **Proteção dos dados**: pedido de armazenamento persistente (o Android não apaga os dados por falta de espaço; estado em Definições › Dados) e **backup protegido com palavra-passe** (AES-256-GCM, chave PBKDF2-SHA256; o backup normal continua igual).
- **Backup no Google Drive** (v2.35.0, Definições › Backup › Google Drive; passos em `docs/GOOGLE-DRIVE.md`): o dono cola o **ID de cliente** OAuth (Google Cloud, «Aplicação Web», só o âmbito `drive.file`) em cada telemóvel e liga a conta. Em cada **Criar backup** a app descarrega a cópia normal e envia **sempre a cópia protegida** (pede a palavra-passe; da 2.ª vez confirma-a com um verificador cifrado, sem a guardar) para a pasta «Finanças — backups», **um ficheiro por telemóvel, substituído** (o Drive guarda a versão anterior uns dias); se a cópia nova tiver menos de metade dos movimentos da anterior (≥ 20), pergunta antes. «Cópias no Drive» restaura ou junta (também a do outro telemóvel). Sem servidor: autorização no navegador (token de 1 hora, numa janela por cima da app ou, se não abrir, na própria janela com regresso à app; `dados/drive.ts`, `tratarRespostaGoogle` no `main.tsx`).
- **Juntar movimentos de outro telemóvel** (Definições › Backup): lê o backup do outro telemóvel (normal ou protegido) e acrescenta só os movimentos que ainda não existem (mesmo `id`, mesmo `importKey` ou mesma data/valor/título). Os juntados ficam com `affectsBalance:false` (os saldos deste telemóvel não mudam) e `mergeBatch`; «Desfazer a última junção» remove o lote mais recente. Os saltados («só este mês») não contam como já existentes nem são juntados.
- **Temas** (Definições › Aparência › Tema): Cósmico (original), Aurora, Pôr do sol, Noite dourada, **Oceano** e **Floresta** (v2.34.0) — cores, fundo, anel, botão +, letra, gráficos e velocidade das animações. Guardado em `appearance.theme`; aplicado em `<html data-tema>` (`app/src/ui/temas.ts`, `app/src/temas.css`); letras em `fonts/` (offline). A cor de destaque só se aplica ao Cósmico.
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
| `financas-familiar:drive` | Google Drive deste telemóvel: ID de cliente, conta, nome do telemóvel, pasta/ficheiro, último envio, verificador da palavra-passe (não vai no backup; `:drive-pendente`/`:drive-resposta` são passagens temporárias da autorização) |

- **PIN:** `pinHash = SHA-256("financas-familiar:" + PIN)` em hexadecimal. O registo da impressão digital guarda este hash; se o formato mudar, a impressão digital deixa de funcionar e o utilizador pode ficar sem acesso.
- **Movimentos:** campos `id, title, detail ("dia mês · Categoria"), amount (negativo = despesa), date (AAAA-MM-DD), movementType (expense|income|transfer), account?, recurring? (`true`/`"com"` = valor fixo, `"sem"` = valor variável), note?, pet?, affectsBalance?, importKey?, importBatch?, mergeBatch?, person?, recurringEvery?, recurringDay?, recurringDone?, skipped?` (`skipped:true` = cópia de recorrente saltada; as páginas usam os dados sem elas, os recorrentes contam-nas para as datas da série).
- **Backup/restauro:** o JSON exportado tem de continuar a ser restaurável, incluindo `vetReminders` e `jarvisThreads`.
- **Rendimento do mês X = salários do mês X−1** (regra de negócio já em uso).
- **Saldo das contas:** saldo guardado + movimentos com efeito no saldo; movimentos importados de extratos têm `affectsBalance:false`. O saldo da Edenred **transita** de mês para mês (nunca volta a zero).
- **Movimentos agendados** (data futura): só contam no saldo **a partir do próprio dia** (data local do telemóvel); na lista têm a etiqueta «Agendado». No Resumo de um mês futuro, o saldo é a **previsão** para o fim desse mês, com os agendados, os **recorrentes que a app ainda vai criar** (valor fixo ou estimativa dos variáveis; v2.17.0) as **despesas anuais por pagar** até lá (v2.19.0) e as **receitas recorrentes** (ex.: salário, v2.21.0), com a nota «Inclui … previstos». Os gastos do mês continuam a contá-los (decisão do dono, 21/10/2026, v2.15.0).

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
