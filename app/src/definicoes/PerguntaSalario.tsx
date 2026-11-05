// Primeiro salário registado numa instalação nova: pergunta quando se recebe (de que mês é o «Rendimento mensal»).
import { Botao } from '../ui/Botao';
import { Dialogo } from '../ui/Dialogo';
import { OPCOES_SALARIO } from './Seccoes';

export function PerguntaSalario({ aberto, escolher }: { aberto: boolean; escolher: (v: 'anterior' | 'proprio') => void }) {
  return (
    <Dialogo
      aberto={aberto} aoMudar={(a) => { if (!a) escolher('anterior'); }} className="movement-dialog ffapagar-serie ffpergunta-salario" titulo="Quando recebes o salário?"
      descricao="Assim o «Rendimento mensal» mostra o dinheiro do mês certo. Podes mudar em Definições › Perfil e família."
    >
      <ul className="ffapagar-opcoes">
        {OPCOES_SALARIO.map((o) => <li key={o.valor}><strong>{o.rotulo}:</strong> {o.sub}.</li>)}
      </ul>
      <div className="dialog-actions">
        {OPCOES_SALARIO.map((o) => <Botao key={o.valor} type="button" variante={o.valor === 'anterior' ? 'ghost' : undefined} onClick={() => escolher(o.valor)}>{o.rotulo}</Botao>)}
      </div>
    </Dialogo>
  );
}

/** Depois de «Esqueci-me do PIN»: a app recomeça vazia e propõe restaurar um backup (chega sem o PIN). */
export function DadosApagados({ aberto, restaurar, fechar }: { aberto: boolean; restaurar: () => void; fechar: () => void }) {
  return (
    <Dialogo
      aberto={aberto} aoMudar={(a) => { if (!a) fechar(); }} className="movement-dialog ffapagar-serie ffdados-apagados" titulo="Os dados deste telemóvel foram apagados"
      descricao="Restaura um backup para recuperar os movimentos. A cópia restaurada fica sem PIN: podes criar um novo em Definições › Segurança."
    >
      <div className="dialog-actions">
        <Botao type="button" variante="ghost" onClick={fechar}>Começar do zero</Botao>
        <Botao type="button" onClick={() => { fechar(); restaurar(); }}>Restaurar backup</Botao>
      </div>
    </Dialogo>
  );
}
