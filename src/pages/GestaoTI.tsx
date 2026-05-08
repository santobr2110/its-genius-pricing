import { useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ServerCog, RotateCcw, Sparkles, GitBranch, Plus, Trash2 } from "lucide-react";
import BackHomeButton from "@/components/BackHomeButton";
import SortableNav from "@/components/SortableNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, PhoneCall } from "lucide-react";
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
  ATIVO_TIPOS,
  inventarioMultiplicador,
  type Rotina,
  type Frequencia,
  type Oferta,
  type AtivoTipo,
  type InventarioCounts,
} from "@/data/rotinas";
import { useITSMContext } from "@/contexts/ITSMContext";
import {
  GMUDS_DEFAULT,
  GMUD_TIPOS,
  GMUD_COMPLEXIDADES,
  GMUD_OFERTAS,
  CAC_FACTOR_GMUD,
  type Gmud,
  type GmudTipo,
  type GmudComplexidade,
  type GmudOferta,
} from "@/data/gmuds";

const OFERTAS: Oferta[] = ["Operation", "Performance"];

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

export default function GestaoTI() {
  const { state: itsm, update: updateItsm } = useITSMContext();
  const inventario: InventarioCounts = {
    qtdUsuarios: itsm.qtdUsuarios,
    qtdEquipamentos: itsm.qtdEquipamentos,
    qtdServidores: itsm.qtdServidores,
    qtdAtivosRede: itsm.qtdAtivosRede,
    qtdBancosDados: itsm.qtdBancosDados,
    qtdSistemas: itsm.qtdSistemas,
  };

  const [rotinas, setRotinas] = usePersistentState<Rotina[]>(
    "gestao-ti:rotinas",
    ROTINAS_DEFAULT,
  );

  // Migração: normaliza grupo "BACKUP" → "Backup" em dados persistidos antigos
  useEffect(() => {
    if (rotinas.some((r) => r.grupo === "BACKUP")) {
      setRotinas((prev) =>
        prev.map((r) => (r.grupo === "BACKUP" ? { ...r, grupo: "Backup" } : r)),
      );
    }
  }, []);
  const [gmuds, setGmuds] = usePersistentState<Gmud[]>(
    "gestao-ti:gmuds",
    GMUDS_DEFAULT,
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
  const resetGmuds = () => setGmuds(GMUDS_DEFAULT);

  const updateGmud = (id: string, patch: Partial<Gmud>) => {
    setGmuds((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g, ...patch };
        next.cac = +(next.chamadosMes * CAC_FACTOR_GMUD).toFixed(4);
        return next;
      }),
    );
  };

  const addGmud = () => {
    setGmuds((prev) => [
      ...prev,
      {
        id: `gmud-${Date.now()}`,
        tipo: "Normal",
        descricao: "Nova GMUD",
        complexidade: "Média",
        oferta: "Operation",
        chamadosMes: 1,
        cac: 0.2,
      },
    ]);
  };

  const removeGmud = (id: string) => {
    setGmuds((prev) => prev.filter((g) => g.id !== id));
  };

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
        demanda: number;
        demandaAuto: number;
        demandaManual: number;
      }
    > = {
      Operation: { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
      Performance: { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
    };
    let automatizadosCount = 0;
    let automatizadosChamados = 0;
    let totalDemanda = 0;
    let automatizadosDemanda = 0;
    rotinas.forEach((r) => {
      const t = byOferta[r.oferta];
      const mult = inventarioMultiplicador(r.ativo, inventario);
      const demanda = r.chamadosMes * mult;
      t.count += 1;
      t.chamados += r.chamadosMes;
      t.cac += r.cac;
      t.demanda += demanda;
      totalDemanda += demanda;
      if (r.automacao) {
        t.chamadosAuto += r.chamadosMes;
        t.countAuto += 1;
        t.demandaAuto += demanda;
        automatizadosDemanda += demanda;
        automatizadosCount += 1;
        automatizadosChamados += r.chamadosMes;
      } else {
        t.chamadosManual += r.chamadosMes;
        t.countManual += 1;
        t.demandaManual += demanda;
      }
    });
    const totalChamados = byOferta.Operation.chamados + byOferta.Performance.chamados;
    return { byOferta, automatizadosCount, automatizadosChamados, totalChamados, totalDemanda, automatizadosDemanda };
  }, [rotinas, inventario.qtdUsuarios, inventario.qtdEquipamentos, inventario.qtdServidores, inventario.qtdAtivosRede, inventario.qtdBancosDados, inventario.qtdSistemas]);

  const gmudTotals = useMemo(() => {
    const byTipo: Record<GmudTipo, { count: number; chamados: number; cac: number }> = {
      Padrão: { count: 0, chamados: 0, cac: 0 },
      Normal: { count: 0, chamados: 0, cac: 0 },
      Emergencial: { count: 0, chamados: 0, cac: 0 },
    };
    let totalChamados = 0;
    let totalCac = 0;
    gmuds.forEach((g) => {
      const t = byTipo[g.tipo];
      t.count += 1;
      t.chamados += g.chamadosMes;
      t.cac += g.cac;
      totalChamados += g.chamadosMes;
      totalCac += g.cac;
    });
    return { byTipo, totalChamados, totalCac };
  }, [gmuds]);

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
        <Tabs defaultValue="rotinas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rotinas" className="gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Rotinas
            </TabsTrigger>
            <TabsTrigger value="gmud" className="gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> GMUD
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rotinas" className="space-y-6 mt-0">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <p className="text-sm font-semibold">% do custo aplicado em rotinas automatizadas</p>
                <p className="text-xs text-muted-foreground">
                  Rotinas com automação ligada pagam apenas esta fração do custo médio por chamado.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={itsm.percCustoRotinaAutomatizada}
                  onChange={(e) =>
                    updateItsm(
                      "percCustoRotinaAutomatizada",
                      Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                    )
                  }
                  className="h-9 w-24 text-right"
                />
                <span className="text-sm font-semibold">%</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <PhoneCall className="h-4 w-4 text-primary" /> Demanda de chamados / mês
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Chamados gerados pelas rotinas considerando o inventário do cliente
                (frequência × quantidade do ativo vinculado).
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-3xl font-bold">{totals.totalDemanda.toFixed(1)}</p>
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
                          {t.demandaAuto.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.demandaManual.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {t.demanda.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      {totals.automatizadosDemanda.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {(totals.totalDemanda - totals.automatizadosDemanda).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {totals.totalDemanda.toFixed(1)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">
                Valores em chamados por mês, ajustados pelo inventário cadastrado.
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
                        inventario={inventario}
                      />
                    ))}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="gmud" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium">GMUDs cadastradas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{gmuds.length}</p>
                </CardContent>
              </Card>
              {GMUD_TIPOS.map((tipo) => (
                <Card key={tipo}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-medium">{tipo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{gmudTotals.byTipo[tipo].count}</p>
                    <p className="text-xs text-muted-foreground">
                      {gmudTotals.byTipo[tipo].chamados.toFixed(1)} chamados/mês
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" /> Gestão de Mudanças (GMUD)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={resetGmuds} className="gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="text-xs">Restaurar padrão</span>
                  </Button>
                  <Button size="sm" onClick={addGmud} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs">Nova GMUD</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Tipo</TableHead>
                      <TableHead className="min-w-[260px]">Descrição</TableHead>
                      <TableHead className="w-[130px]">Complexidade</TableHead>
                      <TableHead className="w-[140px]">Oferta</TableHead>
                      <TableHead className="w-[130px]">Chamados/mês</TableHead>
                      <TableHead className="w-[90px]">CAC</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gmuds.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <Select
                            value={g.tipo}
                            onValueChange={(v: GmudTipo) => updateGmud(g.id, { tipo: v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GMUD_TIPOS.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={g.descricao}
                            onChange={(e) => updateGmud(g.id, { descricao: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={g.complexidade}
                            onValueChange={(v: GmudComplexidade) => updateGmud(g.id, { complexidade: v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GMUD_COMPLEXIDADES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={g.oferta}
                            onValueChange={(v: GmudOferta) => updateGmud(g.id, { oferta: v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GMUD_OFERTAS.map((o) => (
                                <SelectItem key={o} value={o}>{o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step={0.1}
                            value={g.chamadosMes}
                            onChange={(e) => updateGmud(g.id, { chamadosMes: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {g.cac.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeGmud(g.id)}
                            aria-label="Remover GMUD"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40">
                      <TableCell colSpan={4} className="font-semibold">Total</TableCell>
                      <TableCell className="tabular-nums font-bold">
                        {gmudTotals.totalChamados.toFixed(1)}
                      </TableCell>
                      <TableCell className="tabular-nums font-bold">
                        {gmudTotals.totalCac.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function RotinaGroupTable({
  grupo,
  rotinas,
  onUpdate,
  inventario,
}: {
  grupo: string;
  rotinas: Rotina[];
  onUpdate: (id: string, patch: Partial<Rotina>) => void;
  inventario: InventarioCounts;
}) {
  const totalChamados = rotinas.reduce((s, r) => s + r.chamadosMes, 0);
  const totalDemanda = rotinas.reduce(
    (s, r) => s + r.chamadosMes * inventarioMultiplicador(r.ativo, inventario),
    0,
  );
  const totalCac = rotinas.reduce((s, r) => s + r.cac, 0);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{grupo}</h3>
          <Badge variant="outline">{rotinas.length}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {totalChamados.toFixed(1)} freq/mês • {totalDemanda.toFixed(1)} chamados/mês • CAC {totalCac.toFixed(2)}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[260px]">Rotina</TableHead>
            <TableHead className="w-[130px]">Oferta</TableHead>
            <TableHead className="w-[150px]">Ativo vinculado</TableHead>
            <TableHead className="w-[100px]">Automação</TableHead>
            <TableHead className="w-[150px]">Frequência</TableHead>
            <TableHead className="w-[110px]">Freq/mês</TableHead>
            <TableHead className="w-[130px]">Demanda/mês</TableHead>
            <TableHead className="w-[100px]">CAC</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rotinas.map((r) => {
            const mult = inventarioMultiplicador(r.ativo, inventario);
            const demanda = r.chamadosMes * mult;
            return (
            <TableRow key={r.id}>
              <TableCell>
                <Input
                  value={r.rotina}
                  onChange={(e) => onUpdate(r.id, { rotina: e.target.value })}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Select
                  value={r.oferta}
                  onValueChange={(v: Oferta) => onUpdate(r.id, { oferta: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operation">Operation</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={r.ativo ?? "Ambiente"}
                  onValueChange={(v: AtivoTipo) => onUpdate(r.id, { ativo: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATIVO_TIPOS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a} {a !== "Ambiente" && `(${inventarioMultiplicador(a, inventario)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <TableCell className="text-sm font-semibold tabular-nums text-primary">
                {demanda.toFixed(1)}
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                  ({r.chamadosMes.toFixed(1)}×{mult})
                </span>
              </TableCell>
              <TableCell className="text-sm font-medium tabular-nums">
                {r.cac.toFixed(2)}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}