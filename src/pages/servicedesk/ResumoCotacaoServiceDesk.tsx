import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Presentation } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { brl, pct, vol } from "@/lib/servicedesk/format";
import { exportarApresentacaoServiceDesk } from "@/lib/servicedesk/exportarApresentacaoServiceDesk";
import { JANELA_LABEL } from "@/lib/servicedesk/coberturaFTE";
import { ITSM_TIPO_LABEL, MODALIDADE_LABEL, REGIME_LABEL } from "@/lib/servicedesk/regimeCusto";
import { SLA_LABEL } from "@/lib/servicedesk/types";
import { usePricingApproval } from "@/hooks/usePricingApproval";

export default function ResumoCotacaoServiceDesk() {
  const { can } = useAuth();
  const { state, results, itens, valorItem } = useServiceDesk();
  const [exporting, setExporting] = useState(false);

  const approval = usePricingApproval({
    offering: "smart-service-desk",
    targetType: "pricing_preset",
    targetId: null,
    rentPct: results.rentabilidadePct,
  });

  const exportBlocked = !can("sd.pricing.export");

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportarApresentacaoServiceDesk({
        state,
        results,
        itens,
        valorItem,
        watermark: approval.watermark,
      });
      toast.success("Apresentação gerada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  const itensAtivos = itens.filter((i) => i.ativo);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">Resumo de Cotação — Smart Service Desk</h1>
        {approval.requiresApproval && (
          <Badge variant="secondary">{approval.statusLabel}</Badge>
        )}
        <div className="ml-auto">
          {exportBlocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled className="gap-1.5">
                    <Presentation className="h-3.5 w-3.5" /> Exportar apresentação
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Você não tem permissão para exportar propostas do Service Desk.</TooltipContent>
            </Tooltip>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={handleExport} disabled={exporting}>
              <Presentation className="h-3.5 w-3.5" /> {exporting ? "Gerando…" : "Exportar apresentação"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Condições da operação</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow><TableCell>Modalidade</TableCell><TableCell className="text-right">{MODALIDADE_LABEL[state.modalidade]}</TableCell></TableRow>
              <TableRow><TableCell>Ferramenta ITSM (gestão de chamados)</TableCell><TableCell className="text-right">{ITSM_TIPO_LABEL[state.itsmTipo]}</TableCell></TableRow>
              <TableRow><TableCell>Regime de custo</TableCell><TableCell className="text-right">{REGIME_LABEL[results.regime]}</TableCell></TableRow>
              <TableRow><TableCell>Janela de atendimento</TableCell><TableCell className="text-right">{JANELA_LABEL[state.janelaCobertura]}</TableCell></TableRow>
              <TableRow><TableCell>Nível de SLA (acordo de nível de serviço)</TableCell><TableCell className="text-right">{SLA_LABEL[state.nivelSLA]}</TableCell></TableRow>
              <TableRow><TableCell>Usuários atendidos</TableCell><TableCell className="text-right">{vol(state.qtdUsuariosPadrao + state.qtdUsuariosVIP)}</TableCell></TableRow>
              <TableRow><TableCell>FTE contratado (profissionais em tempo integral)</TableCell><TableCell className="text-right">{vol(results.cobertura.fteContratado)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Composição de custo</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow><TableCell>Equipe</TableCell><TableCell className="text-right">{brl(results.custoEquipe)}</TableCell></TableRow>
              <TableRow><TableCell>Plataforma de atendimento (por Unidade de Medida — UM)</TableCell><TableCell className="text-right">{brl(results.custoPlataforma)}</TableCell></TableRow>
              <TableRow><TableCell>Bolsa de horas de escalonamento</TableCell><TableCell className="text-right">{brl(results.custoBolsaHoras)}</TableCell></TableRow>
              <TableRow><TableCell>Canais adicionais</TableCell><TableCell className="text-right">{brl(results.custoCanaisAdicionais)}</TableCell></TableRow>
              <TableRow><TableCell>Base de Conhecimento</TableCell><TableCell className="text-right">{brl(results.custoBaseConhecimento)}</TableCell></TableRow>
              <TableRow><TableCell>Chatbot com IA</TableCell><TableCell className="text-right">{brl(results.custoChatbot)}</TableCell></TableRow>
              <TableRow><TableCell>Rotinas avançadas</TableCell><TableCell className="text-right">{brl(results.custoRotinasAvancadas)}</TableCell></TableRow>
              <TableRow><TableCell>Fator de SLA</TableCell><TableCell className="text-right">{results.fatorSLAAplicado.toFixed(2)}x</TableCell></TableRow>
              <TableRow className="font-semibold"><TableCell>Custo total mensal</TableCell><TableCell className="text-right">{brl(results.custoTotalMensal)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {itensAtivos.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Itens adicionais</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Item</TableHead><TableHead>Cobrança</TableHead><TableHead className="text-right">Valor de venda</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {itensAtivos.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs">{i.descricao}</TableCell>
                    <TableCell className="text-xs">{i.cobranca === "one-time" ? "Valor único" : "Mensal"}</TableCell>
                    <TableCell className="text-right text-xs">{brl(valorItem(i).valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Investimento</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow className="font-semibold"><TableCell>Preço de venda mensal</TableCell><TableCell className="text-right">{brl(results.precoVendaMensal)}</TableCell></TableRow>
              <TableRow><TableCell>Investimento por usuário</TableCell><TableCell className="text-right">{brl(results.precoPorUsuario)}</TableCell></TableRow>
              <TableRow><TableCell>Investimento por chamado atendido</TableCell><TableCell className="text-right">{brl(results.precoPorChamado)}</TableCell></TableRow>
              <TableRow><TableCell>Valores únicos de implantação</TableCell><TableCell className="text-right">{brl(results.custoOneTime)}</TableCell></TableRow>
              <TableRow><TableCell>Rentabilidade</TableCell><TableCell className="text-right">{pct(results.rentabilidadePct)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}