# Plano — APK nativa da app «Finanças»

- **Objetivo (dono, 02/11/2026):** passar da app web (PWA) para uma **APK Android** de uso exclusivo do dono, sem Play Store e sem distribuição. A APK deve **ir além** do que o navegador permite: **notificações** e outras funções de uma app nativa.
> **Só começar quando o dono escrever exatamente: «avança com a criação da app android».** Até lá, nada na APK.

- **Ponto de partida:** **v2.47.0**, com a reformulação «Órbita» concluída. A APK tem de ficar **igual** a esta versão (aspeto, comportamento e dados) antes de se acrescentar funções novas.

## 1. Recolha de dados

| Ponto | Situação atual (PWA) | Na APK nativa |
|---|---|---|
| Código | React + Vite + TS em `app/`, montado em `_site/` por `scripts/montar-site.mjs` | O **mesmo código** vai dentro da APK; o GitHub Pages continua a funcionar em paralelo |
| Dados | `localStorage` com as chaves de CLAUDE.md §3 | Mesmas chaves e mesmo formato, mas noutra origem (`https://localhost`): começa vazia e passa-se tudo com **Restaurar backup** (já existe) |
| Bloqueio | PIN (`pinHash`) e impressão digital por WebAuthn (`bloqueio/biometria.ts`) | O PIN fica igual. A impressão digital passa a ser **nativa** (BiometricPrompt), porque a WebView não tem WebAuthn |
| Imagem desfocada nos recentes | Truque web | **Nativo**: `FLAG_SECURE`, o ecrã não aparece nos recentes nem em capturas |
| Google Drive | OAuth no navegador (`dados/drive.ts`) | O Google bloqueia o login dentro de WebViews. Passa a **login nativo** (ID de cliente Android); as chamadas ao Drive ficam iguais |
| Partilhar (Ano em revista) | `navigator.share` (`paginas/cartaoRevista.ts`) | Plugin `@capacitor/share` com a imagem gravada na cache |
| Descarregar backup | Download do navegador (`lembreteBackup.ts`, `App.tsx`) | Gravar em Documentos (`@capacitor/filesystem`) e/ou abrir «Partilhar» |
| Abrir ficheiros (PDF, extratos, backups) | `<input type=file>` | Funciona na WebView do Capacitor |
| Vibração | `navigator.vibrate` (`ui/vibracao.ts`) | `@capacitor/haptics`, com vibração mais fina |
| Barra de estado | `meta theme-color` (`ui/temas.ts`) | `@capacitor/status-bar` com a mesma cor por tema |
| Bloqueio ao voltar à app | `visibilitychange` | `@capacitor/app` (`appStateChange`) |
| Atalhos do ícone | `shortcuts` do manifesto (`?acao=despesa|jarvis`) | Atalhos estáticos do Android que abrem o mesmo `?acao=` |
| Atualizações | Service worker e aviso «Nova versão disponível» | Sem service worker. O aviso consulta a **última Release** do GitHub e abre o download da APK nova |
| Sons, animações, temas, Jarvis, importação, PDF | Web | Ficam iguais |
| Armazenamento persistente | `navigator.storage.persist` | Desnecessário: os dados da app só se apagam se o dono os limpar ou desinstalar |
| Compilação | GitHub Actions (`testes.yml`) | Workflow novo `apk.yml`: JDK e Android SDK já existem no executor Ubuntu; a APK assinada vai para uma **Release** |

### 1.1 Correções a pressupostos (02/11/2026)
- **Não existe TWA.** A app é uma **PWA** publicada no GitHub Pages e instalada pelo Chrome. Não há projeto Android, Digital Asset Links nem assinatura. Onde se fale em «preservar a TWA», ler **«preservar a PWA e a sua publicação»**.
- **Os dados estão no `localStorage`**, não em IndexedDB. As chaves e o formato de CLAUDE.md §3 não mudam.
- **Sem modo claro** (decisão do dono, 13/10/2026): a APK usa os mesmos temas escuros.
- **A auditoria já está feita** (§1). Na sessão de arranque, só confirmar rapidamente que nada mudou desde a v2.47.0 (`git log`, `app/versao.json`).

## 2. Abordagem

- **Capacitor** (versão estável mais recente, com as versões fixadas), na pasta `android/` do repositório.
- **Uma só base de código:** uma camada `app/src/nativo/` decide em tempo de execução (`Capacitor.isNativePlatform()`) se usa o plugin nativo ou a versão web. A PWA no GitHub Pages continua igual, e os testes Playwright também.
- **Pacote:** `io.github.xhyugsx.financas`, nome «Finanças», ícone e ecrã inicial com os ícones atuais.
- **Versões:** `versionName` = `app/versao.json`, `versionCode` = número derivado (ex.: 2.47.0 → 24700). Cada entrega gera uma APK nova na Release; o aviso «Nova versão» na app leva até ela.
- **Duas plataformas, uma base de código** (princípio: acrescentar, nunca substituir):
  - **A — PWA**: `testes.yml` e a publicação no GitHub Pages ficam **intocados**, e continua a receber todas as mudanças do código comum.
  - **B — Android**: projeto em `android/` e workflow **novo e independente** `apk.yml`. Uma falha num não impede o outro.
  - As configurações de cada plataforma ficam separadas (`capacitor.config.ts` e `android/` só para a B).
- **Sem Google Play Services**, com uma exceção: o **login do Google Drive** (os telemóveis com a loja já os têm). Se o dono preferir, o Drive fica de fora da APK e o backup faz-se por ficheiro.
- **Permissões só quando a função existe**: a Fase 2 não pede câmara, microfone nem localização.
- **Repositório público:** a chave de assinatura e as palavras-passe ficam **só** nos segredos do GitHub e numa cópia do dono, nunca no código.

## 3. Fases

Cada fase fica estável, testada e com merge, para se poder parar entre fases quando o limite apertar.

### Fase 0 — Preparação (curta)
0. Confirmar que o Git está limpo e criar a tag de referência **`v2.47.0-pre-android`** no commit publicado da v2.47.0. A migração pode sempre voltar a este ponto.
1. Gerar a chave de assinatura (`keytool`, RSA 2048, 30 anos).
2. O dono cola 4 segredos em Settings › Secrets › Actions: `APK_KEYSTORE` (base64), `APK_KEYSTORE_PASS`, `APK_KEY_ALIAS`, `APK_KEY_PASS`.
3. O dono guarda uma cópia da chave fora do GitHub: sem ela não se consegue atualizar a APK sem a desinstalar.

### Fase 1 — APK base, igual à v2.47.0
1. Instalar `@capacitor/core`, `@capacitor/cli` e `@capacitor/android`; `capacitor.config.ts` com `webDir: '_site'` e `androidScheme: 'https'`.
2. Não registar o service worker na versão nativa.
3. `apk.yml`:
   - montar `_site`;
   - `npx cap sync android`;
   - `./gradlew assembleRelease`;
   - assinar e verificar com `apksigner verify`;
   - publicar `financas-vX.YY.Z.apk` numa Release.
4. Duas variantes:
   - **desenvolvimento** (`assembleDebug`, pacote `io.github.xhyugsx.financas.dev`, nome «Finanças DEV»), que se instala ao lado da de produção para testar sem tocar nos dados reais;
   - **produção** assinada com a chave permanente (nunca muda entre atualizações).
5. **Resultado:** APK instalável que já funciona (restaurar backup, PIN, todas as páginas).

### Fase 2 — Adaptações nativas (para ficar «no mesmo estado»)
1. Impressão digital: plugin de biometria (BiometricPrompt).
   - Guarda o registo **ligado ao `pinHash`**, como hoje.
   - Na APK nativa, o registo de WebAuthn não serve: pede-se um registo novo.
2. Ecrã privado: `FLAG_SECURE`, com o plugin *privacy screen*.
3. Partilha e backup em ficheiro (`share` + `filesystem`); vibração (`haptics`); barra de estado (`status-bar`); ecrã inicial (`splash-screen`); bloqueio ao voltar (`app`).
4. Atalhos do ícone «Nova despesa» e «Jarvis».
5. **Botão Voltar do Android** (`@capacitor/app` `backButton`), por esta ordem:
   - fecha a janela ou folha aberta (painel de categorias, «Mais», Jarvis, …);
   - depois volta à Principal;
   - na Principal, sai da app (fica em segundo plano e volta bloqueada).
6. Ciclo de vida: bloquear ao voltar, como hoje, e gravar os dados antes de ir para segundo plano.
7. Aviso «Nova versão disponível» a partir da Release do GitHub (API pública, sem servidor).
8. Google Drive com login nativo (exceção aos Play Services):
   - O dono cria um ID de cliente **Android** no Google Cloud (pacote + SHA-1 da chave, que eu indico) e continua com o âmbito `drive.file`.
   - `docs/GOOGLE-DRIVE.md` fica atualizado.
   - As cópias atuais no Drive continuam a servir para restaurar.

### Fase 3 — Mudança para a APK (com o dono)
1. Na PWA: **Criar backup** (e Drive).
2. Ativar «Instalar apps desconhecidas» e instalar a APK.
3. Restaurar o backup, registar a impressão digital e ligar o Drive.
4. Verificar com a lista do §5. Só depois deixar de usar a PWA.
5. Usar as duas em paralelo faz os dados divergirem. Para passar movimentos de uma para a outra existe «Juntar movimentos».

### Fase 4 — Notificações (a primeira função nova)
- `@capacitor/local-notifications`: notificações agendadas **no próprio telemóvel**, sem servidor nem Firebase.
- A app recalcula e reagenda as notificações sempre que abre e sempre que os dados mudam.
- Permissões: notificações (Android 13+) e alarmes exatos (Android 12+).
- Tocar na notificação abre a página certa.
- Propostas (o dono escolhe e aprova com maquetas):
  - recorrentes **a pagar hoje / atrasados**;
  - **valor por confirmar** (ex.: salário no dia do ordenado);
  - **despesas anuais** no mês previsto;
  - **lembretes veterinários** (hoje só aparecem ao abrir a app);
  - **lembrete de backup**;
  - **resumo semanal / fecho do mês**;
  - aviso de **gasto fora do normal** no dia.
- Em Definições › Notificações: ligar ou desligar cada tipo e escolher a hora.

### Fase 5+ — Outras funções nativas (uma alínea de cada vez, com maquetas)
- As Fases 0–2 só deixam a arquitetura **preparada** (camada `nativo/`, plugins instalados quando forem usados).
- Cada função abaixo é **uma alínea**: pedido do dono → maquetas → aprovação → implementação, versão e testes. Nada em pacote.
| Ideia | O que dá | Esforço |
|---|---|---|
| **Widget** no ecrã inicial | Rendimento, gastos do mês, botão «+» | Médio/alto (código Kotlin) |
| **Receber ficheiros** («Partilhar com Finanças») | Enviar o PDF do recibo ou o extrato diretamente de outra app | Baixo/médio |
| **Backup automático** | Cópia diária num ficheiro e/ou no Drive, sem abrir a app | Médio |
| **Câmara** | Fotografar talões e animais diretamente | Baixo |
| **Notificações do banco** | Ler as notificações da app do banco e propor a despesa já preenchida | Alto; dados sensíveis, ficam só no telemóvel |
| **Tile nas definições rápidas** | Nova despesa com um toque | Baixo/médio |
| **Registo por voz** | «Gastei 12 euros no café» → movimento preenchido para confirmar (reconhecimento de voz do Android, sem servidor) | Médio |
| **OCR de talões** | Ler valor, data e loja da fotografia do talão (no telemóvel, ML Kit) | Médio/alto; depende da câmara |
| **Exportar relatório PDF** | Fecho do mês ou ano em PDF para guardar ou partilhar | Médio |
| **Bloqueio por inatividade** | Bloquear após X minutos sem toques, além do bloqueio ao voltar | Baixo |

## 4. Testes
- **Web (sem mudanças):** `npm run verificar` e `python tests/correr.py` continuam verdes. A camada `nativo/` tem testes unitários com os plugins simulados.
- **Independência:** cada PR confirma que `testes.yml` (PWA) e `apk.yml` (APK) passam em separado e que o site publicado não muda por causa da APK.
- **APK no Actions:** compilação, `apksigner verify` e, se o tempo o permitir, um teste rápido num emulador (a app abre e mostra o bloqueio).
- **Limites:** não tenho acesso ao telemóvel do dono. O teste num **dispositivo real** é do dono (§5); a migração só fica **concluída** depois disso. O consumo de memória só é medido de forma aproximada no emulador.
- **Compatibilidade dos dados:** teste que restaura um backup fictício na versão nativa e compara as chaves do `localStorage`.

## 5. Lista de verificação no telemóvel (dono)
- [ ] Ícone, nome, ecrã inicial e barra de estado na cor do tema
- [ ] PIN, impressão digital e bloqueio ao voltar
- [ ] Imagem tapada nos recentes
- [ ] Movimentos, páginas, temas, sons e animações iguais
- [ ] Atalhos do ícone
- [ ] Criar e restaurar backup (normal e protegido); Google Drive
- [ ] Importar extrato e recibo
- [ ] Partilhar o Ano em revista
- [ ] Modo de avião
- [ ] Aviso «Nova versão disponível»
- [ ] Botão Voltar (fecha janelas → Principal → sai)
- [ ] Atualizar por cima da versão anterior sem perder dados
- [ ] A PWA no Chrome continua a abrir e a funcionar como antes

### Critério de conclusão
1. A PWA continua a funcionar e a ser publicada como hoje.
2. A APK instala-se e passa a lista acima no telemóvel do dono.
3. As duas usam o mesmo código de `app/src/`.
4. Atualizar uma não interrompe a outra.

## 6. Riscos
| Risco | Cuidado |
|---|---|
| Perder a chave de assinatura | Cópia do dono fora do GitHub. Sem ela, para atualizar é preciso desinstalar, o que apaga os dados: backup antes |
| Desinstalar a APK apaga os dados | Lembrete de backup (e, mais tarde, backup automático) |
| Drive exige um ID de cliente Android | Passos guiados em `docs/GOOGLE-DRIVE.md` |
| Notificações atrasadas pela poupança de bateria | Alarmes exatos; sugerir tirar a app da otimização de bateria |
| Repositório público | Só vai para o GitHub o código. Chave, palavras-passe e dados nunca |
| Dados reais em testes | Testar com a APK de desenvolvimento (pacote à parte) e dados fictícios |
| Duas versões a divergir (PWA e APK) | Mudança num só dia (Fase 3) |

## 7. O que o dono tem de fazer
1. Fase 0: colar os segredos e guardar a cópia da chave.
2. Fase 2: criar o ID de cliente Android do Google Drive (com o meu guia).
3. Fase 3: instalar, restaurar e verificar.
4. Fase 4+: escolher as notificações e as funções, e aprovar as maquetas.

## 8. Frase para arrancar
Na sessão em que houver limite, o dono escreve:

> **avança com a criação da app android**

Âmbito por omissão dessa ordem: tag `v2.47.0-pre-android` → Fases 0, 1 e 2. Notificações e restantes funções só com pedido próprio.

## 9. Estimativa
- Fases 0 e 1: uma sessão curta.
- Fase 2: uma sessão média.
- Fase 4: uma sessão média.
- Cada função da Fase 5: uma sessão.
- Começar pelas Fases 0 a 2 deixa a APK **igual à v2.47.0**.
