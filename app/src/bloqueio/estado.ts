/**
 * Bloqueio automático em curso: a imagem de privacidade só sai depois de o ecrã de bloqueio
 * estar desenhado (para nunca se ver a app por um instante ao voltar).
 */
export const rebloqueio = { pendente: false };

/** Pedido de bloqueio feito pelo bloqueio automático; a app regista aqui a sua função. */
export const ligacoes = { bloquear: (): boolean => false };
