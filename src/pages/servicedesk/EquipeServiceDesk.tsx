import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import WriteFence from "@/components/auth/WriteFence";
import { useServiceDesk } from "@/contexts/ServiceDeskContext";
import { brl, vol } from "@/lib/servicedesk/format";

export default function EquipeServiceDesk() {
  const { team } = useServiceDesk();
  const { teamState, updateProfessional, addProfessional, removeProfessional, moveProfessional, results } = team;

  return (
    <WriteFence permission="page.sd.equipe.write" anyOf={["sd.teams.edit"]}>
      <div className="mx-auto max-w-6xl space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Equipe Smart Service Desk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="w-20">Qtd</TableHead>
                  <TableHead className="w-32">Salário base</TableHead>
                  <TableHead className="w-24">Encargos % (INSS, FGTS, férias, 13º)</TableHead>
                  <TableHead className="w-32">Benefícios</TableHead>
                  <TableHead className="w-28">Indiretos % (estrutura e gestão)</TableHead>
                  <TableHead className="w-24">Escala</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamState.professionals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><Input className="h-8" value={p.cargo} onChange={(e) => updateProfessional(p.id, "cargo", e.target.value)} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={p.quantidade} onChange={(e) => updateProfessional(p.id, "quantidade", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={p.salarioBase} onChange={(e) => updateProfessional(p.id, "salarioBase", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={p.encargosPerc} onChange={(e) => updateProfessional(p.id, "encargosPerc", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={p.beneficiosFixo} onChange={(e) => updateProfessional(p.id, "beneficiosFixo", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input className="h-8" type="number" value={p.custosIndiretosPerc} onChange={(e) => updateProfessional(p.id, "custosIndiretosPerc", Number(e.target.value) || 0)} /></TableCell>
                    <TableCell><Input className="h-8" value={p.escala} onChange={(e) => updateProfessional(p.id, "escala", e.target.value)} /></TableCell>
                    <TableCell className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveProfessional(p.id, -1)}><ChevronUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveProfessional(p.id, 1)}><ChevronDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProfessional(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" className="gap-1" onClick={addProfessional}>
              <Plus className="h-3.5 w-3.5" /> Adicionar profissional
            </Button>
            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Folha</p><p className="font-semibold">{brl(results.custoTotalFolha)}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Encargos</p><p className="font-semibold">{brl(results.custoTotalEncargos)}</p></div>
              <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Benefícios + indiretos</p><p className="font-semibold">{brl(results.custoTotalBeneficios + results.custoTotalIndiretos)}</p></div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Custo total ({vol(results.totalPessoas)} pessoas)</p>
                <p className="font-semibold">{brl(results.custoTotalEquipe)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WriteFence>
  );
}