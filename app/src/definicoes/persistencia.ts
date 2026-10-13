// Pede ao navegador que não apague os dados da app quando faltar espaço (armazenamento persistente).
// No Android, o Chrome concede-o sem perguntar a apps instaladas; noutros casos pode recusar.

/** `true` protegido, `false` recusado, `null` o navegador não suporta. */
export async function pedirPersistencia(): Promise<boolean | null> {
  const s = navigator.storage;
  if (!s?.persist || !s.persisted) return null;
  try {
    return (await s.persisted()) || (await s.persist());
  } catch {
    return null;
  }
}
