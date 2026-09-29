/** Página ainda não migrada para a app nova (só na versão de teste). */
export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <main className="detail-view">
      <section className="chart-panel ffv2-construcao">
        <h2>Em construção</h2>
        <p>A página «{titulo}» ainda está a ser reconstruída nesta versão de teste. Use a app «Finanças» para a consultar.</p>
      </section>
    </main>
  );
}
