/// <reference types="vite/client" />
// Pontos de ligação globais (window.ff*) usados entre partes da app e pelos testes.
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
