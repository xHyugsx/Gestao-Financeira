// Pontos de ligação com os módulos em JavaScript simples (js/modulos/*.js) reaproveitados na V2.
export {};

declare global {
  interface Window {
    ffVer?: string;
    ffLockMount?: (host: HTMLElement, opcoes: { hash: string; onUnlock: () => void }) => void;
    ffRelock?: () => boolean;
    ffRelockPending?: boolean;
    ffPrivacyOff?: () => void;
    ffMoreClose?: () => void;
    ffGoPg?: (pagina: string) => void;
    ffSaveOk?: () => void;
    ffSaveFail?: (erro: unknown) => void;
  }
}
