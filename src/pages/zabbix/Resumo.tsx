import { useReformaCBS } from "@/hooks/useReformaCBS";
import { calcPrecoReforma, parcelasDeLinhas, textoPrecoReforma, REFORMA_VIGENCIA } from "@/lib/pricing/reformaTributaria";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import selbettiLogo from "@/assets/selbetti-logo.png.asset.json";
import { useZabbixResultado } from "./useZabbixResultado";
import { ZBX_BASE } from "./useZbxState";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export async function exportarResumoZbxPdf(nomeArquivo: string) {
  const el = document.getElementById("zbx-resumo-printable");
  if (!el) throw new Error("Resumo indisponível.");
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const img = canvas.toDataURL("image/jpeg", 0.92);
  const W = 210, H = 297, h = (canvas.height * W) / canvas.width;
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  let left = h, pos = 0;
  pdf.addImage(img, "JPEG", 0, pos, W, h, undefined, "FAST");
  left -= H;
  while (left > 2) { pos = left - h; pdf.addPage(); pdf.addImage(img, "JPEG", 0, pos, W, h, undefined, "FAST"); left -= H; }
  pdf.save(nomeArquivo);
}

/** Resumo de Cotação das Subscrições Zabbix — formato do Treinamento, com a condição comercial no topo. */
export default function ZbxResumo({ embedded = false }: { embedded?: boolean }) {
  const { st, res, tax, globais, congeladoIntacto, loading } = useZabbixResultado();
  const { can } = useAuth();
  const { cbsPerc: cbsReforma } = useReformaCBS();
  const ok = res.linhas.filter((l) => l.erros.length === 0 && l.fixos);
  if (embedded && (loading || !ok.length)) return null;
  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!ok.length) return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Nenhum item na cotação</h2>
      <p className="text-muted-foreground text-sm">Adicione subscrições no <Link to={ZBX_BASE} className="text-primary hover:underline">Configurador</Link>.</p>
    </div>
  );
  const exportar = async () => {
    try { await exportarResumoZbxPdf(`${st.atual.codigo || "resumo-zabbix"}-${new Date().toISOString().slice(0, 10)}.pdf`); }
    catch (e) { toast.error((e as Error).message); }
  };
  const soma = (f: (l: typeof ok[number]) => number) => ok.reduce((s, l) => s + f(l), 0);
  const total = res.precoFinalTotal;
  const cbsPerc = cbsReforma;
  const impostos = soma((l) => l.precoFinal * (l.fixos!.pisPerc + l.fixos!.cofinsPerc + l.fixos!.issPerc + l.fixos!.irpjCsllPerc) / 100);
  const comercial = soma((l) => l.precoFinal * l.comissaoPerc / 100);
  const retencao = soma((l) => l.precoFinal * l.fixos!.retencaoPerc / 100);
  const financeiro = soma((l) => l.precoFinal * l.fixos!.encFinancPerc / 100);
  const cen = globais.cenario;
  const condicao = `${cen.temRO ? "Com RO" : "Sem RO"} · ${cen.pagamento30d ? "Pagamento em 30 dias" : "Sem desconto de pagamento 30 dias"}`;
  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex gap-2 text-sm"><span className="font-bold whitespace-nowrap" style={{ color: "#000" }}>{label}</span><span style={{ color: "#000" }}>{value || "—"}</span></div>
  );
  const cell = "border border-slate-300 px-2 py-1.5";
  const head = "border border-slate-300 px-2 py-2 font-bold whitespace-nowrap";
  return (
    <div className="space-y-4">
      <div className={embedded ? "hidden" : "flex items-center gap-2"}>
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Resumo de Cotação</h2>
        <Button size="sm" className="ml-auto gap-1.5 text-xs" onClick={exportar} disabled={!can("page.zbx.proposal")}><FileDown className="h-3.5 w-3.5" /> Exportar PDF</Button>
      </div>
      <div className="overflow-x-auto">
        <div id="zbx-resumo-printable" className="bg-white rounded-md shadow-sm p-10 mx-auto" style={{ width: "210mm", color: "#000" }}>
          <div className="flex items-start justify-between mb-8">
            <img src={selbettiLogo.url} alt="Selbetti" style={{ height: 48, width: "auto" }} crossOrigin="anonymous" />
            <div className="text-3xl font-bold" style={{ color: "#000" }}>Resumo de Cotação</div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
            <Field label="Cliente:" value={st.atual.cliente} />
            <Field label="Gerente de Contas:" value={st.atual.gerenteConta} />
            <Field label="Data:" value={new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} />
            <Field label="Especialista:" value={st.atual.especialistaBU} />
            <Field label="Condição comercial:" value={condicao} />
            <Field label="Arquiteto:" value={st.atual.arquitetoBU} />
            <Field label="Nº da Oportunidade:" value={st.atual.salesforce} />
            <Field label="Nº da Cotação:" value={st.atual.codigo} />
            <Field label="Valores:" value={congeladoIntacto && st.snapshot ? `congelados em ${new Date(st.snapshot.congeladoEm).toLocaleDateString("pt-BR")} · câmbio ${st.snapshot.cambio.toLocaleString("pt-BR")}` : "parâmetros atuais"} />
          </div>
          <h2 className="text-center text-xl font-bold mb-4" style={{ color: "#000" }}>Taxas e Impostos</h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
            <Field label="Investimento Total:" value={brl(total)} />
            <Field label={`Investimento a partir de ${REFORMA_VIGENCIA}:`} value={textoPrecoReforma(calcPrecoReforma(parcelasDeLinhas(ok), cbsPerc))} />
            <Field label="Impostos:" value={brl(impostos)} />
            <Field label="Comercial:" value={brl(comercial)} />
            <Field label="Financeiro:" value={brl(financeiro)} />
            <Field label="Retenção:" value={brl(retencao)} />
            <Field label="Custo Zabbix:" value={brl(res.custoTotal)} />
          </div>
          <h2 className="text-center text-xl font-bold mb-4" style={{ color: "#000" }}>Rentabilidade</h2>
          <div className="grid grid-cols-2 mb-10">
            <div className="text-center"><div className="text-3xl font-bold">{brl(res.lucroTotal)}</div><div>Líquido</div></div>
            <div className="text-center"><div className="text-3xl font-bold">{res.rentabilidadePerc.toFixed(2).replace(".", ",")}%</div><div>Percentual</div></div>
          </div>
          <p className="text-[11px] mb-2"><strong>Município de faturamento:</strong> {st.config.municipio || "—"} · <strong>IR/CSLL:</strong> {pct(globais.irpjCsllPerc)} · <strong>Enc. financeiro:</strong> {pct(globais.encFinancPerc)}</p>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th className={head + " text-left"}>Item</th><th className={head + " text-left"}>Subscrição</th>
                <th className={head + " text-right"}>Qtd.</th><th className={head + " text-right"}>Valor Unitário</th><th className={head + " text-right"}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {ok.map((l, i) => {
                const e = l.entrada, f = l.fixos!;
                const info = tax.codes.find((c) => c.codigo === e.codigoProduto);
                const nota: [string, string][] = ([
                  ["Produto", `${e.codigoProduto}${info?.nome && info.nome !== e.codigoProduto ? " — " + info.nome : ""}`],
                  ["PIS", pct(f.pisPerc)], ["COFINS", pct(f.cofinsPerc)], ["ISS", pct(f.issPerc)],
                  ["Lista", e.listaUsd != null ? `USD ${e.listaUsd.toLocaleString("pt-BR")} × ${e.cambio.toLocaleString("pt-BR")} = ${brl(l.listaUnitariaBrl)}` : brl(l.listaUnitariaBrl)],
                  [cen.temRO ? "Desc. RO" : "Desc. sem RO", pct(l.descBasePerc)],
                  ["Pgto 30d", l.descPgtoPerc ? pct(l.descPgtoPerc) : ""],
                  ["Custo unit.", brl(l.custoUnitario)], ["Custo", brl(l.custoLinha)],
                  ["Comissão", pct(l.comissaoPerc)], ["Retenção", pct(f.retencaoPerc)],
                  ["Desconto", l.descontoEfetivoPerc ? pct(l.descontoEfetivoPerc) : ""], ["Rentabilidade", pct(l.rentabilidadePerc)],
                ] as [string, string][]).filter(([, v]) => v);
                return (
                  <Fragment key={e.linhaId}>
                    <tr>
                      <td className={cell}>{i + 1}</td>
                      <td className={cell}>{e.partNumber} — {e.nome}</td>
                      <td className={cell + " text-right"}>{e.quantidade}</td>
                      <td className={cell + " text-right"}>{brl(l.precoFinal / Math.max(1, e.quantidade))}</td>
                      <td className={cell + " text-right font-semibold"}>{brl(l.precoFinal)}</td>
                    </tr>
                    <tr>
                      <td className={cell} />
                      <td className={cell + " text-[9px]"} colSpan={4}>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                          {nota.map(([k, v]) => <span key={k}><strong>{k}:</strong> {v}</span>)}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
              <tr><td className={cell} colSpan={4}><strong>Total</strong></td><td className={cell + " text-right font-bold"}>{brl(total)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
