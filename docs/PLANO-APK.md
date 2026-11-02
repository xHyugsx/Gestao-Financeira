# Plano — APK da app «Finanças»

Estado de partida: **v2.47.0** (reformulação «Órbita» concluída), publicada em
`https://xhyugsx.github.io/Gestao-Financeira/`. Uso exclusivo do dono (instalação manual, sem Play Store).

## 1. Recolha de dados (02/11/2026)

| Ponto | Situação atual | Relevância para a APK |
|---|---|---|
| Endereço | `xhyugsx.github.io/Gestao-Financeira/` (site de projeto) | A verificação da TWA tem de estar na **raiz** do domínio (`/.well-known/assetlinks.json`) → precisa do repositório `xHyugsx.github.io` |
| Manifesto | `start_url ./index.html`, `scope ./`, `standalone`, retrato, ícones 192/512/maskable, atalhos «Nova despesa» e «Jarvis» | Reaproveitado tal como está |
| Dados | `localStorage` (chaves em CLAUDE.md §3) | Na TWA são **os mesmos** do Chrome; numa app autónoma começam vazios |
| Impressão digital | WebAuthn (`bloqueio/biometria.ts`, ligado ao `pinHash`) | Funciona na TWA; numa WebView não |
| Google Drive | OAuth no navegador (`dados/drive.ts`, `tratarRespostaGoogle`) | Funciona na TWA; numa WebView o Google bloqueia (`disallowed_useragent`) |
| Partilha e downloads | `navigator.share` (Ano em revista) e descarga do backup (`lembreteBackup.ts`, `App.tsx`) | Funcionam na TWA; numa WebView precisam de plugins |
| Outros | vibração, Web Audio, `storage.persist`, service worker, aviso «Nova versão» | Funcionam na TWA |
| Compilação | GitHub Actions (`testes.yml`); os executores Ubuntu já têm JDK e Android SDK | A APK é compilada no Actions e fica numa *Release* |

## 2. Decisão: TWA (recomendado) e plano B

**Caminho A — TWA (Trusted Web Activity)**: a APK abre a app publicada através do Chrome, em ecrã inteiro.
- ✅ Ficam os **dados atuais**, a impressão digital, o Drive, a partilha e as **atualizações automáticas** (cada publicação no GitHub Pages chega à APK, sem reinstalar).
- ✅ Pouco código novo, sem mexer na app nem nos dados.
- ⚠️ Precisa do Chrome no telemóvel e do site no ar (offline continua a funcionar pelo service worker).

**Caminho B — Capacitor (autónoma)**: a app vai dentro da APK. Só avançar se o dono o pedir explicitamente.
- Começa vazia: restaurar um backup.
- Exige adaptações:
  - impressão digital nativa, com um plugin de biometria e um novo registo;
  - Drive com login nativo (ID de cliente Android com a SHA-1 da chave);
  - partilha e ficheiros com `@capacitor/share` e `@capacitor/filesystem`;
  - desligar o service worker;
  - aviso de versão nova a apontar para a Release.
- Cada versão nova é uma APK nova para instalar.
- Estimativa: **3 a 4 vezes** o trabalho do caminho A.

## 3. Passos do caminho A

Cada fase deixa o repositório num estado estável, para se poder parar entre fases.

### Fase 1 — Projeto Android (no repositório, pasta `android/`)
1. Gerar o projeto TWA com o Bubblewrap (`@bubblewrap/cli`), sem interação, a partir de `android/twa-manifest.json`:
   - `packageId`: `io.github.xhyugsx.financas`
   - `host`: `xhyugsx.github.io`, `startUrl`: `/Gestao-Financeira/index.html`
   - nome e cores: «Finanças», `#05091F`, ecrã inicial com o ícone 512
   - atalhos «Nova despesa» e «Jarvis», `orientation: portrait`, `display: standalone`
   - `fallbackType: customtabs`, `enableNotifications: false`
   - `appVersionName` = versão de `app/versao.json`, `appVersionCode` = número inteiro crescente
2. Pôr no projeto o código gerado (Gradle); **nunca** a chave de assinatura.

### Fase 2 — Chave de assinatura e Actions
1. Gerar a chave (`keytool`, RSA 2048, validade de 30 anos).
2. O dono guarda-a em **Settings › Secrets › Actions**:
   - `APK_KEYSTORE` (em base64)
   - `APK_KEYSTORE_PASS`
   - `APK_KEY_ALIAS`
   - `APK_KEY_PASS`
3. Guardar também uma cópia fora do GitHub: sem ela não é possível atualizar a APK.
4. Workflow novo `.github/workflows/apk.yml`:
   - corre à mão (`workflow_dispatch`) e quando `android/` muda;
   - compila com `./gradlew assembleRelease`, assina com os segredos e verifica com `apksigner verify`;
   - publica `financas-vX.YY.Z.apk` numa **Release** do GitHub.
5. Mostrar a impressão SHA-256 da chave no registo do Actions (`apksigner verify --print-certs`). Este valor é público e pode aparecer.

### Fase 3 — Verificação do domínio (tira a barra do endereço)
1. Criar o repositório público **`xHyugsx.github.io`** (página de utilizador, pode ficar vazio). Só o dono, ou eu com autorização.
2. Acrescentar:
   - `.nojekyll`, para o GitHub Pages publicar pastas começadas por ponto;
   - `.well-known/assetlinks.json` com `io.github.xhyugsx.financas` e a SHA-256 da chave.
3. Confirmar com a API do Google: `digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://xhyugsx.github.io&relation=delegate_permission/common.handle_all_urls`.
4. Confirmar que `xhyugsx.github.io/Gestao-Financeira/` continua igual: o repositório de utilizador não substitui os sites de projeto.

### Fase 4 — Testes
- Automáticos: `npm run verificar` e `python tests/correr.py` (a app não muda, devem continuar verdes) e `apksigner verify` no Actions.
- No telemóvel (dono), por esta ordem:
  1. **Criar backup** na app atual.
  2. Ativar «Instalar apps desconhecidas» para o navegador ou para os Ficheiros.
  3. Instalar a APK da Release.
  4. Confirmar: abre sem barra do endereço, os **movimentos aparecem**, o PIN e a impressão digital funcionam, os atalhos do ícone funcionam, Drive, partilha, sons, temas, barra de estado na cor do tema, e funciona offline em modo de avião.
  5. Só depois, se quiser, desinstalar a app antiga do Chrome. Os dados ficam no Chrome, mas o backup do passo 1 é a garantia.

### Fase 5 — Documentação e entrega
- CLAUDE.md: nova secção «APK» (pacote, onde está a chave, como se gera, a regra «a chave nunca no repositório»).
- `docs/APK.md`: guia curto para o dono (instalar, atualizar, o que fazer se mudar de telemóvel).
- Versão: não é preciso mudar `app/versao.json` (a app não muda). Se for preciso mudar alguma coisa na app, segue as regras habituais.

## 4. Riscos e cuidados

| Risco | Cuidado |
|---|---|
| Perder a chave de assinatura | Cópia fora do GitHub. Se se perder: desinstalar e instalar uma APK nova; os dados ficam no Chrome |
| Barra do endereço visível | `assetlinks.json` errado ou `.nojekyll` em falta; confirmar com a API (Fase 3) |
| Cor da barra de estado | O `theme-color` dinâmico pode não ser seguido pela TWA em todas as versões do Chrome. Testar; a cor de partida fica `#05091F` |
| Repositório público | Só vão para o GitHub o `assetlinks.json` (dados públicos) e o projeto Android, **sem** a chave nem as palavras-passe |
| Chrome desatualizado ou ausente | A TWA abre como separador personalizado (`customtabs`), que continua a funcionar |
| Desinstalar a app do Chrome antes do tempo | Fazer só depois de confirmar os dados na APK (Fase 4) |

## 5. O que o dono tem de fazer
1. Criar o repositório `xHyugsx.github.io`, ou autorizar-me a criá-lo.
2. Colar os 4 segredos da chave em Settings › Secrets › Actions (eu digo os valores).
3. Guardar a cópia da chave.
4. Instalar a APK e fazer os testes no telemóvel (Fase 4).

## 6. Estimativa
Caminho A: uma sessão média, sobretudo à espera do Actions. As Fases 1 e 2 são a maior parte; as Fases 3 a 5 são curtas.
