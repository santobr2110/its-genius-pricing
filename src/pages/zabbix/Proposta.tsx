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
import { useZabbixCotacoes } from "@/hooks/useZabbixCotacoes";
import { montarModeloProposta, type EmissaoZBX, type ModeloPropostaZbx } from "@/lib/zabbix/proposta";
import { gerarPropostaZbxDocx } from "@/lib/zabbix/propostaDocx";
import { contarPendencias, nomeArquivoV2 } from "@/lib/zabbix/propostaDocxV2";
import { useZabbixMatriz } from "@/hooks/useZabbixMatriz";
import { useZabbixResultado } from "./useZabbixResultado";
import { ZBX_BASE } from "./useZbxState";
import ZbxResumo, { exportarResumoZbxPdf } from "./Resumo";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
interface Dados { contato: string; email: string; validadeDias: number | null; prazoPagamento: string; observacoes: string }
const PADRAO: Dados = { contato: "", email: "", validadeDias: null, prazoPagamento: "", observacoes: "" };

function baixar(blob: Blob, nome: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function ZbxProposta() {
  const { cad, st, res, params, congeladoIntacto, loading } = useZabbixResultado();
  const cot = useZabbixCotacoes();
  const matriz = useZabbixMatriz();
  const { can } = useAuth();
  const pode = can("page.zbx.proposal");
  const [dados, setDados] = usePersistentState<Dados>("observabilidade.zabbix.proposta", PADRAO);
  const d = { ...PADRAO, ...dados };
  const validadeDias = d.validadeDias ?? params.validadeDias;
  const [emitindo, setEmitindo] = useState(false);
  const [verResumo, setVerResumo] = useState(false);
  const [verWord, setVerWord] = useState<Blob | null>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const salvo = cot.lista.find((c) => c.id === st.atual.id);
  const emissoes = ((salvo?.payload as unknown as { emissoes?: EmissaoZBX[] })?.emissoes) ?? [];
  const hojeISO = new Date().toISOString().slice(0, 10);

  const modelo = useMemo(() => montarModeloProposta({
    res, contents: cad.contents, params: cad.params, cliente: st.atual.cliente, contato: d.contato, email: d.email,
    consultor: st.atual.especialistaBU ?? "", codigo: st.atual.codigo, versao: emissoes.length || null,
    hojeISO, validadeDias, prazoPagamento: d.prazoPagamento, observacoesExtra: d.observacoes,
    niveis: Object.fromEntries(cad.subs.map((s) => [s.id, s.nivel])), matriz: matriz.linhas, salesforce: st.atual.salesforce ?? null,
  }), [res, cad.contents, cad.params, cad.subs, matriz.linhas, st.atual, d.contato, d.email, d.prazoPagamento, d.observacoes, emissoes.length, hojeISO, validadeDias]);

  const [abrirWord, setAbrirWord] = useState(false);
  const [wordUrl, setWordUrl] = useState<string | null>(null);
  const [modoSimples, setModoSimples] = useState(false);
  const visualizarWord = async (m: ModeloPropostaZbx) => {
    try {
      setWordUrl(null); setVerWord(null); setModoSimples(false); setAbrirWord(true);
      const blob = await gerarPropostaZbxDocx(m);
      setVerWord(blob);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const path = `${u.user.id}/proposta-zbx-${Date.now()}.docx`;
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

  // PDF de uma emissão antiga: renderiza o modelo congelado fora da tela e exporta.

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!modelo.itens.length) return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Nenhum item na proposta</h2>
      <p className="text-muted-foreground text-sm">Adicione subscrições no <Link to={ZBX_BASE} className="text-primary hover:underline">Configurador</Link>.</p>
    </div>
  );

  const nomeBase = `Proposta Zabbix - ${st.atual.cliente || "cliente"}${st.atual.codigo ? ` - ${st.atual.codigo}` : ""}`;
  const emitir = async () => {
    if (!salvo) return toast.error("Salve a cotação no Configurador antes de emitir.");
    if (!congeladoIntacto) return toast.error("A cotação mudou desde o último salvamento. Salve no Configurador para congelar os valores antes de emitir.");
    if (res.temErros) return toast.error("Corrija os erros do Configurador antes de emitir.");
    setEmitindo(true);
    try {
      const versao = emissoes.length + 1;
      const em: EmissaoZBX = {
        versao, emitidaEm: new Date().toISOString(), validaAte: modelo.dataValidade, snapshotVersao: st.snapshot?.versao ?? null,
        modelo: { ...modelo, versao }, custoTotal: res.custoTotal, rentabilidadePerc: res.rentabilidadePerc,
      };
      const { data: atual } = await supabase.from("pricing_presets").select("payload").eq("id", salvo.id).single();
      const payload = { ...((atual?.payload as object) ?? {}), emissoes: [...emissoes, em] };
      const { error } = await supabase.from("pricing_presets").update({ payload: payload as never }).eq("id", salvo.id);
      if (error) throw error;
      await cot.refresh();
      toast.success(`Proposta v${versao} emitida e congelada`);
    } catch (e) { toast.error((e as Error).message); } finally { setEmitindo(false); }
  };

  const nomeWord = (m: ModeloPropostaZbx, fallback: string) => (m.layoutVersao === 2 ? nomeArquivoV2(m) : fallback);
  const word = async (m: ModeloPropostaZbx) => { try { return await gerarPropostaZbxDocx(m); } catch (e) { toast.error((e as Error).message); return null; } };
  const nPend = contarPendencias(modelo);
  const pend = modelo.blocos.some((b) => b.aConfirmar) || JSON.stringify(modelo).includes("[A CONFIRMAR]");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da proposta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm"><span className="text-muted-foreground">Cliente: </span>{st.atual.cliente || <em>defina no Configurador</em>}</div>
            <div className="text-sm"><span className="text-muted-foreground">Consultor: </span>{st.atual.especialistaBU || <em>defina no Configurador</em>}</div>
            <div><Label>Contato (destinatário)</Label><Input value={d.contato} onChange={(e) => setDados({ ...d, contato: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input value={d.email} onChange={(e) => setDados({ ...d, email: e.target.value })} /></div>
            <div><Label>Validade (dias)</Label><Input type="number" min={1} value={validadeDias} onChange={(e) => setDados({ ...d, validadeDias: Math.max(1, Number(e.target.value) || 1) })} /></div>
            <div><Label>Prazo de pagamento</Label><Textarea rows={2} value={d.prazoPagamento} placeholder={String(cad.params.find((p) => p.key === "proposta_prazo_pagamento")?.value ?? "")} onChange={(e) => setDados({ ...d, prazoPagamento: e.target.value })} /></div>
            <div><Label>Observações específicas</Label><Textarea rows={3} value={d.observacoes} onChange={(e) => setDados({ ...d, observacoes: e.target.value })} /></div>
            {!congeladoIntacto && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Os valores não estão congelados. Salve a cotação no Configurador antes de emitir.</p>}
            {pend && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Há textos marcados [A CONFIRMAR]. Preencha em Configurações › Conteúdo e Parâmetros.</p>}
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={emitir} disabled={emitindo || !pode}>{emitindo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Stamp className="h-4 w-4 mr-2" />}Emitir (congelar proposta)</Button>
              {nPend > 0 && <p className="text-xs rounded border border-amber-500/50 bg-amber-500/10 p-2">Há {nPend} campo(s) a confirmar (destacados em amarelo no Word).</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={!pode} onClick={async () => { const b = await word(modelo); if (b) baixar(b, nomeWord(modelo, `${nomeBase}.docx`)); }}><FileDown className="h-4 w-4 mr-2" />Baixar Word</Button>
                <Button variant="outline" size="icon" title="Visualizar Word" aria-label="Visualizar Word" onClick={() => visualizarWord(modelo)}><Eye className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={!pode} onClick={() => { setVerResumo(true); setTimeout(() => exportarResumoZbxPdf(`${st.atual.codigo || "resumo-zabbix"}.pdf`).catch((e) => toast.error(e.message)).finally(() => setVerResumo(false)), 400); }}><FileDown className="h-4 w-4 mr-2" />Baixar Cotação/ROI</Button>
                <Button variant="outline" size="icon" title="Visualizar Cotação/ROI" onClick={() => setVerResumo(true)}><Eye className="h-4 w-4" /></Button>
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
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => { const b = await word(em.modelo); if (b) baixar(b, nomeWord(em.modelo, `Proposta Zabbix - ${em.modelo.cliente} - v${em.versao}.docx`)); }}>Word</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Documento A4 fora da tela: usado só para gerar o PDF. */}
      <div className="rounded-lg border bg-card text-card-foreground p-8 space-y-6">
        <header className="flex justify-between items-start border-b pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Proposta comercial · Subscrições Zabbix</p>
            <h1 className="text-2xl font-bold">{st.atual.cliente || "Cliente"}</h1>
            {d.contato && <p className="text-sm">A/C {d.contato}{d.email ? ` · ${d.email}` : ""}</p>}
          </div>
          <div className="text-right text-sm">
            {st.atual.codigo && <p className="font-mono">{st.atual.codigo}{emissoes.length ? ` · v${emissoes.length}` : ""}</p>}
            <p>Emissão: {new Date(modelo.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR")}</p>
            <p>Validade: {new Date(modelo.dataValidade + "T12:00:00").toLocaleDateString("pt-BR")}</p>
          </div>
        </header>

        <section className="space-y-5">
          <h2 className="text-lg font-semibold">Subscrições</h2>
          {modelo.blocos.map((b) => (
            <article key={b.partNumber} className="space-y-3 rounded-lg border bg-muted/20 p-4 break-inside-avoid">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold">{b.titulo}</h3>
                <Badge variant="secondary">{b.partNumber}</Badge>
                {b.aConfirmar && <Badge variant="outline" className="text-[10px]">A CONFIRMAR</Badge>}
              </div>
              {b.tagline && <p className="text-sm italic whitespace-pre-line">{b.tagline}</p>}
              <dl className="grid gap-2 text-sm">
                {b.campos.filter((c) => c.texto !== "[A CONFIRMAR]").map((c) => (
                  <div key={c.label} className="rounded-md border border-border/60 px-3 py-2 break-inside-avoid">
                    <dt className="text-xs font-semibold">{c.label}</dt>
                    <dd className="whitespace-pre-line leading-relaxed break-words text-foreground/90">{c.texto}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>

        <section className="space-y-2 rounded-lg border bg-muted/20 p-4 break-inside-avoid">
          <h2 className="text-lg font-semibold">Investimento</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">Item</th><th className="text-right">Qtd.</th><th className="text-right">Unitário</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {modelo.itens.map((i) => (
                <tr key={i.descricao} className="border-b">
                  <td className="py-1">{i.descricao}</td><td className="text-right">{i.quantidade}</td>
                  <td className="text-right">{brl(i.unitario)}</td><td className="text-right">{brl(i.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3} className="py-1 font-semibold text-right">Total</td><td className="text-right font-bold">{brl(modelo.total)}</td></tr></tfoot>
          </table>
        </section>

        {modelo.observacoes && (
          <section className="space-y-1">
            <h2 className="text-lg font-semibold">Observações</h2>
            <p className="text-sm whitespace-pre-line">{modelo.observacoes}</p>
          </section>
        )}
      </div>

      <Dialog open={verResumo} onOpenChange={setVerResumo}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cotação/ROI</DialogTitle></DialogHeader>
          <ZbxResumo embedded />
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
