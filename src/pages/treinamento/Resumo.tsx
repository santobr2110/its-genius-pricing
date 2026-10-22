import { useReformaCBS } from "@/hooks/useReformaCBS";
import { calcPrecoReforma, parcelasDeLinhas, textoPrecoReforma, REFORMA_VIGENCIA } from "@/lib/pricing/reformaTributaria";
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTreinamentoResultado } from "./useTreinamentoResultado";
import selbettiLogo from "@/assets/selbetti-logo.png.asset.json";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const MOD: Record<string, string> = { turma_aberta: "Turma Aberta", in_company: "In Company" };

/** Resumo de Cotação do Treinamento — mesmo formato do Smart ITO, com detalhamento de cálculo e dados fiscais. */
export async function exportarResumoPdf(nomeArquivo: string) {
  const el = document.getElementById("trn-resumo-printable");
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

export default function TreinamentoResumo({ embedded = false }: { embedded?: boolean }) {
  const { st, res, irpj, tax, loading } = useTreinamentoResultado();
  const { can } = useAuth();
  const podeExportar = can("page.trn.proposal");
  const itens = res.linhas.filter((l) => l.curso);
  const _produtos = Array.from(new Set(itens.map((l) => l.codigoProduto ?? ""))).filter(Boolean).map((codigo) => {
    const ls = itens.filter((l) => l.codigoProduto === codigo);
    return { codigo, info: tax.codes.find((c) => c.codigo === codigo), tax: ls[0]?.tax,
      cursos: ls.map((l) => (l.cursoOriginal ?? l.curso!).nome + (l.linha.somenteExame ? " (exame)" : "")) };
  });
  const cb = res.cascataBase;

  const exportar = async () => {
    try { await exportarResumoPdf(`${st.atual.codigo || "resumo-treinamento"}-${new Date().toISOString().slice(0, 10)}.pdf`); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (embedded && (loading || !itens.length)) return null;
  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!itens.length) return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Nenhum item na cotação</h2>
      <p className="text-muted-foreground text-sm">Adicione cursos no <Link to="/observabilidade/treinamento" className="text-primary hover:underline">Configurador</Link>.</p>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex gap-2 text-sm"><span className="font-bold whitespace-nowrap" style={{ color: "#000" }}>{label}</span><span style={{ color: "#000" }}>{value || "—"}</span></div>
  );
  const mods = Array.from(new Set(itens.map((l) => MOD[l.linha.modalidade])));
  const modalidade = itens.every((l) => l.linha.somenteExame) ? "Somente exame" : mods.length > 1 ? "Misto (" + mods.join(" e ") + ")" : mods[0];
  const total = res.precoFinalTotal;
  const cbsPerc = cbsReforma;
  const impostos = itens.reduce((a, l) => a + l.precoFinal * (((l.tax?.pisPerc ?? 0) + (l.tax?.cofinsPerc ?? 0) + (l.tax?.issPerc ?? 0) + irpj) / 100), 0);
  const comercial = itens.reduce((a, l) => a + l.precoFinal * ((l.comissaoPerc ?? 0) / 100), 0);
  const retencao = itens.reduce((a, l) => a + l.precoFinal * ((l.retencaoPerc ?? 0) / 100), 0);
  const financeiro = total * ((cb.encFinancPerc ?? 0) / 100);
  const liquido = itens.reduce((a, l) => a + (l.lucro ?? 0), 0);
  const liquidoPerc = total > 0 ? (liquido / total) * 100 : 0;
  const dataEmissao = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const cell = "border border-slate-300 px-2 py-1.5";
  const head = "border border-slate-300 px-2 py-2 font-bold whitespace-nowrap";

  return (
    <div className="space-y-4">
      <div className={embedded ? "hidden" : "flex items-center gap-2"}>
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Resumo de Cotação</h2>
        <Button size="sm" className="ml-auto gap-1.5 text-xs" onClick={exportar} disabled={!podeExportar}><FileDown className="h-3.5 w-3.5" /> Exportar PDF</Button>
      </div>
      <div className="overflow-x-auto">
        <div id="trn-resumo-printable" className="bg-white rounded-md shadow-sm p-10 mx-auto" style={{ width: "210mm", color: "#000" }}>
          <div className="flex items-start justify-between mb-8">
            <img src={selbettiLogo.url} alt="Selbetti" style={{ height: 48, width: "auto" }} crossOrigin="anonymous" />
            <div className="text-3xl font-bold" style={{ color: "#000" }}>Resumo de Cotação</div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
            <Field label="Cliente:" value={st.atual.cliente} />
            <Field label="Gerente de Contas:" value={st.atual.gerenteConta} />
            <Field label="Data:" value={dataEmissao} />
            <Field label="Especialista:" value={st.atual.especialistaBU} />
            <Field label="Modalidade:" value={modalidade} />
            <Field label="Arquiteto:" value={st.atual.arquitetoBU} />
            <Field label="Nº da Oportunidade:" value={st.atual.salesforce} />
            <Field label="Nº da Cotação:" value={st.atual.codigo} />
          </div>

          <h2 className="text-center text-xl font-bold mb-4" style={{ color: "#000" }}>Taxas e Impostos</h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
            <Field label="Investimento Total:" value={brl(total)} />
            <Field label={`Investimento a partir de ${REFORMA_VIGENCIA}:`} value={textoPrecoReforma(calcPrecoReforma(parcelasDeLinhas(itens), cbsPerc))} />
            <Field label="Impostos:" value={brl(impostos)} />
            <Field label="Comercial:" value={brl(comercial)} />
            <Field label="Financeiro:" value={brl(financeiro)} />
            <Field label="Retenção:" value={brl(retencao)} />
            <Field label="Custo de execução:" value={brl(res.custoTotal)} />
          </div>

          <h2 className="text-center text-xl font-bold mb-4" style={{ color: "#000" }}>Rentabilidade</h2>
          <div className="grid grid-cols-2 mb-10">
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: "#000" }}>{brl(liquido)}</div>
              <div className="text-base" style={{ color: "#000" }}>Líquido</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: "#000" }}>{liquidoPerc.toFixed(2).replace(".", ",")}%</div>
              <div className="text-base" style={{ color: "#000" }}>Percentual</div>
            </div>
          </div>

          <p className="text-[11px] mb-2" style={{ color: "#000" }}>
            <strong>Município de faturamento:</strong> {st.config.municipio || "—"} · <strong>IR/CSLL:</strong> {pct(irpj)} · <strong>Enc. financeiro:</strong> {pct(cb.encFinancPerc)}
          </p>
          <table className="w-full text-[10px] border-collapse" style={{ color: "#000" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th className={head + " text-left"}>Item</th>
                <th className={head + " text-left"}>Curso</th>
                <th className={head + " text-left"}>Modalidade</th>
                <th className={head + " text-right"}>Alunos</th>
                <th className={head + " text-right"}>Horas</th>
                <th className={head + " text-right"}>Valor por Aluno</th>
                <th className={head + " text-right"}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((l, i) => {
                const cur = l.cursoOriginal ?? l.curso!;
                const info = tax.codes.find((c) => c.codigo === l.codigoProduto);
                const dt = l.custo.detalhe;
                const nota: [string, string][] = ([
                  ["Produto", `${l.codigoProduto ?? "—"}${info?.nome ? " — " + info.nome : ""}`],
                  ["PIS", pct(l.tax?.pisPerc ?? 0)], ["COFINS", pct(l.tax?.cofinsPerc ?? 0)], ["ISS", pct(l.tax?.issPerc ?? 0)],
                  ["Instrutor", dt.instrutor ? brl(dt.instrutor) : ""], ["Gestão", dt.gestao ? brl(dt.gestao) : ""],
                  ["Locação", dt.locacao ? brl(dt.locacao) : ""], ["Material/Nuvem", dt.materialCloud ? brl(dt.materialCloud) : ""],
                  ["Comissão", pct(l.comissaoPerc)], ["Retenção", pct(l.retencaoPerc ?? 0)], ["Desconto", l.descontoEfetivoPerc ? pct(l.descontoEfetivoPerc) : ""],
                  ["Rentabilidade", pct(l.rentabilidadePerc)],
                ] as [string, string][]).filter(([, v]) => v);
                return (
                  <Fragment key={l.linha.id}>
                    <tr>
                      <td className={cell}>{i + 1}</td>
                      <td className={cell}>{cur.nome}{l.linha.somenteExame ? " (exame)" : ""}</td>
                      <td className={cell}>{l.linha.somenteExame ? "Exame" : MOD[l.linha.modalidade]}</td>
                      <td className={cell + " text-right"}>{l.linha.alunos}</td>
                      <td className={cell + " text-right"}>{l.linha.somenteExame ? 0 : (cur.horas_execucao ?? 0).toLocaleString("pt-BR")}</td>
                      <td className={cell + " text-right"}>{brl(l.precoFinalPorAluno)}</td>
                      <td className={cell + " text-right"}>{brl(l.precoFinal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={7} className={cell + " text-[11px]"} style={{ color: "#000" }}>
                        <div className="font-semibold mb-1">Composição — {cur.nome}</div>
                        <div className="text-[10px]" style={{ lineHeight: 1.6 }}>
                          <div className="mb-1"><span className="font-semibold mr-1">{nota[0][0]}:</span><span>{nota[0][1]}</span></div>
                          <div className="grid grid-cols-3 gap-x-4">
                            {nota.slice(1).map(([k, v]) => (
                              <div key={k}><span className="font-semibold mr-1">{k}:</span><span>{v}</span></div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <td colSpan={6} className="border border-slate-300 px-2 py-2 text-right font-bold">TOTAL (Investimento):</td>
                <td className="border border-slate-300 px-2 py-2 text-right font-bold">{brl(total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-8 text-center text-[10px]" style={{ color: "#000" }}>
            Documento gerado por IT Pricing Hub — {new Date().toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </div>
  );
}
