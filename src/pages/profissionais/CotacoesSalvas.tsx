import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCotacoes, Cotacao } from "@/hooks/useCotacoes";
import { formatBRL } from "@/lib/profissionais/calc";
import { downloadFile, gerarPropostaTxt } from "@/lib/profissionais/exportProposta";
import { Download, Trash2, Copy as CopyIcon, FolderOpen, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function extra(c: Cotacao, key: string): string {
  const v = (c.extras as Record<string, unknown> | null | undefined)?.[key];
  return typeof v === "string" ? v : "";
}

export default function CotacoesSalvas() {
  const { cotacoes, loading, softDelete } = useCotacoes();
  const [searchParams, setSearchParams] = useSearchParams();
  const [detalhe, setDetalhe] = useState<Cotacao | null>(null);
  const [confirmDel, setConfirmDel] = useState<Cotacao | null>(null);

  // Abrir detalhe via ?open=<id>
  useEffect(() => {
    const id = searchParams.get("open");
    if (!id || cotacoes.length === 0) return;
    const found = cotacoes.find((c) => c.id === id);
    if (found) {
      setDetalhe(found);
      const next = new URLSearchParams(searchParams);
      next.delete("open");
      setSearchParams(next, { replace: true });
    }
  }, [cotacoes, searchParams, setSearchParams]);

  function exportarTxt(c: Cotacao) {
    const txt = gerarPropostaTxt(c);
    downloadFile(`proposta-${c.cliente}-${c.id.slice(0, 6)}.txt`, txt);
    navigator.clipboard?.writeText(txt).catch(() => {});
    toast({ title: "Proposta exportada", description: "Arquivo baixado e copiado." });
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <Card className="p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : cotacoes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma precificação salva ainda.</p>
            <p className="text-xs mt-1">Use o botão "Precificações → Salvar" no cabeçalho.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>No. Oportunidade SF</TableHead>
                <TableHead className="hidden md:table-cell">Contrato</TableHead>
                <TableHead className="hidden md:table-cell">Salvo por</TableHead>
                <TableHead className="hidden md:table-cell">Atualizada</TableHead>
                <TableHead className="text-right">Preço Mensal</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotacoes.map((c) => {
                const sf = extra(c, "salesforceCode");
                const contrato = extra(c, "contractTerm");
                const savedBy = extra(c, "savedByName") || extra(c, "savedByEmail");
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-[11px]">{c.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">
                      <button onClick={() => setDetalhe(c)} className="text-left hover:underline">
                        {c.cargo} — {c.nivel}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.cliente || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {sf || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {contrato || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {savedBy || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(c.criado_em)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {Number(c.valor_venda) > 0
                        ? formatBRL(Number(c.valor_venda))
                        : <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => exportarTxt(c)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Exportar</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => exportarTxt(c)}
                          title="Copiar proposta"
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Badge variant="outline" className="ml-1 text-[10px] uppercase">
                          {c.origem === "ia" ? "IA" : "Manual"}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDel(c)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cotação?</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDel?.cliente}" será removida permanentemente da listagem.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmDel) { softDelete(confirmDel.id); toast({ title: "Cotação excluída." }); } setConfirmDel(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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