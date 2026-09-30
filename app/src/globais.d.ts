// Pontos de ligação com os módulos em JavaScript simples (js/modulos/*.js) reaproveitados na V2.
export {};

declare global {
  interface Window {
    ffVer?: string;
    ffMoreClose?: () => void;
    ffGoPg?: (pagina: string) => void;
    ffSaveOk?: () => void;
    ffSaveFail?: (erro: unknown) => void;
    ffVet?: Record<string, (...a: never[]) => unknown>;
    ffImpApi?: { get: () => unknown };
    ffBk?: { readonly count: number; payload: () => unknown; download: () => void; done: () => void };
  }
}
