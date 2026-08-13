import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import WriteFence from "@/components/auth/WriteFence";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { brl, vol } from "@/lib/servicedesk/format";
import Sigla from "@/components/servicedesk/Sigla";
import type { AtendimentoFaixa } from "@/lib/servicedesk/custoAtendimentoUM";

export default function ParametrosServiceDesk() {
  const { state, update, results, itens, setItens, valorItem } = useServiceDesk();

  const setFaixa = (i: number, patch: Partial<AtendimentoFaixa>) =>
    update("atendimentoFaixas", state.atendimentoFaixas.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addFaixa = () => {
    const last = state.atendimentoFaixas[state.atendimentoFaixas.length - 1];
    update("atendimentoFaixas", [
      ...state.atendimentoFaixas,
      { de: last?.ate ?? 0, ate: (last?.ate ?? 0) + 1000, custoPorUM: last?.custoPorUM ?? 1 },
    ]);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = itens.slice();
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setItens(next);
  };

  return (
    <WriteFence permission="page.sd.parametros.write">
      <div className="mx-auto max-w-6xl space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custo de atendimento por UM (Unidade de Medida)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Cada usuário e estação vale um peso; a soma ponderada é o total de UM (Unidade de
              Medida). As faixas são marginais e progressivas: cada faixa é cobrada apenas sobre a
              parcela de UM que cai dentro dela.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {(["usuarioPadrao", "usuarioVIP", "estacaoTrabalho"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">
                    {k === "usuarioPadrao" ? "Peso usuário padrão" : k === "usuarioVIP" ? "Peso usuário VIP" : "Peso estação de trabalho"}
                  </Label>
                  <Input className="h-8" type="number" step={0.1} value={state.atendimentoPesos[k]}
                    onChange={(e) => update("atendimentoPesos", { ...state.atendimentoPesos, [k]: Number(e.target.value) || 0 })} />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Piso de faturamento (R$)</Label>
                <Input className="h-8" type="number" value={state.atendimentoPiso}
                  onChange={(e) => update("atendimentoPiso", Number(e.target.value) || 0)} />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De (<Sigla termo="UM">UM</Sigla>)</TableHead>
                  <TableHead>Até (<Sigla termo="UM">UM</Sigla>)</TableHead>
                  <TableHead>Custo por <Sigla termo="UM">UM</Sigla> (R$/mês)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.atendimentoFaixas.map((f, i) => (
                  <TableRow key={`${f.de}-${i}`}>
                    <TableCell><Input className="h-8" type="number" value={f.de} onChange={(e) => setFaixa(i, { de: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={f.ate} onChange={(e) => setFaixa(i, { ate: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input className="h-8" type="number" step={0.5} value={f.custoPorUM} onChange={(e) => setFaixa(i, { custoPorUM: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => update("atendimentoFaixas", state.atendimentoFaixas.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" className="gap-1" onClick={addFaixa}>
              <Plus className="h-3.5 w-3.5" /> Adicionar faixa
            </Button>
            <div className="rounded-md bg-muted/50 p-3 text-xs">
              <Sigla termo="UM">UM</Sigla> total <strong>{vol(results.umTotal)}</strong> · custo{" "}
              {brl(results.custoPlataforma)} · médio por <Sigla termo="UM">UM</Sigla>{" "}
              {brl(results.custoMedioPorUM)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Itens adicionais</CardTitle>
            <p className="text-xs text-muted-foreground">
              A ordem definida aqui é a mesma usada nos relatórios e na apresentação.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Ativo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-28">Cobrança</TableHead>
                  <TableHead className="w-28">Horas</TableHead>
                  <TableHead className="w-36">Valor manual</TableHead>
                  <TableHead className="w-32 text-right">Valor de venda</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it, idx) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Checkbox checked={it.ativo}
                        onCheckedChange={(v) => setItens(itens.map((x) => (x.id === it.id ? { ...x, ativo: !!v } : x)))} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" value={it.descricao}
                        onChange={(e) => setItens(itens.map((x) => (x.id === it.id ? { ...x, descricao: e.target.value } : x)))} />
                    </TableCell>
                    <TableCell className="text-xs">{it.cobranca === "one-time" ? "Valor único" : "Mensal"}</TableCell>
                    <TableCell>
                      <Input className="h-8" type="number" step={0.5} value={it.horas ?? 0}
                        onChange={(e) => setItens(itens.map((x) => (x.id === it.id ? { ...x, horas: Number(e.target.value) || 0 } : x)))} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8" type="number" value={it.valorManual ?? 0}
                        onChange={(e) => setItens(itens.map((x) => (x.id === it.id ? { ...x, valorManual: Number(e.target.value) || 0 } : x)))} />
                    </TableCell>
                    <TableCell className="text-right text-xs">{brl(valorItem(it).valor)}</TableCell>
                    <TableCell className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, -1)}><ChevronUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(idx, 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WriteFence>
  );
}