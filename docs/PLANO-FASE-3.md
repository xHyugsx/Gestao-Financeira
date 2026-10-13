# Fase 3 — App Android (.apk)

Transformar a app web «Finanças» numa **app Android instalável (.apk)**, para uso pessoal (sem Play Store, sem distribuição), mantendo o aspeto, o comportamento e os dados, e acrescentando funções nativas que o navegador não permite.

> Método de trabalho (ver `CLAUDE.md`): uma etapa de cada vez; **preview antes de implementar**; implementar só depois de «avança»; versão `v#.##.#`; testes verdes; lista exata do que mudou.

---

## Estado — processo «APK» em pausa (13/10/2026)

> Este plano chama-se **APK**. Está **em pausa na etapa 3.0**, sem nada implementado (app na v2.14.0).
> Só se retoma quando o dono o disser explicitamente (ex.: «retoma o APK»). Os outros pedidos não fazem parte deste plano.

### Decisões da 3.0 (revistas com o dono)
- **Identificador:** `pt.gestaofinanceira.l4r9` (sufixo aleatório e sem significado, para evitar colisões com o registo de identificadores da Google em 2027). **Nome visível:** «Finanças». **Cor:** `#05091F`. **Ícone:** o robô atual.
- **Chave de assinatura:** criada no computador do dono, nunca no GitHub Actions nem nesta conversa.
  1. Instalar o Java (Temurin 21 LTS em adoptium.net) e abrir **um PowerShell novo**.
  2. Numa pasta só do dono:
     ```
     keytool -genkeypair -v -storetype PKCS12 -keystore financas.jks -alias financas -keyalg RSA -keysize 4096 -validity 36500 -dname "CN=Financas"
     ```
     Palavra-passe com 16 ou mais caracteres, usada só aqui. O `-dname` evita as perguntas de nome; se aparecer «Is … correct? [no]», escrever `yes`.
  3. Converter em texto:
     ```
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\financas.jks")) | Set-Clipboard
     ```
  4. Em **Settings › Environments**, criar o Environment `android`, limitado ao ramo `main`. Acrescentar os segredos:
     - `ANDROID_KEYSTORE_BASE64`
     - `ANDROID_KEYSTORE_PASSWORD`
     - `ANDROID_KEY_ALIAS` = `financas`
  5. Guardar as cópias:
     - o `financas.jks` no Drive ou OneDrive pessoal **e** numa pen USB;
     - a palavra-passe num gestor de palavras-passe, nunca junto do ficheiro.
  6. Limpar a área de transferência: **Win+V › «Limpar tudo»**. Confirmar que «Partilhar entre dispositivos» está desligado.
  7. Verificar a cópia da pen com `keytool -list -v -keystore "<pen>\financas.jks"` e registar no `CLAUDE.md` a impressão digital **SHA-256** (é pública).
  8. Obrigatório: em **Settings › Actions › General**, escolher «Require approval for all outside collaborators».
- Num repositório público, o `.apk` das Releases tem só o código da app. Nunca leva dados pessoais, e os testes usam só dados fictícios.

### Regras já fixadas para a 3.1
- Nunca usar `pull_request_target`.
- A chave é descodificada para `$RUNNER_TEMP` e apagada no fim (`if: always()`). Nunca é enviada como artefacto.
- O job de assinatura usa o Environment `android`, com as actions **fixadas por SHA**.
- Como a chave é PKCS12, `keyPassword = storePassword`.
- O certificado do `.apk` é comparado com a SHA-256 registada. Se não coincidir, a compilação falha.
- **Só há `.apk` novo quando muda a parte nativa:**
  - controlado por um campo explícito no `app/versao.json` (ex.: `"apk": 1`);
  - as outras melhorias chegam pela **atualização dentro da app**, que tem de vir já no primeiro `.apk`.

### Para retomar
1. O dono confirma os pontos que propus na revisão: o sufixo `l4r9`, o `-dname` e o Environment `android`.
2. O dono cria a chave e os segredos e diz «segredos criados», com a SHA-256.
3. Com «avança», a 3.0 fica concluída:
   - registar a SHA-256 neste plano;
   - acrescentar `*.jks`, `*.keystore` e `keystore.properties` ao `.gitignore`;
   - criar a secção «App Android» no `CLAUDE.md`;
   - subir a versão para v2.14.1.
4. A etapa **3.7 nunca** avança sem confirmação expressa do dono.

---

## Decisões já tomadas

- **Tecnologia:** Capacitor sobre a app React + Vite + TypeScript existente (reaproveitar o código; nada de reescrever em Kotlin).
- **Compilação:** o `.apk` é gerado e assinado pelo **GitHub Actions** (sem Android Studio do lado do dono).
- **A versão web (GitHub Pages) mantém-se** como plano B, a partir do mesmo código.
- **Atualizações:**
  - melhorias «normais» (ecrãs, Jarvis, cálculos) chegam **dentro da app**, com o aviso «Nova versão disponível» → «Atualizar», sem reinstalar;
  - melhorias nativas (permissões, plugins) chegam por **novo `.apk`**: a app avisa, descarrega e o dono toca em «Instalar» (instala por cima, dados intactos).
- **Dados:** passagem única da app web para a app Android por **backup → restauro**. Depois disso, nunca mais é preciso restaurar para atualizar.
- **Fora de âmbito:** widget no ecrã inicial; backup mensal numa pasta com apagar o anterior; publicação na Play Store.

---

## Etapas

### 3.0 · Preparação
- Propor o **identificador da app** (genérico, sem dados pessoais) e o nome visível («Finanças»).
- Propor a forma **mais segura** de criar e guardar a **chave de assinatura**:
  - guardada como segredo do repositório (GitHub › Settings › Secrets);
  - com uma cópia guardada pelo dono fora do GitHub.
  - Explicar ao dono, em passos simples, o que tem de fazer.
- Confirmar o impacto de o repositório ser **público**: o `.apk` publicado nas Releases não pode conter dados pessoais.
- **Critério:** plano aprovado, chave criada e guardada em dois sítios.

### 3.1 · Base Android
- Integrar o Capacitor, com o ícone, a cor e o ecrã inicial atuais.
- Workflow do GitHub Actions que compila, testa e assina o `.apk` e o publica numa **Release** com a versão.
- Mecanismo de atualização:
  - melhorias web dentro da app (avaliar as alternativas e propor a mais simples e fiável, com funcionamento sem internet);
  - novo `.apk`: aviso, descarga e instalação com um toque.
- Explicar ao dono como instalar a primeira vez («Instalar apps desconhecidas», aviso do Play Protect).
- **Critério:** `.apk` instalado no telemóvel do dono, app idêntica à versão web, atualização de teste recebida sem reinstalar.

### 3.2 · Passagem dos dados
- Assistente no primeiro arranque: «Restaurar backup» (ficheiro exportado na app web).
- No fim, confirmar que o número de movimentos, contas, categorias, lembretes, regras de importação e conversa do Jarvis é igual ao do backup.
- PIN e impressão digital: o dono pode ter de voltar a ativar a impressão digital (o registo do navegador não passa para a app). O PIN continua o mesmo.
- **Critério:** dados completos e verificados; a app web continua intacta como plano B.

### 3.3 · Armazenamento nativo
- Passar os dados do armazenamento do navegador (limite de ~5 MB) para armazenamento nativo do telemóvel, sem esse limite.
- **Manter o formato dos dados** (secção 3 do `CLAUDE.md`), o backup e o restauro compatíveis com a versão web.
- Migração automática e segura na primeira abertura, com verificação e sem perda.
- **Critério:** dados migrados e verificados; indicador de espaço adaptado.

### 3.4 · Notificações
- Notificações locais, mesmo com a app fechada:
  - lembretes veterinários (em atraso / próximos dias);
  - lembrete de backup;
  - movimentos recorrentes (no dia anterior).
- Cada tipo pode ser ligado ou desligado em Definições, e a hora pode ser escolhida.
- Pedir as permissões de notificação do Android só quando forem necessárias, explicando porquê.
- **Critério:** notificações recebidas no telemóvel do dono; tocar na notificação abre o ecrã certo.

### 3.5 · Partilhar para a app
- A app aparece no menu «Partilhar» do Android para **PDF, XLSX, XLS e CSV**.
- Extratos → abrem a revisão da importação; recibos de vencimento → leitura do recibo.
- **Critério:** partilhar um extrato a partir do email abre logo a revisão.

### 3.6 · Impressão digital nativa
- Substituir a impressão digital do navegador pela biometria nativa do Android, mantendo o PIN como alternativa.
- **Critério:** desbloqueio com impressão digital e recurso ao PIN a funcionar; bloqueio automático e privacidade (imagem desfocada no gestor de apps) mantidos — no Android nativo, avaliar a proteção do sistema contra capturas de ecrã no gestor de apps.

### 3.7 · Leitura das notificações do banco — **PENDENTE**
> **Não implementar sem confirmação expressa do dono** e sem exemplos reais (anonimizados) das notificações de cada banco.

- Permissão «Acesso a notificações» do Android; processar **apenas** as apps de banco escolhidas pelo dono; ignorar todas as outras; nada sai do telemóvel.
- Ler valor, loja e tipo (gasto/receita) → propor o movimento com categoria (regras da importação) e conta certa.
- Confirmação por notificação («Registar / Editar / Ignorar») ou lista «Por confirmar» dentro da app.
- Integração com a deteção de duplicados da importação de extratos.
- Aviso «notificação não reconhecida» quando o formato não for conhecido (nunca inventar valores).
- Indicar ao dono como evitar que o telemóvel feche a app em segundo plano (otimização de bateria).

---

## Testes e qualidade
- Todos os testes atuais continuam verdes em cada etapa.
- Acrescentar testes para: atualização, restauro e verificação de dados, migração do armazenamento, agendamento de notificações e receção de ficheiros partilhados.
- Testar no telemóvel do dono antes de dar cada etapa por concluída (o dono confirma).

## Riscos e cuidados
| Risco | Cuidado |
|---|---|
| Perder a chave de assinatura | Guardada em dois sítios; sem ela, as atualizações exigem desinstalar (e restaurar backup) |
| Perda de dados na passagem ou na migração | Backup antes; verificação de contagens; app web mantida como plano B |
| Regras da Google para apps instaladas fora da Play Store | Em Portugal, sem alterações até 2027; depois, conta gratuita de distribuição limitada ou instalação por ADB |
| Repositório público | Nenhum dado pessoal no código, nas Releases ou nos testes |
