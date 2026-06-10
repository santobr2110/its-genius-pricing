import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, Trash2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useKnowledgeBase, KbTipo } from "@/hooks/useKnowledgeBase";
import { parseCargosFile, parseDescritivosFile, CargoRow } from "@/lib/profissionais/parsers";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function BaseConhecimento() {
  const { rows, loading, upsert, remove } = useKnowledgeBase();
  const [busy, setBusy] = useState<KbTipo | null>(null);
  const cargosRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  async function handleCargos(file: File) {
    setBusy("cargos_salarios");
    try {
      const { rows: parsed, texto } = await parseCargosFile(file);
      if (parsed.length === 0) throw new Error("Nenhum cargo válido detectado no arquivo.");
      await upsert("cargos_salarios", {
        nome_arquivo: file.name,
        conteudo_parsed: parsed,
        conteudo_texto: texto,
        total_registros: parsed.length,
      });
      toast({ title: "Arquivo atualizado", description: `${parsed.length} cargos importados.` });
    } catch (e: any) {
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDescritivos(file: File) {
    setBusy("descritivos");
    try {
      const { texto, cargosIdentificados } = await parseDescritivosFile(file);
      await upsert("descritivos", {
        nome_arquivo: file.name,
        conteudo_texto: texto,
        conteudo_parsed: { cargos: cargosIdentificados },
        total_registros: cargosIdentificados.length,
      });
      toast({ title: "Descritivos atualizados", description: `${cargosIdentificados.length} cargos identificados.` });
    } catch (e: any) {
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const cargos = rows.cargos_salarios;
  const desc = rows.descritivos;
  const cargosOutdated = cargos && diasDesde(cargos.atualizado_em) > 30;
  const descOutdated = desc && diasDesde(desc.atualizado_em) > 30;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">
          Carregue e mantenha atualizados os documentos que alimentam a precificação e a IA.
        </p>
      </div>

      {(cargosOutdated || descOutdated) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Arquivos desatualizados</AlertTitle>
          <AlertDescription>Há mais de 30 dias sem atualização em pelo menos um dos arquivos.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cargos & Salários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Tabela de Cargos e Salários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : cargos ? (
              <>
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Arquivo:</span> {cargos.nome_arquivo}</div>
                  <div><span className="text-muted-foreground">Atualizado:</span> {new Date(cargos.atualizado_em).toLocaleString("pt-BR")}</div>
                  <div><span className="text-muted-foreground">Registros:</span> <Badge variant="secondary">{cargos.total_registros}</Badge></div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead className="text-right">Salário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cargos.conteudo_parsed as CargoRow[]).slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.cargo}</TableCell>
                        <TableCell>{r.area}</TableCell>
                        <TableCell>{r.nivel}</TableCell>
                        <TableCell className="text-right">R$ {r.salario_base.toLocaleString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum arquivo carregado ainda.</p>
            )}

            <div className="flex gap-2">
              <input
                ref={cargosRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCargos(e.target.files[0])}
              />
              <Button onClick={() => cargosRef.current?.click()} disabled={busy === "cargos_salarios"}>
                {busy === "cargos_salarios" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Atualizar Arquivo
              </Button>
              {cargos && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar tabela de cargos?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação remove o arquivo da Base de Conhecimento.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove("cargos_salarios")}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Descritivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Descritivos de Cargos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : desc ? (
              <>
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Arquivo:</span> {desc.nome_arquivo}</div>
                  <div><span className="text-muted-foreground">Atualizado:</span> {new Date(desc.atualizado_em).toLocaleString("pt-BR")}</div>
                  <div><span className="text-muted-foreground">Cargos identificados:</span> <Badge variant="secondary">{desc.total_registros}</Badge></div>
                </div>
                <div className="max-h-48 overflow-auto rounded border p-2 text-xs space-y-0.5">
                  {(desc.conteudo_parsed?.cargos ?? []).slice(0, 30).map((c: string, i: number) => (
                    <div key={i}>• {c}</div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum arquivo carregado ainda.</p>
            )}

            <div className="flex gap-2">
              <input
                ref={descRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleDescritivos(e.target.files[0])}
              />
              <Button onClick={() => descRef.current?.click()} disabled={busy === "descritivos"}>
                {busy === "descritivos" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Atualizar Arquivo
              </Button>
              {desc && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar descritivos?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação remove o arquivo da Base de Conhecimento.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove("descritivos")}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}