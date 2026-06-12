import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { calcularPrecificacao, formatBRL } from "@/lib/profissionais/calc";
import { useConfigPrecificacao } from "@/hooks/useConfigPrecificacao";
import { useCotacoes } from "@/hooks/useCotacoes";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface PerfilSelecionado {
  cargo: string;
  area: string;
  nivel: string;
  descricao?: string;
  competencias?: string[];
  salario_base: number;
  faixa?: string;
  nivel_num?: number;
}

export interface DadosIA {
  descricao_original: string;
  justificativa: string;
  indice_aderencia: number;
  competencias_chave: string[];
}

export interface PainelResultadoProps {
  perfil: PerfilSelecionado | null;
  origem: "manual" | "ia";
  dadosIA?: DadosIA;
}

export default function PainelResultado({ perfil, origem, dadosIA }: PainelResultadoProps) {
  const { config, update } = useConfigPrecificacao();
  const { save } = useCotacoes();
  const [salarioOverride, setSalarioOverride] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cliente, setCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [validade, setValidade] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const salario = salarioOverride ?? perfil?.salario_base ?? 0;

  const calc = useMemo(
    () =>
      calcularPrecificacao({
        salario,
        encargosPct: config.encargos_pct,
        overheadPct: config.overhead_pct,
        margemPct: config.margem_pct,
        horasMensais: config.horas_mensais,
      }),
    [salario, config],
  );

  if (!perfil) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Selecione um perfil para visualizar a precificação.
        </CardContent>
      </Card>
    );
  }

  async function handleSave() {
    if (!cliente.trim()) {
      toast({ title: "Informe o cliente", variant: "destructive" });
      return;
    }
    try {
      await save({
        cliente: cliente.trim(),
        observacoes: observacoes.trim() || null,
        origem,
        valida_ate: validade,
        cargo: perfil!.cargo,
        area: perfil!.area,
        nivel: perfil!.nivel,
        descricao_cargo: perfil!.descricao ?? null,
        competencias: perfil!.competencias ?? null,
        salario_base: salario,
        encargos_pct: config.encargos_pct,
        overhead_pct: config.overhead_pct,
        margem_pct: config.margem_pct,
        horas_mensais: config.horas_mensais,
        custo_total: calc.custoTotal,
        valor_venda: calc.valorVenda,
        valor_hora: calc.valorHora,
        valor_sprint: calc.valorSprint,
        ia_descricao_original: dadosIA?.descricao_original ?? null,
        ia_justificativa: dadosIA?.justificativa ?? null,
        ia_indice_aderencia: dadosIA?.indice_aderencia ?? null,
        ia_competencias_chave: dadosIA?.competencias_chave ?? null,
      });
      toast({ title: "Cotação salva com sucesso!" });
      setDialogOpen(false);
      setCliente("");
      setObservacoes("");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {perfil.cargo}
            <Badge variant="secondary">{perfil.nivel}</Badge>
          </CardTitle>
          <div className="text-sm text-muted-foreground">{perfil.area}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          {perfil.descricao && <p className="text-sm">{perfil.descricao}</p>}
          {perfil.competencias && perfil.competencias.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {perfil.competencias.map((c, i) => (
                <Badge key={i} variant="outline">{c}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Parâmetros de Precificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label>Salário Base (R$)</Label>
            <Input
              type="number"
              value={salario}
              onChange={(e) => setSalarioOverride(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Encargos (%)</Label>
            <Input type="number" value={config.encargos_pct} onChange={(e) => update({ encargos_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Overhead (%)</Label>
            <Input type="number" value={config.overhead_pct} onChange={(e) => update({ overhead_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Margem (%)</Label>
            <Input type="number" value={config.margem_pct} onChange={(e) => update({ margem_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="col-span-2">
            <Label>Carga Horária Mensal (h)</Label>
            <Input type="number" value={config.horas_mensais} onChange={(e) => update({ horas_mensais: parseInt(e.target.value) || 0 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Custo Total Mensal</span>
            <span className="font-medium">{formatBRL(calc.custoTotal)}</span>
          </div>
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">💰 Valor de Venda Sugerido</div>
            <div className="text-3xl font-bold text-primary mt-1">{formatBRL(calc.valorVenda)}</div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor por Hora</span>
            <span className="font-medium">{formatBRL(calc.valorHora)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor por Sprint (80h)</span>
            <span className="font-medium">{formatBRL(calc.valorSprint)}</span>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full"><Save className="h-4 w-4 mr-2" /> Salvar Cotação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Salvar Cotação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cliente / Projeto *</Label>
                  <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Origem</Label>
                    <Input value={origem === "ia" ? "IA" : "Manual"} disabled />
                  </div>
                  <div>
                    <Label>Validade</Label>
                    <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}