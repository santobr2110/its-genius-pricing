import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Eye, FileDown, FileText, Loader2, Stamp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useAuth } from "@/contexts/AuthContext";
import { useTreinamentoCotacoes } from "@/hooks/useTreinamentoCotacoes";
import { useTreinamentoResultado } from "./useTreinamentoResultado";
import TreinamentoResumo, { exportarResumoPdf } from "./Resumo";
import { gerarPropostaDocx } from "@/lib/treinamento/propostaDocx";
import type { TrainingCourseContent } from "@/lib/treinamento/types";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
const MOD: Record<string, string> = { turma_aberta: "Turma Aberta", in_company: "In Company" };

interface DadosProposta { contato: string; email: string; validadeDias: number; condicoesPagamento: string; observacoes: string }
const DADOS_PADRAO: DadosProposta = { contato: "", email: "", validadeDias: 15, condicoesPagamento: "30 dias após a emissão da nota fiscal.", observacoes: "" };

export interface EmissaoTRN {
  versao: number; emitidaEm: string; validaAte: string; cliente: string; contato: string; email: string;
  condicoesPagamento: string; observacoes: string;
  itens: { curso: string; modalidade: string; alunos: number; precoPorAluno: number; total: number; somenteExame: boolean }[];
  total: number; custoTotal: number; rentabilidadePerc: number;
}

export default function TreinamentoProposta() {
  const { cad, st, res, loading } = useTreinamentoResultado();
  const cot = useTreinamentoCotacoes();
  const { can } = useAuth();
  const podeEmitir = can("page.trn.proposal");
  const [dados, setDados] = usePersistentState<DadosProposta>("observabilidade.treinamento.proposta", DADOS_PADRAO);
  const d = { ...DADOS_PADRAO, ...dados };
  const [verResumo, setVerResumo] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const salvo = cot.lista.find((c) => c.id === st.atual.id);
  const emissoes = ((salvo?.payload as unknown as { emissoes?: EmissaoTRN[] })?.emissoes) ?? [];

  const obsParam = String(cad.params.find((x) => x.key === "observacoes_proposta")?.value ?? "").trim();
  const obsFinal = [d.observacoes.trim(), obsParam].filter(Boolean).join("\n\n");
  const contentById = useMemo(() => new Map(cad.contents.map((c) => [c.course_id, c])), [cad.contents]);
  const itens = res.linhas.filter((l) => l.curso);
  const hojeISO = new Date().toISOString().slice(0, 10);
  const validaAte = new Date(Date.now() + d.validadeDias * 86400000).toISOString().slice(0, 10);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!itens.length) return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Nenhum item na proposta</h2>
      <p className="text-muted-foreground text-sm">Adicione cursos no <Link to="/observabilidade/treinamento" className="text-primary hover:underline">Configurador</Link>.</p>
    </div>
  );

  const emitir = async () => {
    if (!salvo) { toast.error("Salve a cotação no Configurador antes de emitir."); return; }
    if (res.temErros) { toast.error("Corrija os erros do Configurador antes de emitir."); return; }
    if (!st.atual.cliente.trim()) { toast.error("Informe o cliente no Configurador."); return; }
    setEmitindo(true);
    try {
      const em: EmissaoTRN = {
        versao: emissoes.length + 1, emitidaEm: new Date().toISOString(), validaAte, cliente: st.atual.cliente,
        contato: d.contato, email: d.email, condicoesPagamento: d.condicoesPagamento, observacoes: obsFinal,
        itens: itens.map((l) => ({ curso: l.cursoOriginal?.nome ?? l.curso!.nome, modalidade: l.linha.modalidade, alunos: l.linha.alunos, precoPorAluno: l.precoFinalPorAluno, total: l.precoFinal, somenteExame: l.linha.somenteExame })),
        total: res.precoFinalTotal, custoTotal: res.custoTotal, rentabilidadePerc: res.rentabilidadePerc,
      };
      const payload = { ...(salvo.payload as object), linhas: st.linhas, config: st.config, emissoes: [...emissoes, em] };
      const { error } = await supabase.from("pricing_presets").update({ payload: payload as never }).eq("id", salvo.id);
      if (error) throw error;
      await cot.refresh();
      toast.success(`Proposta v${em.versao} emitida e congelada`);
    } catch (e) { toast.error((e as Error).message); } finally { setEmitindo(false); }
  };

  const gerarWord = () => gerarPropostaDocx({
        cliente: st.atual.cliente, contato: d.contato, email: d.email, codigo: st.atual.codigo, versao: emissoes.length || null,
        especialista: st.atual.especialistaBU,
        emissao: dataBR(hojeISO), validade: dataBR(validaAte), validadeDias: d.validadeDias,
        condicoesPagamento: d.condicoesPagamento, observacoes: obsFinal, total: res.precoFinalTotal,
        itens: itens.map((l) => {
          const curso = l.cursoOriginal ?? l.curso!;
          return { curso, conteudo: contentById.get(curso.id), modalidade: MOD[l.linha.modalidade] ?? l.linha.modalidade, alunos: l.linha.alunos, somenteExame: l.linha.somenteExame, precoPorAluno: l.precoFinalPorAluno, total: l.precoFinal };
        }),
      });
  const baixarWord = async () => {
    try {
      const blob = await gerarWord();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Proposta Treinamento - ${st.atual.cliente || "cliente"}${st.atual.codigo ? ` - ${st.atual.codigo}` : ""}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { toast.error((e as Error).message); }
  };
  const [verWord, setVerWord] = useState(false);
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const abrirWord = async () => {
    try { setWordBlob(null); setVerWord(true); setWordBlob(await gerarWord()); }
    catch (e) { setVerWord(false); toast.error((e as Error).message); }
  };
  useEffect(() => {
    if (!verWord || !wordBlob) return;
    const t = setTimeout(async () => {
      if (!wordRef.current) return;
      const { renderAsync } = await import("docx-preview");
      wordRef.current.innerHTML = "";
      await renderAsync(wordBlob, wordRef.current, undefined, { inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: true });
    }, 0);
    return () => clearTimeout(t);
  }, [verWord, wordBlob]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 print:hidden">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da proposta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm"><span className="text-muted-foreground">Cliente: </span>{st.atual.cliente || <em>defina no Configurador</em>}</div>
            <div><Label>Contato</Label><Input value={d.contato} onChange={(e) => setDados({ ...d, contato: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={d.email} onChange={(e) => setDados({ ...d, email: e.target.value })} /></div>
            <div><Label>Validade (dias)</Label><Input type="number" min={1} value={d.validadeDias} onChange={(e) => setDados({ ...d, validadeDias: Math.max(1, Number(e.target.value) || 1) })} /></div>
            <div><Label>Condições de pagamento</Label><Textarea rows={2} value={d.condicoesPagamento} onChange={(e) => setDados({ ...d, condicoesPagamento: e.target.value })} /></div>
            <div><Label>Observações específicas</Label><Textarea rows={3} value={d.observacoes} onChange={(e) => setDados({ ...d, observacoes: e.target.value })} /></div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={emitir} disabled={emitindo || !podeEmitir}>{emitindo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Stamp className="h-4 w-4 mr-2" />}Emitir (congelar valores)</Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={baixarWord} disabled={!podeEmitir}><FileDown className="h-4 w-4 mr-2" />Baixar Word</Button>
                <Button variant="outline" size="icon" title="Visualizar Word" aria-label="Visualizar Word" onClick={abrirWord}><Eye className="h-4 w-4" /></Button>
              </div>
              <Dialog open={verWord} onOpenChange={setVerWord}>
                <DialogContent className="max-w-[calc(210mm+6rem)] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Proposta (Word)</DialogTitle></DialogHeader>
                  {!wordBlob && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                  <div ref={wordRef} className="rounded-md overflow-x-auto" />
                </DialogContent>
              </Dialog>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={async () => {
                  try { await exportarResumoPdf(`Cotacao ROI - ${st.atual.cliente || "cliente"}${st.atual.codigo ? ` - ${st.atual.codigo}` : ""}.pdf`); }
                  catch (e) { toast.error((e as Error).message); }
                }} disabled={!podeEmitir}><FileDown className="h-4 w-4 mr-2" />Baixar Cotação/ROI</Button>
                <Button variant="outline" size="icon" title="Visualizar Cotação/ROI" aria-label="Visualizar Cotação/ROI" onClick={() => setVerResumo(true)}><Eye className="h-4 w-4" /></Button>
              </div>
              <Dialog open={verResumo} onOpenChange={setVerResumo}>
                <DialogContent className="max-w-[calc(210mm+4rem)] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Cotação/ROI</DialogTitle></DialogHeader>
                  <div className="bg-muted p-2 rounded-md"><TreinamentoResumo embedded /></div>
                </DialogContent>
              </Dialog>
            </div>
            {!salvo && <p className="text-xs text-muted-foreground">Salve a cotação no Configurador para poder emitir.</p>}
          </CardContent>
        </Card>
        {emissoes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Versões emitidas</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[...emissoes].reverse().map((e) => (
                <div key={e.versao} className="flex justify-between border-b pb-1">
                  <span>v{e.versao} · {new Date(e.emitidaEm).toLocaleString("pt-BR")}</span>
                  <span className="font-medium">{brl(e.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div aria-hidden style={{ position: "fixed", left: -20000, top: 0 }}><TreinamentoResumo embedded /></div>
      <div className="trn-print rounded-lg border bg-card text-card-foreground p-8 space-y-6">
        <header className="flex justify-between items-start border-b pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Proposta comercial · Treinamento</p>
            <h1 className="text-2xl font-bold">{st.atual.cliente || "Cliente"}</h1>
            {d.contato && <p className="text-sm">A/C {d.contato}{d.email ? ` · ${d.email}` : ""}</p>}
          </div>
          <div className="text-right text-sm">
            {st.atual.codigo && <p className="font-mono">{st.atual.codigo}{emissoes.length ? ` · v${emissoes.length}` : ""}</p>}
            <p>Emissão: {dataBR(hojeISO)}</p>
            <p>Validade: {dataBR(validaAte)}</p>
          </div>
        </header>

        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Cursos</h2>
          {itens.map((l) => {
            const curso = l.cursoOriginal ?? l.curso!;
            const ct: TrainingCourseContent | undefined = contentById.get(curso.id);
            return (
              <article key={l.linha.id} className="space-y-3 rounded-lg border bg-muted/20 p-4 break-inside-avoid">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-semibold">{curso.nome}{l.linha.somenteExame ? " — somente exame" : ""}</h3>
                  <Badge variant="secondary">{MOD[l.linha.modalidade] ?? l.linha.modalidade}</Badge>
                  <span className="text-xs text-muted-foreground">{curso.horas_execucao}h{curso.dias ? ` · ${curso.dias} dia(s)` : ""}</span>
                </div>
                {ct?.tagline && <p className="text-sm italic whitespace-pre-line">{ct.tagline}</p>}
                {ct?.descricao && <p className="text-sm whitespace-pre-line leading-relaxed">{ct.descricao}</p>}
                <dl className="grid gap-2 text-sm">
                  {([
                    ["Público-alvo", ct?.publico_alvo], ["Pré-requisito", ct?.pre_requisito], ["Formato", ct?.formato],
                    ["Horário", ct?.horario], ["Entregável", ct?.entregavel], ["Exame", ct?.exame_descricao],
                  ] as [string, string | null | undefined][]).filter(([, v]) => v && v.trim()).map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border/60 px-3 py-2 break-inside-avoid">
                      <dt className="text-xs font-semibold">{k}</dt>
                      <dd className="whitespace-pre-line leading-relaxed break-words text-foreground/90">{v}</dd>
                    </div>
                  ))}
                </dl>
                {!!ct?.cronograma?.length && (
                  <div className="text-sm space-y-1 rounded-md border border-border/60 px-3 py-2">
                    <p className="text-xs font-semibold">Conteúdo programático</p>
                    <ol className="list-decimal ml-5 space-y-1.5 leading-relaxed">
                      {ct.cronograma.map((m, i) => (
                        <li key={i}>
                          <span className="font-medium">{m.titulo}</span>
                          {!!m.topicos?.length && <ul className="list-disc ml-5 mt-0.5 text-foreground/90">{m.topicos.map((t, j) => <li key={j}>{t}</li>)}</ul>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section className="space-y-2 rounded-lg border bg-muted/20 p-4 break-inside-avoid">
          <h2 className="text-lg font-semibold">Investimento</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">Item</th><th>Modalidade</th><th className="text-right">Alunos</th><th className="text-right">Por aluno</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {itens.map((l) => (
                <tr key={l.linha.id} className="border-b">
                  <td className="py-1">{(l.cursoOriginal ?? l.curso!).nome}{l.linha.somenteExame ? " (exame)" : ""}</td>
                  <td>{MOD[l.linha.modalidade]}</td>
                  <td className="text-right">{l.linha.alunos}</td>
                  <td className="text-right">{brl(l.precoFinalPorAluno)}</td>
                  <td className="text-right">{brl(l.precoFinal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4} className="py-2 text-right font-semibold">Total</td><td className="text-right font-bold">{brl(res.precoFinalTotal)}</td></tr></tfoot>
          </table>
          <p className="text-xs text-muted-foreground">Valores com impostos inclusos.</p>
        </section>

        <section className="text-sm space-y-1 rounded-lg border bg-muted/20 p-4 break-inside-avoid">
          <h2 className="text-lg font-semibold">Condições</h2>
          <p><b>Pagamento:</b> {d.condicoesPagamento}</p>
          <p><b>Validade da proposta:</b> {d.validadeDias} dias ({dataBR(validaAte)}).</p>
          {obsFinal && <div className="pt-1"><p className="font-semibold">Observações</p><p className="whitespace-pre-wrap leading-relaxed">{obsFinal}</p></div>}
        </section>
      </div>
    </div>
  );
}
