// Definições › Notificações (só na APK) e o cartão do backup automático em Definições › Backup.
import { useEffect, useState } from 'react';
import type { Backup as DadosBackup } from '../dados';
import type { TipoAviso } from '../nativo/avisos';
import { estadoBackupAuto, fazerBackupAuto, gravarEstadoBackupAuto, PASTA_AUTO } from '../nativo/backupAuto';
import { autorizar, configAvisos, gravarConfigAvisos, notificacaoDeTeste, reagendar } from '../nativo/notificacoes';

const TIPOS: [TipoAviso, string, string, string, string][] = [
  ['recorrentes', '🔁', '#f9731633', 'Recorrentes', 'No dia de pagar e se ficarem em atraso'],
  ['ordenado', '💶', '#22c55e33', 'Dia do ordenado', 'Lembra confirmar o salário por confirmar'],
  ['anuais', '📅', '#eab30833', 'Despesas anuais', 'No dia 1 do mês em que estão previstas'],
  ['vet', '🐾', '#ec489933', 'Cuidados veterinários', '3 dias antes e no próprio dia'],
  ['backup', '💾', '#38bdf833', 'Backup', 'Se passarem 30 dias sem cópia'],
  ['semana', '📊', '#8b5cf633', 'Resumo da semana', 'À segunda-feira: a semana anterior e a comparação'],
  ['mes', '📈', '#ef444433', 'Fecho do mês', 'No dia 1: quanto gastaste no mês anterior'],
];

function Linha({ icone, cor, titulo, texto, ligado, mudar, estado }: { icone: string; cor: string; titulo: string; texto: string; ligado: boolean; mudar: (v: boolean) => void; estado?: string }) {
  return (
    <label className="fflinha-int ffnt-linha">
      <span className="ffnt-ic" style={{ background: cor }} aria-hidden="true">{icone}</span>
      <span><b>{titulo}{estado ? <em className="ffdef-estado ffdef-bom">{estado}</em> : null}</b><small>{texto}</small></span>
      <input type="checkbox" role="switch" aria-label={titulo} checked={ligado} onChange={(e) => mudar(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

export function Notificacoes() {
  const [config, setConfig] = useState(configAvisos);
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [mensagem, setMensagem] = useState('');
  useEffect(() => { void autorizar(false).then(setPermitido); }, []);
  const guardar = (c: typeof config) => { setConfig(c); gravarConfigAvisos(c); void reagendar(); };
  const ligar = async (v: boolean) => {
    if (v) {
      const ok = await autorizar(true);
      setPermitido(ok);
      if (!ok) { setMensagem('O Android não deixou: autoriza em Definições do telemóvel › Apps › Finanças › Notificações.'); return; }
    }
    setMensagem('');
    guardar({ ...config, ligado: v });
  };
  const ativas = config.ligado && permitido !== false;
  return (
    <>
      <div className="ffnt-cartao">
        <Linha icone="🔔" cor="#a855f733" titulo="Notificações" texto="A app avisa mesmo fechada. Tudo fica no telemóvel." ligado={ativas} mudar={(v) => void ligar(v)} estado={ativas ? 'Ativas' : undefined} />
        <label className="ffnt-linha ffnt-hora">
          <span className="ffnt-ic" style={{ background: '#22d3ee22' }} aria-hidden="true">⏰</span>
          <span><b>Hora dos avisos</b><small>Os avisos do dia chegam a esta hora</small></span>
          <input type="time" aria-label="Hora dos avisos" value={config.hora} onChange={(e) => { if (/^\d{2}:\d{2}$/.test(e.target.value)) guardar({ ...config, hora: e.target.value }); }} />
        </label>
      </div>
      <div className={`ffnt-cartao${ativas ? '' : ' ffnt-desligado'}`}>
        {TIPOS.map(([t, icone, cor, titulo, texto]) => (
          <Linha key={t} icone={icone} cor={cor} titulo={titulo} texto={texto} ligado={config.tipos[t]} mudar={(v) => guardar({ ...config, tipos: { ...config.tipos, [t]: v } })} />
        ))}
      </div>
      <button type="button" className="ffnt-teste" onClick={() => void notificacaoDeTeste().then((ok) => setMensagem(ok ? 'Notificação de teste enviada: chega daqui a 3 segundos.' : 'O Android não deixou mostrar notificações.'))}>
        Enviar uma notificação de teste
      </button>
      {mensagem ? <p className="settings-message" role="status">{mensagem}</p> : null}
      <p className="ffnt-nota">Com «Valores ocultos» ligado, os avisos não mostram valores.</p>
    </>
  );
}

export function BackupAutomatico() {
  const [e, setE] = useState(estadoBackupAuto);
  const [aGravar, setAGravar] = useState(false);
  useEffect(() => {
    const f = () => setE(estadoBackupAuto());
    window.addEventListener('ff-backup-auto', f);
    return () => window.removeEventListener('ff-backup-auto', f);
  }, []);
  const ultimo = e.ultimo ? new Date(e.ultimo).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const agora = async () => {
    setAGravar(true);
    await fazerBackupAuto(() => window.ffBk?.payload() as DadosBackup | undefined, true);
    setAGravar(false);
  };
  return (
    <div className="ffnt-cartao">
      <Linha icone="🛡️" cor="#22c55e33" titulo="Backup automático" ligado={e.ligado} estado={e.ligado ? 'Ativo' : undefined}
        texto="Guarda uma cópia sempre que sais da app depois de mudares alguma coisa (uma por dia)."
        mudar={(v) => gravarEstadoBackupAuto({ ...estadoBackupAuto(), ligado: v })} />
      <div className="ffnt-linha"><span className="ffnt-ic" style={{ background: '#22d3ee22' }} aria-hidden="true">📁</span>
        <span><b>Onde fica</b><small>{`Documentos › ${PASTA_AUTO.replace('/', ' › ')}`}</small></span></div>
      <div className="ffnt-linha"><span className="ffnt-ic" style={{ background: '#a855f733' }} aria-hidden="true">🗂️</span>
        <span><b>Cópias guardadas</b><small>{e.erro ? e.erro : ultimo ? `As últimas 7 · a mais recente ${ultimo} (${e.movimentos ?? 0} movimentos)` : 'Ainda nenhuma: a primeira é gravada ao saíres da app'}</small></span>
        {e.copias ? <em className="ffnt-chip">{e.copias}</em> : null}</div>
      {e.ligado ? <button type="button" className="ffnt-teste ffnt-agora" disabled={aGravar} onClick={() => void agora()}>{aGravar ? 'A gravar…' : 'Fazer uma cópia agora'}</button> : null}
      <p className="ffnt-nota">As cópias ficam fora da app: se desinstalares a APK continuam em Documentos e restauras a mais recente em «Restaurar backup».</p>
    </div>
  );
}
