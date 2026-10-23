# Backup no Google Drive — configuração (uma vez)

A app guarda a **cópia protegida** (cifrada com a tua palavra-passe) numa pasta do teu Google Drive chamada
«Finanças — backups». Fica **um ficheiro por telemóvel**, substituído em cada backup. O Drive guarda a versão
anterior durante uns dias em «Gerir versões».

A app pede só a autorização `drive.file`: **vê apenas os ficheiros que ela própria cria**, nunca o resto do Drive.
Não há servidor: a autorização dura 1 hora e é pedida de novo quando for preciso.

## 1. Criar o projeto e o ID de cliente (no computador, ~10 minutos)

1. Abre <https://console.cloud.google.com/> com a tua conta Google e cria um projeto (ex.: «Financas»).
2. **APIs e serviços › Biblioteca** → procura **Google Drive API** → **Ativar**.
3. **APIs e serviços › Ecrã de consentimento OAuth** (ou «Google Auth Platform»):
   - Tipo de utilizador: **Externo**.
   - Nome da app: «Finanças»; email de suporte e de contacto: o teu.
   - Âmbitos (Data access): acrescenta só `.../auth/drive.file`.
   - Público (Audience): **Publicar a app** («Em produção»). Com só o âmbito `drive.file` não é preciso verificação
     da Google. Se preferires deixar «Em teste», acrescenta os emails da família como utilizadores de teste (nesse
     caso a Google pode pedir para autorizar de novo de 7 em 7 dias).
4. **APIs e serviços › Credenciais › Criar credenciais › ID de cliente OAuth**:
   - Tipo: **Aplicação Web**.
   - **Origens JavaScript autorizadas**: `https://xhyugsx.github.io`
   - **URIs de redirecionamento autorizados**: o «Endereço de retorno» que a app mostra em Definições › Backup ›
     Google Drive (o endereço da app terminado em `/`, ex.: `https://xhyugsx.github.io/Gestao-Financeira/`).
   - **Criar** → copia o **ID de cliente** (termina em `.apps.googleusercontent.com`). Não é segredo.

## 2. Em cada telemóvel

1. **Definições › Backup › Google Drive** → cola o ID de cliente → **Guardar**.
2. **Ligar ao Google Drive** → escolhe a conta → **Permitir**.
3. Dá um nome ao telemóvel (aparece no nome do ficheiro no Drive).
4. Daqui em diante, **Criar backup** pede a palavra-passe da cópia do Drive, descarrega a cópia normal e envia a
   protegida para o Drive (substituindo a anterior). Se a cópia nova tiver muito menos movimentos do que a do Drive,
   a app pergunta antes de substituir.

## Restaurar num telemóvel novo

Definições › Backup › Google Drive → ligar → **Cópias no Drive** → **Restaurar** (pede a palavra-passe). Com a mesma
conta nos dois telemóveis, **Juntar** traz os movimentos que só existem no outro.
