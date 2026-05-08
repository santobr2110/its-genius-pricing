import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ServerCog, RotateCcw, Sparkles } from "lucide-react";
import BackHomeButton from "@/components/BackHomeButton";
import SortableNav from "@/components/SortableNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  ROTINAS_DEFAULT,
  FREQUENCIAS,
  FREQ_TO_CHAMADOS,
  CAC_FACTOR,
  type Rotina,
  type Frequencia,
  type Oferta,
} from "@/data/rotinas";

const OFERTAS: Oferta[] = ["Operation", "Performance"];

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

export default function GestaoTI() {
  const [rotinas, setRotinas] = usePersistentState<Rotina[]>(
    "gestao-ti:rotinas",
    ROTINAS_DEFAULT,
  );

  const updateRotina = (id: string, patch: Partial<Rotina>) => {
    setRotinas((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.frequencia && patch.chamadosMes === undefined) {
          next.chamadosMes = FREQ_TO_CHAMADOS[patch.frequencia];
        }
        next.cac = +(next.chamadosMes * CAC_FACTOR).toFixed(4);
        return next;
      }),
    );
  };

  const resetAll = () => setRotinas(ROTINAS_DEFAULT);

  const totals = useMemo(() => {
    const byOferta: Record<
      Oferta,
      {
        count: number;
        chamados: number;
        cac: number;
        chamadosAuto: number;
        chamadosManual: number;
        countAuto: number;
        countManual: number;
      }
    > = {
      Operation: { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0 },
      Performance: { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0 },
    };
    let automatizadosCount = 0;
    let automatizadosChamados = 0;
    rotinas.forEach((r) => {
      const t = byOferta[r.oferta];
      t.count += 1;
      t.chamados += r.chamadosMes;
      t.cac += r.cac;
      if (r.automacao) {
        t.chamadosAuto += r.chamadosMes;
        t.countAuto += 1;
        automatizadosCount += 1;
        automatizadosChamados += r.chamadosMes;
      } else {
        t.chamadosManual += r.chamadosMes;
        t.countManual += 1;
      }
    });
    const totalChamados = byOferta.Operation.chamados + byOferta.Performance.chamados;
    return { byOferta, automatizadosCount, automatizadosChamados, totalChamados };
  }, [rotinas]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ServerCog className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Gestão de TI</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-xs">Restaurar padrão</span>
            </Button>
            <SortableNav current="gestao-ti" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Total de rotinas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{rotinas.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Operation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.byOferta.Operation.count}</p>
              <p className="text-xs text-muted-foreground">
                {totals.byOferta.Operation.chamados.toFixed(1)} chamados/mês • CAC {totals.byOferta.Operation.cac.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.byOferta.Performance.count}</p>
              <p className="text-xs text-muted-foreground">
                {totals.byOferta.Performance.chamados.toFixed(1)} chamados/mês • CAC {totals.byOferta.Performance.cac.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Chamados automatizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{totals.automatizadosChamados.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">
                {totals.automatizadosCount} rotina(s) •{" "}
                {totals.totalChamados > 0
                  ? ((totals.automatizadosChamados / totals.totalChamados) * 100).toFixed(1)
                  : "0.0"}
                % do total
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Rotinas operacionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="Operation">
              <TabsList>
              {OFERTAS.map((o) => (
                  <TabsTrigger key={o} value={o}>
                    {o}{" "}
                    <Badge variant="secondary" className="ml-2">
                    {totals.byOferta[o].count}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {OFERTAS.map((oferta) => {
                const filtered = rotinas.filter((r) => r.oferta === oferta);
                const grupos = groupBy(filtered, (r) => r.grupo);
                const grupoNomes = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "pt-BR"));
                return (
                  <TabsContent key={oferta} value={oferta} className="space-y-6 mt-4">
                    {grupoNomes.map((grupo) => (
                      <RotinaGroupTable
                        key={grupo}
                        grupo={grupo}
                        rotinas={grupos[grupo]}
                        onUpdate={updateRotina}
                      />
                    ))}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function RotinaGroupTable({
  grupo,
  rotinas,
  onUpdate,
}: {
  grupo: string;
  rotinas: Rotina[];
  onUpdate: (id: string, patch: Partial<Rotina>) => void;
}) {
  const totalChamados = rotinas.reduce((s, r) => s + r.chamadosMes, 0);
  const totalCac = rotinas.reduce((s, r) => s + r.cac, 0);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{grupo}</h3>
          <Badge variant="outline">{rotinas.length}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalChamados.toFixed(1)} chamados/mês • CAC {totalCac.toFixed(2)}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[260px]">Rotina</TableHead>
            <TableHead className="w-[140px]">Unidade</TableHead>
            <TableHead className="w-[100px]">Automação</TableHead>
            <TableHead className="w-[150px]">Frequência</TableHead>
            <TableHead className="w-[130px]">Chamados/mês</TableHead>
            <TableHead className="w-[100px]">CAC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rotinas.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Input
                  value={r.rotina}
                  onChange={(e) => onUpdate(r.id, { rotina: e.target.value })}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={r.unidade}
                  onChange={(e) => onUpdate(r.id, { unidade: e.target.value })}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={r.automacao}
                    onCheckedChange={(v) => onUpdate(r.id, { automacao: v })}
                  />
                  <span className="text-xs text-muted-foreground">{r.automacao ? "Sim" : "Não"}</span>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={r.frequencia}
                  onValueChange={(v: Frequencia) => onUpdate(r.id, { frequencia: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIAS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step={0.1}
                  value={r.chamadosMes}
                  onChange={(e) =>
                    onUpdate(r.id, { chamadosMes: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell className="text-sm font-medium tabular-nums">
                {r.cac.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}