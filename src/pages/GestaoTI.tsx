import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ServerCog, Sparkles, GitBranch, Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { Pencil, Check, X } from "lucide-react";
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
  OFERTA_LABELS,
} from "@/data/rotinas";
import { useITSMContext } from "@/contexts/ITSMContext";
import {
import WriteFence from "@/components/auth/WriteFence";
  GMUDS_DEFAULT,
  GMUD_TIPOS,
  GMUD_COMPLEXIDADES,
  GMUD_OFERTAS,
  CAC_FACTOR_GMUD,
  GMUD_FREQUENCIAS,
  GMUD_FREQ_TO_CHAMADOS,
  type Gmud,
  type GmudTipo,
  type GmudComplexidade,
  type GmudOferta,
  type GmudFrequencia,
} from "@/data/gmuds";

const OFERTAS: Oferta[] = [
  "Monitor",
  "Flow",
  "Operation",
  "Performance",
  "Enterprise",
];

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
    update(key, v);
  };
  // Buffer local: permite digitar livremente sem alterar automaticamente os demais níveis.
  // Cada campo é salvo de forma independente no blur ou Enter.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const displayValue = (key: "percRotinaN1" | "percRotinaN2" | "percRotinaN3") =>
    draft[key] !== undefined ? draft[key] : String(state[key]);
  const commit = (key: "percRotinaN1" | "percRotinaN2" | "percRotinaN3") => {
    const raw = draft[key];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) setLevel(key, n);
    setDraft((d) => {
      const { [key]: _omit, ...rest } = d;
      return rest;
    });
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
              value={displayValue(key)}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              onBlur={() => commit(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(key);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GmudDistribuicaoPanel() {
  const { state, update } = useITSMContext();
  const total = (state.percGmudN2 || 0) + (state.percGmudN3 || 0);
  const setLevel = (key: "percGmudN2" | "percGmudN3", value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    update(key, v);
  };
  const [draft, setDraft] = useState<Record<string, string>>({});
  const displayValue = (key: "percGmudN2" | "percGmudN3") =>
    draft[key] !== undefined ? draft[key] : String(state[key]);
  const commit = (key: "percGmudN2" | "percGmudN3") => {
    const raw = draft[key];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) setLevel(key, n);
    setDraft((d) => {
      const { [key]: _omit, ...rest } = d;
      return rest;
    });
  };
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold">Distribuição dos chamados de GMUD</p>
          <p className="text-[11px] text-muted-foreground">
            Define como os chamados gerados pelas GMUDs são distribuídos entre N2 (custo por chamado) e N3 (horas técnicas = chamados × tempo médio de N3).
          </p>
        </div>
        <Badge variant={total === 100 ? "secondary" : "destructive"}>Total {total}%</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {([
          ["percGmudN2", "N2"],
          ["percGmudN3", "N3"],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5">
            <Label className="text-xs w-8">{label}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={displayValue(key)}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              onBlur={() => commit(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(key);
                  (e.target as HTMLInputElement).blur();
                }
              }}
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

  // Migração: normaliza grupo "BACKUP" → "Backup" e abrangencia para enum em dados antigos
  useEffect(() => {
    let changed = false;
    const next = rotinas.map((rRaw) => {
      // Migração: rotinas legadas com oferta "Todos" viram gerencial vinculadas a Operation
      let r = rRaw as Rotina & { oferta: string };
      if ((r.oferta as string) === "Todos") {
        r = { ...r, oferta: "Operation", gerencial: true };
        changed = true;
      }
      const patch: Partial<Rotina> = {};
      if (r.grupo === "BACKUP") {
        patch.grupo = "Backup";
        changed = true;
      }
      if (r.abrangencia !== "Ambiente" && r.abrangencia !== "Individual") {
        const u = r.unidade.toLowerCase();
        patch.abrangencia = u.includes("ambiente") ? "Ambiente" : "Individual";
        changed = true;
      }
      // Migração: rotinas de Sistema Operacional passam a ser por Servidor (Individual)
      if (
        (r.id === "lnx-1" || r.id === "win-1" || r.id === "win-2") &&
        (r.ativo !== "Servidor" || r.abrangencia !== "Ambiente")
      ) {
        patch.ativo = "Servidor";
        patch.unidade = "Servidor (Ambiente)";
        patch.abrangencia = "Ambiente";
        changed = true;
      }
      return Object.keys(patch).length ? { ...r, ...patch } : r;
    });
    if (changed) setRotinas(next as Rotina[]);
  }, []);
  const [gmuds, setGmuds] = usePersistentState<Gmud[]>(
    "gestao-ti:gmuds",
    GMUDS_DEFAULT,
  );

  // Migração: garante que GMUDs antigas tenham `frequencia`.
  useEffect(() => {
    let changed = false;
    const next = gmuds.map((g) => {
      if (!g.frequencia) {
        changed = true;
        // Estima frequência a partir do chamadosMes salvo.
        const cm = g.chamadosMes ?? 1;
        let freq: GmudFrequencia = "Mensal";
        if (cm >= 4) freq = "Semanal";
        else if (cm >= 2) freq = "Quinzenal";
        else if (cm >= 1) freq = "Mensal";
        else if (cm >= 0.5) freq = "Bimestral";
        else if (cm >= 1 / 3) freq = "Trimestral";
        else if (cm >= 1 / 6) freq = "Semestral";
        else freq = "Anual";
        const chamadosMes = GMUD_FREQ_TO_CHAMADOS[freq];
        return { ...g, frequencia: freq, chamadosMes, cac: +(chamadosMes * CAC_FACTOR_GMUD).toFixed(4) };
      }
      return g;
    });
    if (changed) setGmuds(next);
  }, []);

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
    gerencial?: boolean;
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
        data.horasExecucao && data.horasExecucao > 0 ? data.horasExecucao : undefined,
      gerencial: data.gerencial || undefined,
    };
    setRotinas((prev) => [...prev, nova]);
  };

  const removeRotina = (id: string) => {
    setRotinas((prev) => prev.filter((r) => r.id !== id));
  };

  const renameGrupo = (oldName: string, newName: string) => {
    const nn = newName.trim();
    if (!nn || nn === oldName) return;
    setRotinas((prev) => prev.map((r) => (r.grupo === oldName ? { ...r, grupo: nn } : r)));
  };

  const removeGrupo = (nome: string) => {
    setRotinas((prev) => prev.filter((r) => r.grupo !== nome));
  };

  const grupoNomesExistentes = useMemo(
    () => Array.from(new Set(rotinas.map((r) => r.grupo))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [rotinas],
  );


  const updateGmud = (id: string, patch: Partial<Gmud>) => {
    setGmuds((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g, ...patch };
        if (patch.frequencia) {
          next.chamadosMes = GMUD_FREQ_TO_CHAMADOS[patch.frequencia];
        }
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
        frequencia: "Mensal",
        chamadosMes: GMUD_FREQ_TO_CHAMADOS["Mensal"],
        cac: +(GMUD_FREQ_TO_CHAMADOS["Mensal"] * CAC_FACTOR_GMUD).toFixed(4),
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
      Monitor:     { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
      Flow:        { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
      Operation:   { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
      Performance: { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
      Enterprise:  { count: 0, chamados: 0, cac: 0, chamadosAuto: 0, chamadosManual: 0, countAuto: 0, countManual: 0, demanda: 0, demandaAuto: 0, demandaManual: 0 },
    };
    let automatizadosCount = 0;
    let automatizadosChamados = 0;
    let totalDemanda = 0;
    let automatizadosDemanda = 0;
    rotinas.forEach((r) => {
      const t = byOferta[r.oferta];
      if (!t) return;
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
    const totalChamados = OFERTAS.reduce((s, o) => s + byOferta[o].chamados, 0);
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
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ServerCog className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Gestão de TI</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="gestao-ti" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-6 space-y-6">
<WriteFence permission="page.gestao_ti.write">
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
                        <TableCell className="font-medium">{OFERTA_LABELS[o]}</TableCell>
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
                        <TableCell className="font-medium">{OFERTA_LABELS[o]}</TableCell>
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
                    {OFERTA_LABELS[o]}{" "}
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
                      onRenameGroup={renameGrupo}
                      onRemoveGroup={removeGrupo}
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
                    <div className="rounded-lg border border-muted bg-muted/30 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        <strong>Plano de rotinas:</strong> qualquer rotina pode ter horas por execução.
                        Com horas: o atendimento é por N3 (descontando das horas N3 contratadas) e
                        custo = demanda × horas × valor/hora N3. Sem horas: entra no funil de
                        rotinas (N1/N2/N3 conforme a Escala). Marque <em>Gerencial Selbetti</em>
                        para cobrar à parte (sem descontar das horas contratadas) — a rotina é
                        atribuída à oferta selecionada.
                      </p>
                    </div>
                    {renderGrupos(filtered)}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="gmud" className="space-y-6 mt-0">
            <GmudDistribuicaoPanel />
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
                      <TableHead className="w-[130px]">Frequência</TableHead>
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
                          <Select
                            value={g.frequencia}
                            onValueChange={(v: GmudFrequencia) => updateGmud(g.id, { frequencia: v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GMUD_FREQUENCIAS.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="h-8 flex items-center justify-end pr-2 text-sm tabular-nums text-muted-foreground">
                            {g.chamadosMes.toFixed(2)}
                          </div>
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
                      <TableCell colSpan={5} className="font-semibold">Total</TableCell>
                      <TableCell className="tabular-nums font-bold">
                        {gmudTotals.totalChamados.toFixed(1)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </WriteFence>
      </main>
    </div>
  );
}

function RotinaGroupCards({
  grupo,
  rotinas,
  onUpdate,
  onRemove,
  onRenameGroup,
  onRemoveGroup,
  inventario,
  complexFlags,
  showComplexidadeMove = false,
}: {
  grupo: string;
  rotinas: Rotina[];
  onUpdate: (id: string, patch: Partial<Rotina>) => void;
  onRemove?: (id: string) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onRemoveGroup?: (nome: string) => void;
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(grupo);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-7 text-sm w-56"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRenameGroup?.(grupo, draft);
                    setEditing(false);
                  } else if (e.key === "Escape") {
                    setDraft(grupo);
                    setEditing(false);
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  onRenameGroup?.(grupo, draft);
                  setEditing(false);
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  setDraft(grupo);
                  setEditing(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold">{grupo}</h3>
              <Badge variant="outline">{rotinas.length}</Badge>
              {onRenameGroup && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDraft(grupo);
                    setEditing(true);
                  }}
                  title="Renomear grupo"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onRemoveGroup && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmDel(true)}
                  title="Excluir grupo"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {totalChamados.toFixed(1)} freq/mês • {totalDemanda.toFixed(1)} chamados/mês • CAC {totalCac.toFixed(2)}
        </div>
      </div>
      <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir grupo "{grupo}"?</DialogTitle>
            <DialogDescription>
              Esta ação removerá {rotinas.length} rotina(s) deste grupo e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                onRemoveGroup?.(grupo);
                setConfirmDel(false);
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
        {rotinas.map((r) => {
          const isComplexPerf = r.oferta === "Performance" && r.complexidade === "Complexo";
          const isGerencial = !!r.gerencial;
          // Campo de horas está sempre disponível (opcional para qualquer rotina).
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
                  <Select
                    value={r.oferta}
                    onValueChange={(v: Oferta) =>
                      onUpdate(r.id, {
                        oferta: v,
                        complexidade: v === "Performance" ? (r.complexidade ?? "Padrão") : undefined,
                        complexFlag: v === "Performance" ? r.complexFlag : undefined,
                      })
                    }
                  >
                    <SelectTrigger className="h-6 w-[110px] text-[10px] px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFERTAS.map((o) => (
                        <SelectItem key={o} value={o}>{OFERTA_LABELS[o]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.automacao && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                      Automatizada
                    </Badge>
                  )}
                  {isGerencial && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/60 text-amber-700 dark:text-amber-300">
                      Gerencial
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
                <div>
                  <Label className="text-[10px] text-muted-foreground">Horas/exec</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="—"
                    value={r.horasExecucao ?? ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      onUpdate(r.id, {
                        horasExecucao: Number.isFinite(v) && v > 0 ? v : undefined,
                      });
                    }}
                    className="h-7 text-xs"
                  />
                  <p className="text-[9px] text-muted-foreground">
                    {r.horasExecucao ? "via N3" : "via funil"}
                  </p>
                </div>
              </div>

              {/* Rodapé: ações */}
              <div className="flex items-center justify-between pt-1 border-t">
                <div className="flex items-center gap-3 flex-wrap">
                  <Switch
                    checked={r.automacao}
                    onCheckedChange={(v) => onUpdate(r.id, { automacao: v })}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {r.automacao ? "Automação" : "Manual"}
                  </span>
                  <div className="flex items-center gap-1.5 pl-2 border-l">
                    <Switch
                      checked={isGerencial}
                      onCheckedChange={(v) => onUpdate(r.id, { gerencial: v || undefined })}
                    />
                    <span className="text-[10px] text-muted-foreground" title="Cobrada em separado e não desconta horas N3 contratadas">
                      Gerencial
                    </span>
                  </div>
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
    gerencial?: boolean;
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
  const [usaHoras, setUsaHoras] = useState<boolean>(false);
  const [gerencial, setGerencial] = useState<boolean>(false);

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
    setAbrangencia("Ambiente");
    setComplexFlag("complexVirtualizacaoCluster");
    setAutomacao(false);
    setFrequencia("Mensal");
    setHorasExecucao(4);
    setUsaHoras(false);
    setGerencial(false);
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
      horasExecucao: usaHoras && horasExecucao > 0 ? horasExecucao : undefined,
      gerencial: gerencial || undefined,
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
                  {OFERTAS.map((o) => (
                    <SelectItem key={o} value={o}>{OFERTA_LABELS[o]}</SelectItem>
                  ))}
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
            <Select
              value={abrangencia}
              onValueChange={(v: Abrangencia) => setAbrangencia(v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ABRANGENCIAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              "Ambiente" = 1 execução por ambiente. "Individual" = por item do inventário vinculado.
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

          <div className="rounded-md border p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={usaHoras} onCheckedChange={setUsaHoras} />
              <Label className="text-xs">Lançar horas (atendimento por N3)</Label>
            </div>
            {usaHoras && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Horas por execução</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={horasExecucao}
                  onChange={(e) => setHorasExecucao(parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Custo = demanda × horas × valor/hora N3. Sem horas, entra no funil de rotinas (N1/N2/N3).
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 border-t">
              <Switch checked={gerencial} onCheckedChange={setGerencial} />
              <Label className="text-xs">Gerencial Selbetti</Label>
            </div>
            {gerencial && (
              <p className="text-[10px] text-muted-foreground">
                Cobrada em separado dentro da oferta selecionada e <strong>não desconta</strong> horas N3 contratadas.
              </p>
            )}
          </div>

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