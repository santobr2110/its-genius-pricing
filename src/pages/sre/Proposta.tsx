import { useReformaCBS } from "@/hooks/useReformaCBS";
import { calcPrecoReforma, fraseReforma, parcelasDeLinhas } from "@/lib/pricing/reformaTributaria";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, FileDown, FileText, Loader2, Stamp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useAuth } from "@/contexts/AuthContext";
import { useSreCotacoes } from "@/hooks/useSreCotacoes";
import { contarPendenciasSre, montarModeloPropostaSre, nomeArquivoSre, somarDias, type EmissaoSre, type ModeloPropostaSre } from "@/lib/sre/proposta";
import { gerarPropostaSreDocx } from "@/lib/sre/propostaDocx";
import { useSreResultado } from "./useSreResultado";
import { SRE_BASE } from "./useSreState";
import SreResumo, { exportarResumoSrePdf } from "./Resumo";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
interface Dados { contatoNome: string; email: string; validadeDias: number | null; prazoPagamento: string; observacoes: string }
const PADRAO: Dados = { contatoNome: "", email: "", validadeDias: null, prazoPagamento: "", observacoes: "" };

function baixar(blob: Blob, nome: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function SreProposta() {
  const { cad, st, res, params, congeladoIntacto, loading } = useSreResultado();
  const cot = useSreCotacoes();
  const { can } = useAuth();
  const pode = can("page.sre.proposal");
  const [dados, setDados] = usePersistentState<Dados>("observabilidade.consultivo-sre.proposta", PADRAO);
  const d = { ...PADRAO, ...dados };
  const set = (k: Partial<Dados>) => setDados({ ...d, ...k });
  const [emitindo, setEmitindo] = useState(false);
  const [verResumo, setVerResumo] = useState(false);
  const [verWord, setVerWord] = useState<Blob | null>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const salvo = cot.lista.find((c) => c.id === st.atual.id);
  const emissoes = ((salvo?.payload as unknown as { emissoes?: EmissaoSre[] })?.emissoes) ?? [];
  const hojeISO = new Date().toISOString().slice(0, 10);
  const dataISO = hojeISO;
  const validadeDias = d.validadeDias ?? params.validadeDias;
  const validadeISO = somarDias(dataISO, validadeDias);
  const { cbsPerc: cbsReforma } = useReformaCBS();

  const modelo = useMemo(() => montarModeloPropostaSre({
    res, contents: cad.contents, params: cad.params,
    cliente: { razao: st.atual.cliente, cnpj: "", endereco: "" },
    contato: { nome: d.contatoNome, cargo: "", email: d.email },
    consultor: { nome: st.atual.especialistaBU ?? "", cargo: "" },
    numeroProposta: "", codigo: st.atual.codigo, versao: emissoes.length || null, salesforce: st.atual.salesforce ?? null,
    hojeISO, cidade: "", dataISO, validadeISO, validadeDias, prazoPagamento: d.prazoPagamento, observacoesExtra: d.observacoes,
    fraseReforma: fraseReforma(calcPrecoReforma(parcelasDeLinhas(res.linhas), cbsReforma)),
  }), [res, cad.contents, cad.params, d.contatoNome, d.email, d.prazoPagamento, d.observacoes, st.atual, emissoes.length, hojeISO, dataISO, validadeISO, validadeDias, cbsReforma]);

  const [abrirWord, setAbrirWord] = useState(false);
  const [wordUrl, setWordUrl] = useState<string | null>(null);
  const [modoSimples, setModoSimples] = useState(false);
  const visualizarWord = async (m: ModeloPropostaSre) => {
    try {
      setWordUrl(null); setVerWord(null); setModoSimples(false); setAbrirWord(true);
      const blob = await gerarPropostaSreDocx(m);
      setVerWord(blob);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const path = `${u.user.id}/proposta-sre-${Date.now()}.docx`;
      const up = await supabase.storage.from("trn-previews").upload(path, blob, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true });
      if (up.error) throw up.error;
      const sg = await supabase.storage.from("trn-previews").createSignedUrl(path, 600);
      if (sg.error || !sg.data) throw sg.error ?? new Error("Falha ao gerar link");
      setWordUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(sg.data.signedUrl)}`);
      setTimeout(() => { supabase.storage.from("trn-previews").remove([path]); }, 10 * 60_000);
    } catch (e) { setModoSimples(true); toast.error(`Visualização exata indisponível: ${(e as Error).message}`); }
  };
  useEffect(() => {
    if (!abrirWord || !verWord || !modoSimples) return;
    const t = setTimeout(async () => {
      if (!wordRef.current) return;
      const { renderAsync } = await import("docx-preview");
      wordRef.current.innerHTML = "";
      await renderAsync(verWord, wordRef.current, undefined, { inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: true });
    }, 0);
    return () => clearTimeout(t);
  }, [abrirWord, verWord, modoSimples]);


  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!modelo.itens.length) return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Nenhum pacote na proposta</h2>
      <p className="text-muted-foreground text-sm">Adicione pacotes no <Link to={SRE_BASE} className="text-primary hover:underline">Configurador</Link>.</p>
    </div>
  );

  const emitir = async () => {
    if (!salvo) return toast.error("Salve a cotação no Configurador antes de emitir.");
    if (!congeladoIntacto) return toast.error("A cotação mudou desde o último salvamento. Salve no Configurador para congelar os valores antes de emitir.");
    if (res.temErros) return toast.error("Corrija os erros do Configurador antes de emitir.");
    setEmitindo(true);
    try {
      const versao = emissoes.length + 1;
      const em: EmissaoSre = {
        versao, emitidaEm: new Date().toISOString(), validaAte: modelo.dataValidade, snapshotVersao: st.snapshot?.versao ?? null,
        modelo: { ...modelo, versao }, custoTotal: res.custoTotal, rentabilidadePerc: res.rentabilidadePerc,
      };
      const { data: atual } = await supabase.from("pricing_presets").select("payload").eq("id", salvo.id).single();
      const prev = ((atual?.payload as { emissoes?: EmissaoSre[] } | null)?.emissoes) ?? [];
      const payload = { ...((atual?.payload as object) ?? {}), emissoes: [...prev, em] };
      const { error } = await supabase.from("pricing_presets").update({ payload: payload as never }).eq("id", salvo.id);
      if (error) throw error;
      await cot.refresh();
      toast.success(`Proposta v${versao} emitida e congelada`);
    } catch (e) { toast.error((e as Error).message); } finally { setEmitindo(false); }
  };

  const word = async (m: ModeloPropostaSre) => { try { return await gerarPropostaSreDocx(m); } catch (e) { toast.error((e as Error).message); return null; } };
  const nPend = contarPendenciasSre(modelo);
  const faltaCotacao = [!modelo.consultor.nome && "consultor", !modelo.cliente.razao && "cliente"].filter(Boolean) as string[];
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da proposta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm"><span className="text-muted-foreground">Cliente: </span>{st.atual.cliente || <em>defina no Configurador</em>}</div>
            <div className="text-sm"><span className="text-muted-foreground">Consultor: </span>{st.atual.especialistaBU || <em>defina no Configurador</em>}</div>
            <div><Label>Contato (destinatário)</Label><Input value={d.contatoNome} onChange={(e) => set({ contatoNome: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={d.email} onChange={(e) => set({ email: e.target.value })} /></div>
            <div><Label>Validade (dias)</Label><Input type="number" min={1} value={validadeDias} onChange={(e) => set({ validadeDias: Math.max(1, Number(e.target.value) || 1) })} /></div>
            <div><Label>Prazo de pagamento</Label><Textarea rows={2} value={d.prazoPagamento} placeholder={String(cad.params.find((p) => p.key === "proposta_prazo_pagamento")?.value ?? "")} onChange={(e) => set({ prazoPagamento: e.target.value })} /></div>
            <div><Label>Observações específicas</Label><Textarea rows={3} value={d.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></div>
            {!congeladoIntacto && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Os valores não estão congelados. Salve a cotação no Configurador antes de emitir.</p>}
            {res.temErros && <p className="text-xs rounded border border-destructive/50 bg-destructive/10 p-2">Há erros no Configurador; a emissão está bloqueada.</p>}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={emitir} disabled={emitindo || !pode}>{emitindo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Stamp className="h-4 w-4 mr-2" />}Emitir (congelar proposta)</Button>
              {faltaCotacao.length > 0 && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Preencha na cotação: {faltaCotacao.join(" e ")}.</p>}
              {nPend > 0 && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Há {nPend} campo(s) a confirmar (destacados em amarelo no Word).</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={!pode} onClick={async () => { const b = await word(modelo); if (b) baixar(b, nomeArquivoSre(modelo)); }}><FileDown className="h-4 w-4 mr-2" />Baixar Word</Button>
                <Button variant="outline" size="icon" title="Visualizar Word" aria-label="Visualizar Word" onClick={() => visualizarWord(modelo)}><Eye className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={!pode} onClick={() => { setVerResumo(true); setTimeout(() => exportarResumoSrePdf(`${st.atual.codigo || "resumo-sre"}.pdf`).catch((e) => toast.error(e.message)).finally(() => setVerResumo(false)), 400); }}><FileDown className="h-4 w-4 mr-2" />Baixar Cotação/ROI</Button>
                <Button variant="outline" size="icon" title="Visualizar Cotação/ROI" aria-label="Visualizar Cotação/ROI" onClick={() => setVerResumo(true)}><Eye className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Emissões</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {emissoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma versão emitida ainda.</p>}
            {[...emissoes].reverse().map((em) => (
              <div key={em.versao} className="rounded-md border p-2 text-xs space-y-1">
                <div className="flex items-center justify-between"><Badge variant="secondary">v{em.versao}</Badge><span className="text-muted-foreground">{new Date(em.emitidaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span></div>
                <p>{brl(em.modelo.total)} · válida até {new Date(em.validaAte + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => { const b = await word(em.modelo); if (b) baixar(b, nomeArquivoSre(em.modelo)); }}>Word</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground p-8 space-y-6">
        <header className="flex justify-between items-start border-b pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Proposta comercial · Pacotes Consultivos Zabbix SRE</p>
            <h1 className="text-2xl font-bold">{modelo.cliente.razao || "Cliente"}</h1>
            {modelo.contato.nome && <p className="text-sm">A/C {modelo.contato.nome}{modelo.contato.email ? ` · ${modelo.contato.email}` : ""}</p>}
          </div>
          <div className="text-right text-sm">
            {modelo.numeroProposta && <p className="font-mono">{modelo.numeroProposta}{emissoes.length ? ` · v${emissoes.length}` : ""}</p>}
            <p>Emissão: {new Date(modelo.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR")}</p>
            <p>Validade: {new Date(modelo.dataValidade + "T12:00:00").toLocaleDateString("pt-BR")}</p>
          </div>
        </header>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pacotes</h2>
          {modelo.blocos.map((b) => (
            <article key={b.partNumber} className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold">{b.titulo}</h3>
                <Badge variant="secondary">{b.partNumber}</Badge>
                <span className="text-xs text-muted-foreground">{b.horas} h</span>
                {b.aConfirmar && <Badge variant="outline" className="text-[10px]">A CONFIRMAR</Badge>}
              </div>
              {b.tagline && <p className="text-sm italic">{b.tagline}</p>}
              <dl className="grid gap-2 text-sm">
                {b.campos.filter((c) => c.texto !== "[A CONFIRMAR]").map((c) => (
                  <div key={c.label} className="rounded-md border border-border/60 px-3 py-2">
                    <dt className="text-xs font-semibold">{c.label}</dt>
                    <dd className="whitespace-pre-line break-words text-foreground/90">{c.texto}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>
        <section className="space-y-2 rounded-lg border bg-muted/20 p-4">
          <h2 className="text-lg font-semibold">Investimento</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">Part number</th><th>Descrição</th><th className="text-right">Horas</th><th className="text-right">Qtd.</th><th className="text-right">Valor/hora</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {modelo.itens.map((i, k) => (
                <tr key={k} className="border-b">
                  <td className="py-1 font-mono text-xs">{i.partNumber}</td><td>{i.descricao}</td><td className="text-right">{i.horas}</td><td className="text-right">{i.quantidade}</td>
                  <td className="text-right">{brl(i.valorHora)}</td><td className="text-right">{brl(i.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={5} className="py-1 font-semibold text-right">Total</td><td className="text-right font-bold">{brl(modelo.total)}</td></tr></tfoot>
          </table>
        </section>
        <section className="space-y-1">
          <h2 className="text-lg font-semibold">Condições comerciais</h2>
          <ul className="list-disc pl-5 text-sm">{modelo.condicoes.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
        {modelo.observacoes && (
          <section className="space-y-1"><h2 className="text-lg font-semibold">Observações</h2><p className="text-sm whitespace-pre-line">{modelo.observacoes}</p></section>
        )}
      </div>

      <Dialog open={verResumo} onOpenChange={setVerResumo}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cotação/ROI</DialogTitle></DialogHeader>
          <SreResumo embedded />
        </DialogContent>
      </Dialog>
      <Dialog open={abrirWord} onOpenChange={setAbrirWord}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between gap-2 pr-8">
            <DialogTitle>Proposta (Word)</DialogTitle>
            {verWord && <Button variant="ghost" size="sm" onClick={() => setModoSimples(!modoSimples)}>{modoSimples ? "Visualização exata" : "Visualização rápida"}</Button>}
          </DialogHeader>
          {!modoSimples && !wordUrl && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {!modoSimples && wordUrl && <iframe title="Proposta" src={wordUrl} className="flex-1 w-full rounded-md border" />}
          {modoSimples && <div ref={wordRef} className="flex-1 overflow-auto rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
