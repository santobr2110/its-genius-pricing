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
import { CargoRow, NIVEL_SENIORIDADE, FAIXAS_C } from "@/lib/profissionais/parsers";
import { REGIMES, DURACOES } from "@/lib/profissionais/calc";
import PainelResultado, { PerfilSelecionado } from "./PainelResultado";

export default function PrecificacaoManual() {
  const { byTipo } = useKnowledgeBase();
  const cargos = useMemo(
    () => byTipo.cargos_salarios.flatMap((r) => (r.conteudo_parsed ?? []) as CargoRow[]),
    [byTipo.cargos_salarios],
  );

  const cargosUnicos = useMemo(
    () => Array.from(new Set(cargos.map((c) => c.cargo).filter(Boolean))).sort(),
    [cargos],
  );

  const [cargo, setCargo] = useState<string>("");
  const [senioridade, setSenioridade] = useState<string>("");
  const [faixa, setFaixa] = useState<string>("");
  const [regime, setRegime] = useState<string>("");
  const [duracao, setDuracao] = useState<string>("");

  // Linhas do cargo selecionado, ordenadas por nível interno (1..6)
  const linhasDoCargo = useMemo(
    () =>
      cargos
        .filter((c) => c.cargo === cargo)
        .sort((a, b) => (a.nivel_num ?? 99) - (b.nivel_num ?? 99)),
    [cargos, cargo],
  );

  // Senioridades disponíveis (com mapeamento Nível N -> Júnior/Pleno/...)
  const senioridadesDisponiveis = useMemo(() => {
    const set = new Map<string, { label: string; nivel_num?: number }>();
    linhasDoCargo.forEach((c) => {
      const label =
        c.senioridade ||
        (c.nivel_num ? NIVEL_SENIORIDADE[c.nivel_num] : "") ||
        c.nivel;
      if (label && !set.has(label)) set.set(label, { label, nivel_num: c.nivel_num });
    });
    return Array.from(set.values());
  }, [linhasDoCargo]);

  // Linha selecionada (cargo + senioridade)
  const linhaSelecionada = useMemo(
    () =>
      linhasDoCargo.find(
        (c) =>
          (c.senioridade && c.senioridade === senioridade) ||
          (c.nivel_num && NIVEL_SENIORIDADE[c.nivel_num] === senioridade) ||
          c.nivel === senioridade,
      ) ?? null,
    [linhasDoCargo, senioridade],
  );

  // Faixas C1..C6 disponíveis para a linha selecionada
  const faixasDisponiveis = useMemo(() => {
    if (!linhaSelecionada?.faixas) return [];
    return FAIXAS_C.filter((f) => (linhaSelecionada.faixas as Record<string, number>)[f] > 0).map(
      (f) => ({ codigo: f, valor: (linhaSelecionada.faixas as Record<string, number>)[f] }),
    );
  }, [linhaSelecionada]);

  useEffect(() => {
    setSenioridade("");
    setFaixa("");
  }, [cargo]);
  useEffect(() => {
    setFaixa("");
  }, [senioridade]);

  const perfil: PerfilSelecionado | null = useMemo(() => {
    if (!cargo || !senioridade || !regime || !duracao) return null;
    if (!linhaSelecionada) return null;
    // Salário: faixa escolhida; se não houver faixas, salario_base da linha
    const salario =
      (faixa && linhaSelecionada.faixas?.[faixa]) ||
      (faixasDisponiveis.length === 0 ? linhaSelecionada.salario_base : 0);
    if (!salario) return null;
    return {
      cargo: linhaSelecionada.cargo,
      area: linhaSelecionada.area,
      nivel: `${senioridade}${faixa ? ` · ${faixa}` : ""}`,
      nivel_num: linhaSelecionada.nivel_num,
      faixa: faixa || undefined,
      descricao: linhaSelecionada.descricao,
      competencias: linhaSelecionada.competencias,
      salario_base: salario,
    };
  }, [cargo, senioridade, faixa, regime, duracao, linhaSelecionada, faixasDisponiveis]);

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
            <Label>Cargo</Label>
            <Select value={cargo} onValueChange={setCargo}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{cargosUnicos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Senioridade (mercado)</Label>
            <Select value={senioridade} onValueChange={setSenioridade} disabled={!cargo}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {senioridadesDisponiveis.map((s) => (
                  <SelectItem key={s.label} value={s.label}>
                    {s.label}{s.nivel_num ? ` (Nível ${s.nivel_num})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Internamente: Nível 1 = Júnior · 2 = Pleno · 3 = Sênior · 4 = Especialista...
            </p>
          </div>
          {faixasDisponiveis.length > 0 && (
            <div>
              <Label>Faixa Salarial (posição na faixa)</Label>
              <Select value={faixa} onValueChange={setFaixa} disabled={!senioridade}>
                <SelectTrigger><SelectValue placeholder="Selecione C1..C6" /></SelectTrigger>
                <SelectContent>
                  {faixasDisponiveis.map((f) => (
                    <SelectItem key={f.codigo} value={f.codigo}>
                      {f.codigo} — R$ {f.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                C1..C6 indica a posição do colaborador dentro da faixa salarial deste nível (não é senioridade).
              </p>
            </div>
          )}
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