/** Wait for the mounted summary, not a fixed network/rendering delay. */
export async function aguardarResumoExportavel(id: string, timeoutMs = 30_000): Promise<HTMLElement> {
  const el = await new Promise<HTMLElement>((resolve, reject) => {
    const existente = document.getElementById(id);
    if (existente) { resolve(existente); return; }
    const observer = new MutationObserver(() => {
      const pronto = document.getElementById(id);
      if (!pronto) return;
      clearTimeout(timer);
      observer.disconnect();
      resolve(pronto);
    });
    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error("Não foi possível carregar a Cotação/ROI. Tente novamente."));
    }, timeoutMs);
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await document.fonts?.ready;
  await Promise.all(Array.from(el.querySelectorAll("img")).map(async (img) => {
    try { await img.decode(); } catch { /* Canvas handles unavailable images. */ }
  }));
  return el;
}