import { Link } from "react-router-dom";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { useTreinamentoResultado } from "./useTreinamentoResultado";
import selbettiLogo from "@/assets/selbetti-logo.png.asset.json";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const MOD: Record<string, string> = { turma_aberta: "Turma Aberta", in_company: "In Company" };

/** Resumo de Cotação do Treinamento — mesmo formato do Smart ITO, com detalhamento de cálculo e dados fiscais. */
export default function TreinamentoResumo() {
  const { st, res, rates, irpj, loading } = useTreinamentoResultado();
  const tax = useTaxCodes();
  const { can } = useAuth();
  const podeExportar = can("page.trn.proposal");
  const codigo = st.config.codigoProduto || "TRN";
  const produto = tax.codes.find((c) => c.codigo === codigo);
  const itens = res.linhas.filter((l) => l.curso);
  const cb = res.cascataBase;

  const exportar = async () => {
    const el = document.getElementById("trn-resumo-printable");
    if (!el) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      const W = 210, H = 297, h = (canvas.height * W) / canvas.width;
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      let left = h, pos = 0;
      pdf.addImage(img, "JPEG", 0, pos, W, h, undefined, "FAST");
      left -= H;
      while (left > 0) { pos = left - h; pdf.addPage(); pdf.addImage(img, "JPEG", 0, pos, W, h, undefined, "FAST"); left -= H; }
      pdf.save(`${st.atual.codigo || "resumo-treinamento"}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { toast.error((e as Error).message); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!itens.length) return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Nenhum item na cotação</h2>
      <p className="text-muted-foreground text-sm">Adicione cursos no <Link to="/observabilidade/treinamento" className="text-primary hover:underline">Configurador</Link>.</p>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex gap-2 text-sm"><span className="font-bold whitespace-nowrap">{label}</span><span>{value || "—"}</span></div>
  );
  const th = "border px-2 py-1 text-center font-semibold";
  const td = "border px-2 py-1 text-center align-middle";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Resumo de Cotação</h2>
        <Button size="sm" className="ml-auto gap-1.5 text-xs" onClick={exportar} disabled={!podeExportar}><FileDown className="h-3.5 w-3.5" /> Exportar PDF</Button>
      </div>
      <div className="overflow-x-auto">
        <div id="trn-resumo-printable" className="bg-white rounded-md shadow-sm p-10 mx-auto space-y-6" style={{ width: "210mm", minHeight: "297mm", color: "#000" }}>
          <div className="flex items-start justify-between">
            <img src={selbettiLogo.url} alt="Selbetti" style={{ height: 48, width: "auto" }} crossOrigin="anonymous" />
            <div className="text-3xl font-bold">Resumo de Cotação</div>
          </div>

          <section className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Field label="Cliente:" value={st.atual.cliente} />
            <Field label="Código:" value={st.atual.codigo} />
            <Field label="Gerente de Conta:" value={st.atual.gerenteConta} />
            <Field label="Especialista BU:" value={st.atual.especialistaBU} />
            <Field label="Arquiteto BU:" value={st.atual.arquitetoBU} />
            <Field label="Sales Force:" value={st.atual.salesforce} />
            <Field label="Oferta:" value="Treinamento" />
            <Field label="Emissão:" value={new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} />
          </section>

          <section className="space-y-2">
            <h3 className="font-bold border-b pb-1">Produto e tributação</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <Field label="Código Protheus:" value={codigo} />
              <Field label="SKU:" value={produto?.nome} />
              <Field label="Item LC 116:" value={produto?.lc116_item} />
              <Field label="Município:" value={st.config.municipio} />
              {produto?.descricao && <div className="col-span-2"><Field label="Descrição:" value={produto.descricao} /></div>}
            </div>
            <table className="w-full text-xs border-collapse mt-2">
              <thead><tr><th className={th}>PIS</th><th className={th}>COFINS</th><th className={th}>ISS</th><th className={th}>IR/CSLL</th><th className={th}>Enc. financeiro</th><th className={th}>Lucro alvo</th></tr></thead>
              <tbody><tr>
                <td className={td}>{pct(rates?.pisPerc ?? 0)}</td><td className={td}>{pct(rates?.cofinsPerc ?? 0)}</td><td className={td}>{pct(rates?.issPerc ?? 0)}</td>
                <td className={td}>{pct(irpj)}</td><td className={td}>{pct(cb.encFinancPerc)}</td><td className={td}>{pct(cb.lucroPerc)}</td>
              </tr></tbody>
            </table>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold border-b pb-1">Itens</h3>
            <table className="w-full text-xs border-collapse">
              <thead><tr><th className={th}>Curso</th><th className={th}>Modalidade</th><th className={th}>Alunos</th><th className={th}>Custo</th><th className={th}>Desc.</th><th className={th}>Por aluno</th><th className={th}>Total</th><th className={th}>Rent.</th></tr></thead>
              <tbody>
                {itens.map((l) => (
                  <tr key={l.linha.id}>
                    <td className={td}>{(l.cursoOriginal ?? l.curso!).nome}{l.linha.somenteExame ? " (exame)" : ""}</td>
                    <td className={td}>{MOD[l.linha.modalidade]}</td><td className={td}>{l.linha.alunos}</td>
                    <td className={td}>{brl(l.custo.custoTurma)}</td><td className={td}>{pct(l.descontoEfetivoPerc)}</td>
                    <td className={td}>{brl(l.precoFinalPorAluno)}</td><td className={td}>{brl(l.precoFinal)}</td><td className={td}>{pct(l.rentabilidadePerc)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className={td} colSpan={3}>Total</td><td className={td}>{brl(res.custoTotal)}</td><td className={td} />
                  <td className={td} /><td className={td}>{brl(res.precoFinalTotal)}</td><td className={td}>{pct(res.rentabilidadePerc)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold border-b pb-1">Detalhamento do cálculo</h3>
            {itens.map((l) => {
              const p = l.preco?.cascata;
              const d = l.custo.detalhe;
              return (
                <div key={l.linha.id} className="border rounded p-3 space-y-2" style={{ breakInside: "avoid" }}>
                  <p className="font-semibold text-sm">{(l.cursoOriginal ?? l.curso!).nome} · {MOD[l.linha.modalidade]} · {l.linha.alunos} aluno(s)</p>
                  <table className="w-full text-xs border-collapse">
                    <thead><tr><th className={th}>Instrutor</th><th className={th}>Gestão</th><th className={th}>Locação</th><th className={th}>Material/Cloud</th><th className={th}>Custo da turma</th><th className={th}>Comissão</th></tr></thead>
                    <tbody><tr>
                      <td className={td}>{brl(d.instrutor)}</td><td className={td}>{brl(d.gestao)}</td><td className={td}>{brl(d.locacao)}</td>
                      <td className={td}>{brl(d.materialCloud)}</td><td className={td}>{brl(l.custo.custoTurma)}</td><td className={td}>{pct(l.comissaoPerc)}</td>
                    </tr></tbody>
                  </table>
                  {p && (
                    <table className="w-full text-xs border-collapse">
                      <thead><tr><th className={th}>Preço tabela</th><th className={th}>PIS</th><th className={th}>COFINS</th><th className={th}>ISS</th><th className={th}>Comissão</th><th className={th}>IR/CSLL</th><th className={th}>Lucro</th><th className={th}>Σ%</th></tr></thead>
                      <tbody><tr>
                        <td className={td}>{brl(p.precoVenda)}</td><td className={td}>{brl(p.pis)}</td><td className={td}>{brl(p.cofins)}</td><td className={td}>{brl(p.iss)}</td>
                        <td className={td}>{brl(p.comissao)}</td><td className={td}>{brl(p.irpjCsll)}</td><td className={td}>{brl(p.lucro)}</td><td className={td}>{pct(p.totalEncargosPerc)}</td>
                      </tr></tbody>
                    </table>
                  )}
                  <p className="text-[11px]">Valores da turma. Preço final após desconto: {brl(l.precoFinal)} ({brl(l.precoFinalPorAluno)} por aluno) · lucro {brl(l.lucro)}.</p>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
