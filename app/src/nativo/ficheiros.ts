// Ficheiros na APK: a WebView não descarrega blobs nem tem o «Partilhar» da Web.
// Grava em Documentos/Finanças (cópia que fica no telemóvel) e abre o «Partilhar» do Android.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const PASTA = 'Finanças';

function emBase64(blob: Blob): Promise<string> {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] ?? '');
    r.onerror = () => falha(r.error);
    r.readAsDataURL(blob);
  });
}

/** Grava e partilha. Devolve `false` se o utilizador fechou o «Partilhar». */
export async function guardarEPartilhar(nome: string, conteudo: string | Blob, titulo: string): Promise<boolean> {
  const texto = typeof conteudo === 'string';
  const dados = texto ? conteudo : await emBase64(conteudo);
  const opcoes = texto ? { data: dados, encoding: Encoding.UTF8 } : { data: dados };
  try { await Filesystem.writeFile({ path: `${PASTA}/${nome}`, directory: Directory.Documents, recursive: true, ...opcoes }); } catch { /* sem acesso a Documentos: fica só a partilha */ }
  const { uri } = await Filesystem.writeFile({ path: nome, directory: Directory.Cache, ...opcoes });
  try { await Share.share({ title: titulo, files: [uri] }); return true; } catch { return false; }
}
