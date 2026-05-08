import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ServerCog, RotateCcw, Sparkles } from "lucide-react";
import BackHomeButton from "@/components/BackHomeButton";
import SortableNav from "@/components/SortableNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ListChecks, PhoneCall } from "lucide-react";
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
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">Rotinas × Chamados de rotina</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">Rotina</span> é uma atividade recorrente do
            catálogo (ex.: <em>Health Check de Backup</em>) — cada item da tabela abaixo é uma rotina.
            <br />
            <span className="font-semibold text-foreground">Chamado de rotina/mês</span> é a quantidade de
            execuções (tickets) que essa rotina gera por mês, derivada da frequência (Semanal = 4, Quinzenal
            = 2, Mensal = 1, Bimestral = 0,5, Trimestral = 0,3, Semestral = 0,2, Anual = 0,1).
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quadro 1: Rotinas (catálogo) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> Rotinas cadastradas
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Atividades recorrentes do catálogo (itens da tabela abaixo).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-3xl font-bold">{rotinas.length}</p>
                <span className="text-xs text-muted-foreground">no total</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oferta</TableHead>
                    <TableHead className="text-right">Com automação</TableHead>
                    <TableHead className="text-right">Sem automação</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {OFERTAS.map((o) => {
                    const t = totals.byOferta[o];
                    return (
                      <TableRow key={o}>
                        <TableCell className="font-medium">{o}</TableCell>
                        <TableCell className="text-right tabular-nums text-primary font-semibold">{t.countAuto}</TableCell>
                        <TableCell className="text-right tabular-nums">{t.countManual}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{t.count}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      {totals.automatizadosCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {rotinas.length - totals.automatizadosCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{rotinas.length}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">Valores em quantidade de rotinas.</p>
            </CardContent>
          </Card>

          {/* Quadro 2: Chamados de rotina (execuções mensais) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" /> Chamados de rotina / mês
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Execuções mensais geradas pelas rotinas (derivadas da frequência).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-3xl font-bold">{totals.totalChamados.toFixed(1)}</p>
                <span className="text-xs text-muted-foreground">chamados/mês</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oferta</TableHead>
                    <TableHead className="text-right">Com automação</TableHead>
                    <TableHead className="text-right">Sem automação</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {OFERTAS.map((o) => {
                    const t = totals.byOferta[o];
                    return (
                      <TableRow key={o}>
                        <TableCell className="font-medium">{o}</TableCell>
                        <TableCell className="text-right tabular-nums text-primary font-semibold">
                          {t.chamadosAuto.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.chamadosManual.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {t.chamados.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      {totals.automatizadosChamados.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {(totals.totalChamados - totals.automatizadosChamados).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {totals.totalChamados.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">Valores em chamados por mês.</p>
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