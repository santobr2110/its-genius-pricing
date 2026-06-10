import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PainelResultado, { PerfilSelecionado, DadosIA } from "./PainelResultado";
import { toast } from "@/hooks/use-toast";

export default function PrecificacaoIA() {
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState<PerfilSelecionado | null>(null);
  const [dados, setDados] = useState<DadosIA | undefined>();

  async function analisar() {
    if (!descricao.trim()) return;
    setLoading(true);
    setPerfil(null);
    try {
      const { data, error } = await supabase.functions.invoke("precificacao-ia", {
        body: { descricao },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPerfil({
        cargo: data.cargo_identificado,
        area: data.area,
        nivel: data.nivel_senioridade,
        salario_base: Number(data.salario_base) || 0,
        competencias: data.competencias_chave ?? [],
      });
      setDados({
        descricao_original: descricao,
        justificativa: data.justificativa,
        indice_aderencia: Number(data.indice_aderencia) || 0,
        competencias_chave: data.competencias_chave ?? [],
      });
    } catch (e: any) {
      toast({ title: "Erro na análise por IA", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const aderencia = dados?.indice_aderencia ?? 0;
  const corAderencia = aderencia >= 80 ? "bg-green-500" : aderencia >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Descrição da Vaga</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={10}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a necessidade técnica da vaga e o perfil esperado de atuação. Quanto mais detalhes você fornecer sobre responsabilidades, tecnologias envolvidas e contexto do projeto, mais precisa será a recomendação da IA."
            />
            <p className="text-xs text-muted-foreground">
              Ex: Preciso de um profissional para liderar a migração de ambientes VMware legados para nuvem híbrida, com experiência em Ansible e Terraform, capaz de interagir com times de negócio e documentar a arquitetura resultante. Projeto de 8 meses.
            </p>
            <Button onClick={analisar} disabled={loading || !descricao.trim()} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A IA está analisando sua descrição e consultando a base de cargos...</> : "Analisar com IA e Calcular Valor"}
            </Button>
          </CardContent>
        </Card>

        {dados && (
          <Card>
            <CardHeader><CardTitle className="text-base">Por que a IA escolheu este perfil</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{dados.justificativa}</p>
              {dados.competencias_chave.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dados.competencias_chave.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}
                </div>
              )}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Aderência do perfil à descrição da vaga</span>
                  <span className="font-semibold">{aderencia}%</span>
                </div>
                <div className="h-2 w-full rounded bg-muted overflow-hidden">
                  <div className={`h-full ${corAderencia} transition-all`} style={{ width: `${Math.min(100, Math.max(0, aderencia))}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PainelResultado perfil={perfil} origem="ia" dadosIA={dados} />
    </div>
  );
}