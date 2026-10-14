import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTreinamentoCotacoes } from "@/hooks/useTreinamentoCotacoes";
import { useCarrinhoState } from "./useCarrinhoState";
import { CONFIG_PADRAO } from "@/lib/treinamento/carrinho";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function TreinamentoCotacoes() {
  const { lista, loading, excluir } = useTreinamentoCotacoes();
  const { setLinhas, setConfig, setAtual, atual } = useCarrinhoState();
  const navigate = useNavigate();

  const abrir = (id: string) => {
    const c = lista.find((x) => x.id === id);
    if (!c) return;
    setLinhas(c.payload?.linhas ?? []);
    setConfig({ ...CONFIG_PADRAO, ...(c.payload?.config ?? {}) });
    setAtual({ id: c.id, nome: c.name, cliente: c.client_name ?? "", codigo: c.quote_code, gerenteConta: c.account_manager ?? "", especialistaBU: c.bu_specialist ?? "", salesforce: c.salesforce_code ?? "", arquitetoBU: c.bu_architect ?? "" });
    navigate("/observabilidade/treinamento");
  };

  const remover = async (id: string) => {
    if (!confirm("Mover esta cotação para a lixeira?")) return;
    try { await excluir(id); toast.success("Cotação removida"); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cotações de Treinamento</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma cotação salva ainda. Monte os itens no Configurador e clique em Salvar.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Cliente</TableHead>
              <TableHead className="text-right">Itens</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Atualizada</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {lista.map((c) => (
                <TableRow key={c.id} className={atual.id === c.id ? "bg-primary/5" : ""}>
                  <TableCell className="font-mono text-xs">{c.quote_code ?? "—"}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.client_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.payload?.linhas?.length ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{typeof c.payload?.resumo?.precoFinalTotal === "number" ? brl(c.payload.resumo.precoFinalTotal as number) : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => abrir(c.id)}><FolderOpen className="h-3.5 w-3.5 mr-1" /> Abrir</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remover(c.id)} aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
