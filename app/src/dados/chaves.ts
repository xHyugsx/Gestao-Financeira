// Chaves do localStorage (secção 3 do CLAUDE.md): nunca mudar nomes nem formatos.
export const PREFIXO_REAL = 'financas-familiar:';
/** Prefixo da antiga versão de teste /v2/ (só para a limpar). */
export const PREFIXO_V2 = 'financas-v2:';

export const NOMES = {
  dados: 'v3',
  conversaJarvis: 'jarvis-threads:v2',
  ultimoBackup: 'last-backup',
  adiarBackup: 'backup-snooze',
  lembretesVet: 'vet-reminders',
  adiarVet: 'vet-snooze',
  biometria: 'bio',
  ofertaBiometria: 'bio-offer',
  autobloqueio: 'autolock',
  regrasImportacao: 'import-rules',
  ultimaImportacao: 'last-import',
  avisoEspaco: 'storage-warn',
  /** Só na APK: configuração das notificações e do backup automático deste telemóvel (não vão no backup). */
  notificacoes: 'notifications',
  backupAutomatico: 'auto-backup',
  /** «Esqueci-me do PIN» (v2.57.0): os dados foram apagados; o próximo restauro chega sem o PIN do backup. */
  pinEsquecido: 'pin-forgot',
  /** Boas-vindas já vistas ou saltadas neste telemóvel (v2.58.0; não vai no backup). */
  tutorial: 'tutorial',
} as const;

export type NomeChave = keyof typeof NOMES;

export function chave(nome: NomeChave, prefixo: string = PREFIXO_REAL): string {
  return prefixo + NOMES[nome];
}
