import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ITSMState, ITSMResults, formatNumber } from "@/hooks/useITSMCalculator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList } from "lucide-react";

interface Props {
  state: ITSMState;
  results: ITSMResults;
}

export default function DetailPanel({ state, results }: Props) {
  const rows = [
    { label: "Total de Chamados N1", value: formatNumber(results.volumeN1), desc: `${state.percN1}% do funil humano` },
    { label: "Total de Chamados N2", value: formatNumber(results.volumeN2), desc: `${state.percN2}% do funil humano` },
    { label: "Total de Chamados N3", value: formatNumber(results.volumeN3), desc: `${state.percN3}% do funil humano` },
    { label: "", value: "", desc: "", separator: true },
    { label: "Chamados de Usuários", value: formatNumber(results.chamadosUsuarios), desc: `${formatNumber(state.qtdUsuarios)} × ${state.taxaUsuario}` },
    { label: "Chamados de Servidores", value: formatNumber(results.chamadosServidores), desc: `${formatNumber(state.qtdServidores)} × ${state.taxaServidor}` },
    { label: "Chamados de Rede", value: formatNumber(results.chamadosRede), desc: `${formatNumber(state.qtdAtivosRede)} × ${state.taxaRede}` },
    { label: "Chamados de Banco de Dados", value: formatNumber(results.chamadosBancoDados), desc: `${formatNumber(state.qtdBancosDados)} × ${state.taxaBancoDados}` },
    { label: "Chamados de Sistemas", value: formatNumber(results.chamadosSistemas), desc: `${formatNumber(state.qtdSistemas)} × ${state.taxaSistemas}` },
    { label: "", value: "", desc: "", separator: true },
    { label: "Chamados no N3 (total)", value: formatNumber(results.volumeN3), desc: `${state.percN3}% do funil humano` },
    { label: "  ↳ de Servidores no N3", value: formatNumber(results.chamadosServidores * (state.percN3 / 100), 1), desc: `${formatNumber(results.chamadosServidores)} × ${state.percN3}%` },
    { label: "  ↳ de Usuários no N3", value: formatNumber(results.chamadosUsuarios * (state.percN3 / 100), 1), desc: `${formatNumber(results.chamadosUsuarios)} × ${state.percN3}%` },
    { label: "  ↳ de Rede no N3", value: formatNumber(results.chamadosRede * (state.percN3 / 100), 1), desc: `${formatNumber(results.chamadosRede)} × ${state.percN3}%` },
    { label: "  ↳ de BD no N3", value: formatNumber(results.chamadosBancoDados * (state.percN3 / 100), 1), desc: `${formatNumber(results.chamadosBancoDados)} × ${state.percN3}%` },
    { label: "  ↳ de Sistemas no N3", value: formatNumber(results.chamadosSistemas * (state.percN3 / 100), 1), desc: `${formatNumber(results.chamadosSistemas)} × ${state.percN3}%` },
    { label: "", value: "", desc: "", separator: true },
    { label: "Horas Totais N3", value: `${formatNumber(results.horasN3)}h`, desc: "Inserido no inventário" },
    { label: "Horas Atendimento N3", value: `${formatNumber(results.horasAtendimentoN3, 1)}h`, desc: `${state.percN3}% (funil N3) das horas` },
    { label: "Horas Disponíveis Prevenção", value: `${formatNumber(results.horasPrevencao, 1)}h`, desc: "Total N3 − Atendimento", highlight: true },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4 text-primary" />
          Detalhamento dos Cálculos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Métrica</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
              <TableHead className="text-xs text-muted-foreground">Base</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) =>
              row.separator ? (
                <TableRow key={i}>
                  <TableCell colSpan={3} className="p-0">
                    <div className="border-t my-1" />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={i}>
                  <TableCell className={`text-xs py-2 ${row.highlight ? "font-semibold text-primary" : ""}`}>
                    {row.label}
                  </TableCell>
                  <TableCell className={`text-xs py-2 text-right font-bold ${row.highlight ? "text-primary" : ""}`}>
                    {row.value}
                  </TableCell>
                  <TableCell className="text-[10px] py-2 text-muted-foreground">
                    {row.desc}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
