import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { PREFIXO } from '../config';
import { type Estado, gravarDados, lerDados } from '../dados';

/**
 * Estado da app ligado ao localStorage: lê ao arrancar e grava a cada alteração
 * (tal como a app atual, que volta a gravar os dados normalizados logo ao abrir).
 */
export function useDados(): [Estado, Dispatch<SetStateAction<Estado>>] {
  const [estado, setEstado] = useState<Estado>(() => lerDados(window.localStorage, PREFIXO));
  useEffect(() => {
    gravarDados(window.localStorage, estado, {
      prefixo: PREFIXO,
      aoGravar: () => window.ffSaveOk?.(),
      aoFalhar: (e) => window.ffSaveFail?.(e),
    });
  }, [estado]);
  return [estado, setEstado];
}
