# APK Android — guia do dono

A app tem duas plataformas com o **mesmo código** (`app/src/`):
- **A — PWA**: `https://xhyugsx.github.io/Gestao-Financeira/`, publicada pelo `testes.yml` (igual a antes).
- **B — APK Android** (Capacitor, pasta `android/`), compilada pelo `apk.yml` e publicada em **Releases** (`apk-vX.YY.Z`).

## Ficheiros da Release
| Ficheiro | Para quê |
|---|---|
| `financas-vX.YY.Z.apk` | **A app** (pacote `io.github.xhyugsx.financas`) |
| `financas-dev-vX.YY.Z.apk` | Só para testes: instala-se **ao lado** («Finanças DEV»), com dados próprios |

## Chave de assinatura (uma vez)
Em **Settings › Secrets and variables › Actions › New repository secret**, criar:
`APK_KEYSTORE` (conteúdo do ficheiro `financas.jks.base64`), `APK_KEYSTORE_PASS`, `APK_KEY_ALIAS` (`financas`), `APK_KEY_PASS` (igual à primeira).
Guardar `financas.jks` e a palavra-passe **fora do GitHub** (ex.: gestor de palavras-passe). Sem a chave, não se consegue instalar uma versão nova por cima.
Sem os segredos, o `apk.yml` só gera a APK DEV (como artefacto) e não publica a Release.

## Passar da PWA para a APK (uma vez)
1. Na PWA: **Definições › Backup › Criar backup** (guarda o ficheiro).
2. Android: permitir «Instalar apps desconhecidas» ao navegador/Ficheiros.
3. Descarregar `financas-vX.YY.Z.apk` da Release e instalar.
4. Abrir, definir o PIN e **Restaurar backup** com o ficheiro do passo 1.
5. Ativar a impressão digital (é um registo novo, nativo).
6. Confirmar a lista de verificação em `docs/PLANO-APK.md` §5. A PWA não é apagada: deixar de a usar para os dados não divergirem.

## Atualizar
A app avisa «Nova versão disponível» quando há uma Release mais recente → **Descarregar** → instalar por cima. Os dados ficam.

## Backup e recuperação
- **Criar backup** grava em **Documentos › Finanças** e abre o «Partilhar» (Drive, e-mail, …).
- **Desinstalar a APK apaga os dados** (o backup automático do Android está desligado, para os dados não saírem do telemóvel sem querer).
- Telemóvel novo: instalar a APK e restaurar o último backup.

## Diferenças da APK face à PWA
- Impressão digital nativa; ecrã tapado nos recentes e sem capturas de ecrã.
- Botão Voltar: fecha a janela aberta → volta à Principal → sai.
- Google Drive direto: ainda não (próxima etapa; precisa de um ID de cliente Android).
