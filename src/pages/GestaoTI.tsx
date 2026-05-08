import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ServerCog, RotateCcw, Sparkles, GitBranch, Plus, Trash2, ArrowLeftRight } from "lucide-react";
import BackHomeButton from "@/components/BackHomeButton";
import SortableNav from "@/components/SortableNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, PhoneCall } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  ABRANGENCIAS,
  inventarioMultiplicador,
  type Rotina,
  type Frequencia,
  type Oferta,
  type AtivoTipo,
  type InventarioCounts,
  type Complexidade,
  type ComplexFlagKey,
  type ComplexFlags,
  type Abrangencia,
  COMPLEX_FLAG_KEYS,
  COMPLEX_FLAG_LABELS,
  rotinaMultiplicador,
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

function EscalaRotinasPanel() {
  const { state, update } = useITSMContext();
  const total = state.percRotinaN1 + state.percRotinaN2 + state.percRotinaN3;
  const setLevel = (key: "percRotinaN1" | "percRotinaN2" | "percRotinaN3", value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const others: ("percRotinaN1" | "percRotinaN2" | "percRotinaN3")[] = (
      ["percRotinaN1", "percRotinaN2", "percRotinaN3"] as const
    ).filter((k) => k !== key);
    const remaining = 100 - v;
    const sumOthers = state[others[0]] + state[others[1]];
    let a = 0;
    let b = 0;
    if (sumOthers > 0) {
      a = Math.round((state[others[0]] / sumOthers) * remaining);
      b = remaining - a;
    } else {
      a = Math.round(remaining / 2);
      b = remaining - a;
    }
    update(key, v);
    update(others[0], a);
    update(others[1], b);
  };
  return (
    <div className="mb-4 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold">Escala de distribuição das rotinas</p>
          <p className="text-[11px] text-muted-foreground">
            Define como os chamados gerados por rotinas são distribuídos entre N1, N2 e N3 — usado para o custo/hora ponderado das rotinas (independente do funil de chamados).
          </p>
        </div>
        <Badge variant={total === 100 ? "secondary" : "destructive"}>Total {total}%</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {([
          ["percRotinaN1", "N1"],
          ["percRotinaN2", "N2"],
          ["percRotinaN3", "N3"],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5">
            <Label className="text-xs w-8">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={state[key]}
              onChange={(e) => setLevel(key, parseInt(e.target.value) || 0)}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const complexFlags: ComplexFlags = {
    complexVirtualizacaoCluster: itsm.complexVirtualizacaoCluster,
    complexBancoDadosHA: itsm.complexBancoDadosHA,
    complexFirewallHA: itsm.complexFirewallHA,
    complexMultiSites: itsm.complexMultiSites,
    complexSiteBackup: itsm.complexSiteBackup,
    complexHibridoCloudOnPrem: itsm.complexHibridoCloudOnPrem,
    complexOperacao24x7: itsm.complexOperacao24x7,
    complexErpMercado: itsm.complexErpMercado,
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

  const addRotina = (data: {
    grupo: string;
    rotina: string;
    oferta: Oferta;
    complexidade?: Complexidade;
    ativo: AtivoTipo;
    abrangencia?: Abrangencia;
    complexFlag?: ComplexFlagKey;
    automacao: boolean;
    frequencia: Frequencia;
    horasExecucao?: number;
  }) => {
    const chamadosMes = FREQ_TO_CHAMADOS[data.frequencia];
    const nova: Rotina = {
      id: `rt-${Date.now()}`,
      grupo: data.grupo.trim() || "Novo grupo",
      rotina: data.rotina.trim() || "Nova rotina",
      oferta: data.oferta,
      unidade: "Ambiente",
      ativo: data.ativo,
      abrangencia: data.abrangencia ?? "Ambiente",
      automacao: data.automacao,
      frequencia: data.frequencia,
      chamadosMes,
      cac: +(chamadosMes * CAC_FACTOR).toFixed(4),
      complexidade: data.oferta === "Performance" ? (data.complexidade ?? "Padrão") : undefined,
      complexFlag:
        data.oferta === "Performance" && data.complexidade === "Complexo"
          ? data.complexFlag
          : undefined,
      horasExecucao:
        data.oferta === "Performance" && data.complexidade === "Complexo"
          ? data.horasExecucao ?? 4
          : undefined,
    };
    setRotinas((prev) => [...prev, nova]);
  };

  const removeRotina = (id: string) => {
    setRotinas((prev) => prev.filter((r) => r.id !== id));
  };

  const grupoNomesExistentes = useMemo(
    () => Array.from(new Set(rotinas.map((r) => r.grupo))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rotinas],
  );

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
      const mult = rotinaMultiplicador(r, inventario, complexFlags);
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
  }, [
    rotinas,
    inventario.qtdUsuarios,
    inventario.qtdEquipamentos,
    inventario.qtdServidores,
    inventario.qtdAtivosRede,
    inventario.qtdBancosDados,
    inventario.qtdSistemas,
    complexFlags.complexVirtualizacaoCluster,
    complexFlags.complexBancoDadosHA,
    complexFlags.complexFirewallHA,
    complexFlags.complexMultiSites,
    complexFlags.complexSiteBackup,
    complexFlags.complexHibridoCloudOnPrem,
    complexFlags.complexOperacao24x7,
    complexFlags.complexErpMercado,
  ]);

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
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Rotinas operacionais
            </CardTitle>
            <NovaRotinaDialog
              gruposExistentes={grupoNomesExistentes}
              onSubmit={addRotina}
            />
          </CardHeader>
          <CardContent>
            <EscalaRotinasPanel />
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
                const renderGrupos = (lista: Rotina[]) => {
                  const grupos = groupBy(lista, (r) => r.grupo);
                  const nomes = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "pt-BR"));
                  return nomes.map((grupo) => (
                    <RotinaGroupCards
                      key={grupo}
                      grupo={grupo}
                      rotinas={grupos[grupo]}
                      onUpdate={updateRotina}
                      onRemove={removeRotina}
                      inventario={inventario}
                      complexFlags={complexFlags}
                      showComplexidadeMove={oferta === "Performance"}
                    />
                  ));
                };
                if (oferta === "Performance") {
                  const padrao = filtered.filter((r) => (r.complexidade ?? "Padrão") === "Padrão");
                  const complexo = filtered.filter((r) => r.complexidade === "Complexo");
                  return (
                    <TabsContent key={oferta} value={oferta} className="space-y-8 mt-4">
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Ambiente Padrão
                          </h3>
                          <Badge variant="secondary">{padrao.length}</Badge>
                        </div>
                        {padrao.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma rotina neste sub-quadro.</p>
                        ) : (
                          renderGrupos(padrao)
                        )}
                      </section>
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Ambiente Complexo
                          </h3>
                          <Badge variant="secondary">{complexo.length}</Badge>
                        </div>
                        {complexo.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma rotina neste sub-quadro.</p>
                        ) : (
                          renderGrupos(complexo)
                        )}
                      </section>
                    </TabsContent>
                  );
                }
                return (
                  <TabsContent key={oferta} value={oferta} className="space-y-6 mt-4">
                    {renderGrupos(filtered)}
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

function RotinaGroupCards({
  grupo,
  rotinas,
  onUpdate,
  onRemove,
  inventario,
  complexFlags,
  showComplexidadeMove = false,
}: {
  grupo: string;
  rotinas: Rotina[];
  onUpdate: (id: string, patch: Partial<Rotina>) => void;
  onRemove?: (id: string) => void;
  inventario: InventarioCounts;
  complexFlags: ComplexFlags;
  showComplexidadeMove?: boolean;
}) {
  const totalChamados = rotinas.reduce((s, r) => s + r.chamadosMes, 0);
  const totalDemanda = rotinas.reduce(
    (s, r) => s + r.chamadosMes * rotinaMultiplicador(r, inventario, complexFlags),
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
        {rotinas.map((r) => {
          const isComplexPerf = r.oferta === "Performance" && r.complexidade === "Complexo";
          const mult = rotinaMultiplicador(r, inventario, complexFlags);
          const demanda = r.chamadosMes * mult;
          const semDemanda = mult === 0;
          return (
            <div
              key={r.id}
              className={`rounded-md border bg-background p-3 space-y-2.5 transition-opacity ${
                semDemanda ? "opacity-60 border-dashed" : ""
              }`}
            >
              {/* Topo: nome + badges */}
              <div className="space-y-1.5">
                <Input
                  value={r.rotina}
                  onChange={(e) => onUpdate(r.id, { rotina: e.target.value })}
                  className="h-8 text-sm font-medium"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={r.oferta === "Performance" ? "default" : "secondary"} className="text-[10px]">
                    {r.oferta}
                  </Badge>
                  {r.automacao && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                      Automatizada
                    </Badge>
                  )}
                  {semDemanda && (
                    <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                      Sem demanda
                    </Badge>
                  )}
                </div>
              </div>

              {/* Abrangência */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Abrangência
                </Label>
                <Select
                  value={r.abrangencia}
                  onValueChange={(v: Abrangencia) => onUpdate(r.id, { abrangencia: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ABRANGENCIAS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vínculo de inventário */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {isComplexPerf ? "Item de complexidade" : "Inventário vinculado"}
                </Label>
                {isComplexPerf ? (
                  <Select
                    value={r.complexFlag ?? ""}
                    onValueChange={(v: ComplexFlagKey) => onUpdate(r.id, { complexFlag: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione complexidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLEX_FLAG_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {COMPLEX_FLAG_LABELS[k]} {complexFlags[k] ? "(1)" : "(0)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={r.ativo ?? "Ambiente"}
                    onValueChange={(v: AtivoTipo) => onUpdate(r.id, { ativo: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATIVO_TIPOS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a} ({inventarioMultiplicador(a, inventario)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Frequência + Freq/mês */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Frequência
                  </Label>
                  <Select
                    value={r.frequencia}
                    onValueChange={(v: Frequencia) => onUpdate(r.id, { frequencia: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIAS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Freq/mês
                  </Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={r.chamadosMes}
                    onChange={(e) => onUpdate(r.id, { chamadosMes: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Métricas calculadas */}
              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Demanda/mês</p>
                  <p className="text-sm font-semibold text-primary tabular-nums">
                    {demanda.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {r.chamadosMes.toFixed(1)}×{mult}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">CAC</p>
                  <p className="text-sm font-semibold tabular-nums">{r.cac.toFixed(2)}</p>
                </div>
                {isComplexPerf && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Horas/exec</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={r.horasExecucao ?? 4}
                      onChange={(e) =>
                        onUpdate(r.id, { horasExecucao: parseFloat(e.target.value) || 0 })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Rodapé: ações */}
              <div className="flex items-center justify-between pt-1 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={r.automacao}
                    onCheckedChange={(v) => onUpdate(r.id, { automacao: v })}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {r.automacao ? "Automação" : "Manual"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {showComplexidadeMove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={
                        (r.complexidade ?? "Padrão") === "Padrão"
                          ? "Mover para Ambiente Complexo"
                          : "Mover para Ambiente Padrão"
                      }
                      onClick={() =>
                        onUpdate(r.id, {
                          complexidade:
                            (r.complexidade ?? "Padrão") === "Padrão" ? "Complexo" : "Padrão",
                        })
                      }
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Excluir rotina"
                      onClick={() => onRemove(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NovaRotinaDialog({
  gruposExistentes,
  onSubmit,
}: {
  gruposExistentes: string[];
  onSubmit: (data: {
    grupo: string;
    rotina: string;
    oferta: Oferta;
    complexidade?: Complexidade;
    ativo: AtivoTipo;
    abrangencia?: Abrangencia;
    complexFlag?: ComplexFlagKey;
    automacao: boolean;
    frequencia: Frequencia;
    horasExecucao?: number;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [grupoMode, setGrupoMode] = useState<"existente" | "novo">("existente");
  const [grupo, setGrupo] = useState(gruposExistentes[0] ?? "");
  const [novoGrupo, setNovoGrupo] = useState("");
  const [rotina, setRotina] = useState("");
  const [oferta, setOferta] = useState<Oferta>("Operation");
  const [complexidade, setComplexidade] = useState<Complexidade>("Padrão");
  const [ativo, setAtivo] = useState<AtivoTipo>("Ambiente");
  const [abrangencia, setAbrangencia] = useState<Abrangencia>("Ambiente");
  const [complexFlag, setComplexFlag] = useState<ComplexFlagKey>("complexVirtualizacaoCluster");
  const [automacao, setAutomacao] = useState(false);
  const [frequencia, setFrequencia] = useState<Frequencia>("Mensal");
  const [horasExecucao, setHorasExecucao] = useState<number>(4);

  const isPerf = oferta === "Performance";
  const isComplexo = isPerf && complexidade === "Complexo";
  const grupoFinal = grupoMode === "novo" ? novoGrupo : grupo;
  const podeSalvar = grupoFinal.trim().length > 0 && rotina.trim().length > 0;

  const reset = () => {
    setGrupoMode("existente");
    setGrupo(gruposExistentes[0] ?? "");
    setNovoGrupo("");
    setRotina("");
    setOferta("Operation");
    setComplexidade("Padrão");
    setAtivo("Ambiente");
    setAbrangencia("");
    setComplexFlag("complexVirtualizacaoCluster");
    setAutomacao(false);
    setFrequencia("Mensal");
    setHorasExecucao(4);
  };

  const salvar = () => {
    if (!podeSalvar) return;
    onSubmit({
      grupo: grupoFinal,
      rotina,
      oferta,
      complexidade: isPerf ? complexidade : undefined,
      ativo,
      abrangencia,
      complexFlag: isComplexo ? complexFlag : undefined,
      automacao,
      frequencia,
      horasExecucao: isComplexo ? horasExecucao : undefined,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">Nova rotina</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova rotina</DialogTitle>
          <DialogDescription>
            Defina oferta, grupo e parâmetros de execução. O CAC é calculado a partir da frequência.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Oferta</Label>
              <Select value={oferta} onValueChange={(v: Oferta) => setOferta(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operation">Operation</SelectItem>
                  <SelectItem value="Performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isPerf && (
              <div className="space-y-1">
                <Label className="text-xs">Sub-quadro</Label>
                <Select value={complexidade} onValueChange={(v: Complexidade) => setComplexidade(v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Padrão">Ambiente Padrão</SelectItem>
                    <SelectItem value="Complexo">Ambiente Complexo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Grupo</Label>
            <div className="flex gap-2">
              <Select value={grupoMode} onValueChange={(v: "existente" | "novo") => setGrupoMode(v)}>
                <SelectTrigger className="h-9 text-sm w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existente">Existente</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                </SelectContent>
              </Select>
              {grupoMode === "existente" ? (
                <Select value={grupo} onValueChange={setGrupo}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {gruposExistentes.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={novoGrupo}
                  onChange={(e) => setNovoGrupo(e.target.value)}
                  placeholder="Nome do novo grupo"
                  className="h-9 text-sm flex-1"
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição da rotina</Label>
            <Input
              value={rotina}
              onChange={(e) => setRotina(e.target.value)}
              placeholder="Ex: Health Check do banco"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Abrangência</Label>
            <Input
              value={abrangencia}
              onChange={(e) => setAbrangencia(e.target.value)}
              placeholder="Escopo da rotina (ex: Por servidor, Ambiente inteiro)"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Texto livre — descreve o escopo. Independente do vínculo de inventário.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isComplexo ? "Item de complexidade vinculado" : "Ativo vinculado"}</Label>
            {isComplexo ? (
              <Select value={complexFlag} onValueChange={(v: ComplexFlagKey) => setComplexFlag(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEX_FLAG_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>{COMPLEX_FLAG_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={ativo} onValueChange={(v: AtivoTipo) => setAtivo(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATIVO_TIPOS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Frequência</Label>
              <Select value={frequencia} onValueChange={(v: Frequencia) => setFrequencia(v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIAS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Automação</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={automacao} onCheckedChange={setAutomacao} />
                <span className="text-xs text-muted-foreground">{automacao ? "Sim" : "Não"}</span>
              </div>
            </div>
          </div>

          {isComplexo && (
            <div className="space-y-1">
              <Label className="text-xs">Horas por execução (custo via valor/hora N3)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={horasExecucao}
                onChange={(e) => setHorasExecucao(parseFloat(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Freq/mês: {FREQ_TO_CHAMADOS[frequencia]} • CAC: {(FREQ_TO_CHAMADOS[frequencia] * CAC_FACTOR).toFixed(2)}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancelar</Button>
          <Button onClick={salvar} disabled={!podeSalvar}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}