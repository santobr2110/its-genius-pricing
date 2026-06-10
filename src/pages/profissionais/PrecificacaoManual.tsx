import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { CargoRow } from "@/lib/profissionais/parsers";
import { NIVEIS, REGIMES, DURACOES } from "@/lib/profissionais/calc";
import PainelResultado, { PerfilSelecionado } from "./PainelResultado";

export default function PrecificacaoManual() {
  const { byTipo } = useKnowledgeBase();
  const cargos = useMemo(
    () => byTipo.cargos_salarios.flatMap((r) => (r.conteudo_parsed ?? []) as CargoRow[]),
    [byTipo.cargos_salarios],
  );

  const areas = useMemo(() => Array.from(new Set(cargos.map((c) => c.area).filter(Boolean))).sort(), [cargos]);
  const [area, setArea] = useState<string>("");
  const cargosDaArea = useMemo(() => cargos.filter((c) => c.area === area), [cargos, area]);
  const cargosUnicos = useMemo(() => Array.from(new Set(cargosDaArea.map((c) => c.cargo))).sort(), [cargosDaArea]);
  const [cargo, setCargo] = useState<string>("");
  const [nivel, setNivel] = useState<string>("");
  const [regime, setRegime] = useState<string>("");
  const [duracao, setDuracao] = useState<string>("");

  useEffect(() => { setCargo(""); }, [area]);

  const perfil: PerfilSelecionado | null = useMemo(() => {
    if (!area || !cargo || !nivel || !regime || !duracao) return null;
    const ref = cargosDaArea.find((c) => c.cargo === cargo) ?? null;
    if (!ref) return null;
    return {
      cargo: ref.cargo,
      area: ref.area,
      nivel,
      descricao: ref.descricao,
      competencias: ref.competencias,
      salario_base: ref.salario_base,
    };
  }, [area, cargo, nivel, regime, duracao, cargosDaArea]);

  if (cargos.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Base de cargos vazia</AlertTitle>
        <AlertDescription>Carregue a tabela de cargos e salários na Base de Conhecimento antes de usar a precificação manual.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Selecionar Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Área / Domínio</Label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cargo</Label>
            <Select value={cargo} onValueChange={setCargo} disabled={!area}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{cargosUnicos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nível de Senioridade</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Regime de Alocação</Label>
            <Select value={regime} onValueChange={setRegime}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{REGIMES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duração do Contrato</Label>
            <Select value={duracao} onValueChange={setDuracao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{DURACOES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <PainelResultado perfil={perfil} origem="manual" />
    </div>
  );
}