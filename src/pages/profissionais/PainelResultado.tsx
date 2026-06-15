import { useEffect, useMemo, useState } from "react";
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
import { useProfFinanceiro, markupDivisorPctProf } from "@/hooks/useProfFinanceiro";
import { useCotacoes } from "@/hooks/useCotacoes";
import { Save, Link as LinkIcon, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const { state: config, update } = useProfFinanceiro();
  const { save } = useCotacoes();
  const { can } = useAuth();
  const [salarioOverride, setSalarioOverride] = useState<number | null>(null);
  const [beneficioOverride, setBeneficioOverride] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cliente, setCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [validade, setValidade] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const salario = salarioOverride ?? perfil?.salario_base ?? 0;
  const beneficio = beneficioOverride ?? config.beneficioFixo ?? 0;
  const markupPct = markupDivisorPctProf(config);

  const calc = useMemo(
    () =>
      calcularPrecificacao({
        salario,
        encargosPct: config.encargosPerc,
        overheadPct: config.overheadPerc,
        markupDivisorPct: markupPct,
        horasMensais: config.horasMensais,
        beneficio,
      }),
    [salario, beneficio, config, markupPct],
  );

  // Escuta o botão "Precificações → Salvar" do header
  useEffect(() => {
    function open() {
      if (!perfil) {
        toast({ title: "Selecione um perfil antes de salvar", variant: "destructive" });
        return;
      }
      setDialogOpen(true);
    }
    window.addEventListener("prof:save-cotacao", open);
    return () => window.removeEventListener("prof:save-cotacao", open);
  }, [perfil]);

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
        encargos_pct: config.encargosPerc,
        overhead_pct: config.overheadPerc,
        margem_pct: config.lucroPerc,
        impostos_pct: config.pisPerc + config.cofinsPerc + config.issPerc,
        comissao_pct: config.comissaoPerc,
        horas_mensais: config.horasMensais,
        custo_total: calc.custoTotal,
        valor_venda: calc.valorVenda,
        valor_hora: calc.valorHora,
        valor_sprint: calc.valorSprint,
        scope: "profissionais",
        extras: {
          pis_pct: config.pisPerc,
          cofins_pct: config.cofinsPerc,
          iss_pct: config.issPerc,
          irpj_csll_pct: config.irpjCsllPerc,
          enc_financ_pct: config.encFinancPerc,
          lucro_pct: config.lucroPerc,
          markup_divisor_pct: markupPct,
          beneficio,
          faixa: perfil!.faixa ?? null,
          nivel_num: perfil!.nivel_num ?? null,
        },
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
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Parâmetros de Precificação</span>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/profissionais-alocados/financeiro"><LinkIcon className="h-3 w-3 mr-1" /> Editar no Financeiro</Link>
            </Button>
          </CardTitle>
        </CardHeader>
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
            <Label>Benefícios (R$/mês)</Label>
            <Input
              type="number"
              value={beneficio}
              step={50}
              onChange={(e) => setBeneficioOverride(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Encargos (%)</Label>
            <Input type="number" value={config.encargosPerc} disabled />
          </div>
          <div>
            <Label>Overhead (%)</Label>
            <Input type="number" value={config.overheadPerc} disabled />
          </div>
          <div>
            <Label>Σ Markup Divisor (%)</Label>
            <Input type="number" value={markupPct.toFixed(2)} disabled />
          </div>
          <div>
            <Label>Horas Mensais</Label>
            <Input type="number" value={config.horasMensais} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Rentabilidade Desejada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Ajuste a rentabilidade desta operação. O valor altera o slider em
              <strong> Financeiro › Impostos &amp; Markup</strong> e recalcula a comissão.
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={60}
                step={0.5}
                value={config.lucroPerc}
                onChange={(e) => update("lucroPerc", Math.max(0, Math.min(60, parseFloat(e.target.value) || 0)))}
                className="h-8 w-20 text-right font-mono"
              />
              <span className="text-sm font-medium">%</span>
            </div>
          </div>
          <Slider
            value={[config.lucroPerc]}
            min={0}
            max={60}
            step={0.5}
            onValueChange={(v) => update("lucroPerc", v[0] ?? 0)}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Comissão sincronizada: <strong>{config.comissaoPerc.toFixed(2)}%</strong></span>
            <span>Markup divisor: <strong>{markupPct.toFixed(2)}%</strong></span>
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
          <div className="text-[11px] text-muted-foreground">
            Salário × (1+Encargos) × (1+Overhead) + Benefícios — markup divisor {markupPct.toFixed(2)}%
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

          {can("prof.pricing.save") && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}