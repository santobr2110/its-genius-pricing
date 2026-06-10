import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCotacoes, Cotacao } from "@/hooks/useCotacoes";
import { formatBRL, NIVEIS } from "@/lib/profissionais/calc";
import { downloadFile, gerarCsv, gerarPropostaTxt } from "@/lib/profissionais/exportProposta";
import { Download, Eye, Trash2, Copy as CopyIcon, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function diasAteValidade(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function statusBadge(c: Cotacao) {
  const d = diasAteValidade(c.valida_ate);
  if (d < 0) return { label: "Vencida", variant: "destructive" as const };
  if (d <= 7) return { label: `Vence em ${d}d`, variant: "outline" as const };
  return { label: "Válida", variant: "secondary" as const };
}

export default function CotacoesSalvas() {
  const { cotacoes, loading, softDelete } = useCotacoes();
  const [q, setQ] = useState("");
  const [fArea, setFArea] = useState("all");
  const [fNivel, setFNivel] = useState("all");
  const [fOrigem, setFOrigem] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [ordem, setOrdem] = useState("recentes");
  const [detalhe, setDetalhe] = useState<Cotacao | null>(null);

  const areas = useMemo(() => Array.from(new Set(cotacoes.map((c) => c.area))).sort(), [cotacoes]);

  const filtradas = useMemo(() => {
    let arr = [...cotacoes];
    if (q) {
      const lower = q.toLowerCase();
      arr = arr.filter((c) => [c.cliente, c.cargo, c.area, c.nivel].some((v) => v?.toLowerCase().includes(lower)));
    }
    if (fArea !== "all") arr = arr.filter((c) => c.area === fArea);
    if (fNivel !== "all") arr = arr.filter((c) => c.nivel === fNivel);
    if (fOrigem !== "all") arr = arr.filter((c) => c.origem === fOrigem);
    if (fStatus !== "all") {
      arr = arr.filter((c) => {
        const d = diasAteValidade(c.valida_ate);
        if (fStatus === "validas") return d >= 0;
        if (fStatus === "vencidas") return d < 0;
        if (fStatus === "vence_breve") return d >= 0 && d <= 7;
        return true;
      });
    }
    arr.sort((a, b) => {
      if (ordem === "antigas") return +new Date(a.criado_em) - +new Date(b.criado_em);
      if (ordem === "maior") return Number(b.valor_venda) - Number(a.valor_venda);
      if (ordem === "menor") return Number(a.valor_venda) - Number(b.valor_venda);
      return +new Date(b.criado_em) - +new Date(a.criado_em);
    });
    return arr;
  }, [cotacoes, q, fArea, fNivel, fOrigem, fStatus, ordem]);

  const total = cotacoes.length;
  const validas = cotacoes.filter((c) => diasAteValidade(c.valida_ate) >= 0).length;
  const mediaMes = useMemo(() => {
    const agora = new Date();
    const mes = cotacoes.filter((c) => {
      const d = new Date(c.criado_em);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    });
    if (mes.length === 0) return 0;
    return mes.reduce((s, c) => s + Number(c.valor_venda), 0) / mes.length;
  }, [cotacoes]);

  function exportarTxt(c: Cotacao) {
    const txt = gerarPropostaTxt(c);
    downloadFile(`proposta-${c.cliente}-${c.id.slice(0, 6)}.txt`, txt);
    navigator.clipboard?.writeText(txt).catch(() => {});
    toast({ title: "Proposta exportada", description: "Arquivo baixado e copiado." });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Cotações Salvas</h1>
        <p className="text-sm text-muted-foreground">Histórico, consulta e exportação das suas cotações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-xs uppercase text-muted-foreground">Total</div><div className="text-2xl font-bold">{total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs uppercase text-muted-foreground">Válidas</div><div className="text-2xl font-bold">{validas}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs uppercase text-muted-foreground">Valor médio (mês)</div><div className="text-2xl font-bold">{formatBRL(mediaMes)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, cargo, área..." className="pl-8" />
          </div>
          <Select value={fArea} onValueChange={setFArea}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as áreas</SelectItem>{areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fNivel} onValueChange={setFNivel}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Nível" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os níveis</SelectItem>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fOrigem} onValueChange={setFOrigem}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="manual">Manual</SelectItem><SelectItem value="ia">IA</SelectItem></SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="validas">Válidas</SelectItem>
              <SelectItem value="vence_breve">Vence em ≤ 7 dias</SelectItem>
              <SelectItem value="vencidas">Vencidas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ordem} onValueChange={setOrdem}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="antigas">Mais antigas</SelectItem>
              <SelectItem value="maior">Maior valor</SelectItem>
              <SelectItem value="menor">Menor valor</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => downloadFile("cotacoes.csv", gerarCsv(filtradas), "text/csv")}>
            <Download className="h-4 w-4 mr-2" /> Exportar Todas (.csv)
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhuma cotação encontrada.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => {
            const st = statusBadge(c);
            return (
              <Card key={c.id}>
                <CardContent className="pt-6 flex flex-wrap items-center gap-4">
                  <Badge className={c.origem === "ia" ? "bg-purple-500" : "bg-blue-500"}>{c.origem === "ia" ? "IA" : "Manual"}</Badge>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold">{c.cliente}</div>
                    <div className="text-xs text-muted-foreground">{c.cargo} — {c.nivel} — {c.area}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Valor de Venda</div>
                    <div className="font-bold">{formatBRL(Number(c.valor_venda))}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">Validade: {new Date(c.valida_ate).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setDetalhe(c)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => exportarTxt(c)}><CopyIcon className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cotação?</AlertDialogTitle>
                          <AlertDialogDescription>A cotação será marcada como excluída e removida da listagem.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => softDelete(c.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {detalhe && (
            <>
              <SheetHeader><SheetTitle>{detalhe.cliente}</SheetTitle></SheetHeader>
              <div className="space-y-4 mt-4 text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Perfil</div>
                  <div>{detalhe.cargo} — {detalhe.nivel} ({detalhe.area})</div>
                  {detalhe.descricao_cargo && <p className="text-muted-foreground mt-1">{detalhe.descricao_cargo}</p>}
                </div>
                {detalhe.competencias?.length ? (
                  <div className="flex flex-wrap gap-1">{detalhe.competencias.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}</div>
                ) : null}
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Parâmetros</div>
                  <div>Encargos: {detalhe.encargos_pct}% · Overhead: {detalhe.overhead_pct}% · Margem: {detalhe.margem_pct}% · {detalhe.horas_mensais}h/mês</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Valores</div>
                  <div>Custo: {formatBRL(Number(detalhe.custo_total))}</div>
                  <div className="font-bold text-primary">Venda: {formatBRL(Number(detalhe.valor_venda))}</div>
                  <div>Hora: {formatBRL(Number(detalhe.valor_hora))} · Sprint: {formatBRL(Number(detalhe.valor_sprint))}</div>
                </div>
                {detalhe.origem === "ia" && detalhe.ia_justificativa && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Justificativa IA</div>
                    <p>{detalhe.ia_justificativa}</p>
                    <div className="text-xs mt-1">Aderência: {detalhe.ia_indice_aderencia}%</div>
                  </div>
                )}
                {detalhe.observacoes && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Observações</div>
                    <p>{detalhe.observacoes}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Criado em {new Date(detalhe.criado_em).toLocaleString("pt-BR")} · Válida até {new Date(detalhe.valida_ate).toLocaleDateString("pt-BR")}
                </div>
                <Button onClick={() => exportarTxt(detalhe)}><Download className="h-4 w-4 mr-2" /> Exportar esta Proposta</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}