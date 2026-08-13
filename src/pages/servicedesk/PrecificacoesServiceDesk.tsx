import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { useServiceDeskPricingPresets } from "@/hooks/servicedesk/useServiceDeskPricingPresets";

export default function PrecificacoesServiceDesk() {
  const { can } = useAuth();
  const { presets, loading, remove } = useServiceDeskPricingPresets();
  const { setState, team, setItens } = useServiceDesk();
  const [restoring, setRestoring] = useState<string | null>(null);

  const restore = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p?.state) return;
    setRestoring(id);
    setState(p.state);
    if (p.team) team.setTeamState(p.team);
    if (p.itensAdicionais) setItens(p.itensAdicionais);
    toast.success(`Precificação "${p.name}" restaurada.`);
    setRestoring(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Precificações salvas — Smart Service Desk</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : presets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma precificação salva ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Salvo por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs">{p.clientName ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.quoteCode ?? "—"}</TableCell>
                    <TableCell className="text-xs">{p.savedByName ?? p.savedByEmail ?? "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(p.createdAt).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={restoring === p.id}
                        onClick={() => restore(p.id)} title="Restaurar">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      {can("sd.pricing.delete") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}