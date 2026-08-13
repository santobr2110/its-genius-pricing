import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { brl, pct, vol } from "@/lib/servicedesk/format";
import { CANAL_LABEL } from "@/lib/servicedesk/funilAtendimento";
import { JANELA_LABEL } from "@/lib/servicedesk/coberturaFTE";
import { MODALIDADE_LABEL, REGIME_LABEL } from "@/lib/servicedesk/regimeCusto";

export default function RelatorioDemandaServiceDesk() {
  const { state, results } = useServiceDesk();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Relatório de Demanda — Smart Service Desk</CardTitle>
          <p className="text-xs text-muted-foreground">
            {MODALIDADE_LABEL[state.modalidade]} · {JANELA_LABEL[state.janelaCobertura]} · {REGIME_LABEL[results.regime]}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Etapa do funil</TableHead><TableHead className="text-right">Chamados/mês</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>Volume bruto de contatos</TableCell><TableCell className="text-right">{vol(results.funil.volumeBruto)}</TableCell></TableRow>
              <TableRow><TableCell>Desviado por autoatendimento</TableCell><TableCell className="text-right">−{vol(results.funil.desviadoAutoatendimento)}</TableCell></TableRow>
              <TableRow><TableCell>Resolvido na triagem (N0)</TableCell><TableCell className="text-right">−{vol(results.funil.resolvidoTriagem)}</TableCell></TableRow>
              <TableRow className="font-semibold"><TableCell>Atendidos no N1</TableCell><TableCell className="text-right">{vol(results.funil.chamadosN1)}</TableCell></TableRow>
              <TableRow><TableCell>Escalonados para N2/N3</TableCell><TableCell className="text-right">{vol(results.funil.chamadosEscalonados)}</TableCell></TableRow>
              <TableRow><TableCell>Taxa total de desvio</TableCell><TableCell className="text-right">{pct(results.funil.taxaDesvioTotalPct)}</TableCell></TableRow>
            </TableBody>
          </Table>

          <Table>
            <TableHeader>
              <TableRow><TableHead>Dimensionamento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              <TableRow><TableCell>FTE por volume</TableCell><TableCell className="text-right">{vol(results.cobertura.fteVolume)}</TableCell></TableRow>
              <TableRow><TableCell>Piso mínimo da janela</TableCell><TableCell className="text-right">{vol(results.cobertura.ftePiso)}</TableCell></TableRow>
              <TableRow className="font-semibold"><TableCell>FTE contratado (vinculante)</TableCell><TableCell className="text-right">{vol(results.cobertura.fteContratado)}</TableCell></TableRow>
              <TableRow><TableCell>Unidades de medida (UM)</TableCell><TableCell className="text-right">{vol(results.umTotal)}</TableCell></TableRow>
              <TableRow><TableCell>Custo de plataforma</TableCell><TableCell className="text-right">{brl(results.custoPlataforma)}</TableCell></TableRow>
              <TableRow><TableCell>Canais contratados</TableCell><TableCell className="text-right">{state.canais.map((c) => CANAL_LABEL[c]).join(", ") || "—"}</TableCell></TableRow>
            </TableBody>
          </Table>

          <Table>
            <TableHeader>
              <TableRow><TableHead>Bolsa de horas de escalonamento</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="text-right">%</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {([
                ["Chamados escalonados", results.distribuicaoHoras.chamados],
                ["Rotinas preventivas", results.distribuicaoHoras.rotinas],
                ["Horas de melhoria", results.distribuicaoHoras.melhoria],
                ["Horas técnicas", results.distribuicaoHoras.tecnicas],
              ] as [string, number][]).map(([label, h]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right">{vol(h)}</TableCell>
                  <TableCell className="text-right">{pct(results.distribuicaoHoras.pct(h))}</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell>Total contratado</TableCell>
                <TableCell className="text-right">{vol(results.distribuicaoHoras.total)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}