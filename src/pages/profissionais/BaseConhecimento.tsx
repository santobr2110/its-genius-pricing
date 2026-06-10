import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, Trash2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useKnowledgeBase, KbTipo, KbRow } from "@/hooks/useKnowledgeBase";
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
  const { byTipo, loading, add, removeOne, removeAll } = useKnowledgeBase();
  const [busy, setBusy] = useState<KbTipo | null>(null);
  const cargosRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  async function handleCargos(files: FileList) {
    setBusy("cargos_salarios");
    try {
      let total = 0;
      for (const file of Array.from(files)) {
        const { rows: parsed, texto } = await parseCargosFile(file);
        if (parsed.length === 0) {
          toast({ title: `Ignorado: ${file.name}`, description: "Nenhum cargo válido detectado.", variant: "destructive" });
          continue;
        }
        await add("cargos_salarios", {
          nome_arquivo: file.name,
          conteudo_parsed: parsed,
          conteudo_texto: texto,
          total_registros: parsed.length,
        });
        total += parsed.length;
      }
      if (total > 0) toast({ title: "Arquivos adicionados", description: `${total} cargos importados.` });
    } catch (e: any) {
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDescritivos(files: FileList) {
    setBusy("descritivos");
    try {
      let totalArquivos = 0;
      for (const file of Array.from(files)) {
        const { texto, cargosIdentificados } = await parseDescritivosFile(file);
        await add("descritivos", {
          nome_arquivo: file.name,
          conteudo_texto: texto,
          conteudo_parsed: { cargos: cargosIdentificados },
          total_registros: cargosIdentificados.length,
        });
        totalArquivos++;
      }
      if (totalArquivos > 0) toast({ title: "Descritivos adicionados", description: `${totalArquivos} arquivo(s) processado(s).` });
    } catch (e: any) {
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const cargosList = byTipo.cargos_salarios;
  const descList = byTipo.descritivos;
  const cargosOutdated = useMemo(
    () => cargosList.length > 0 && cargosList.every((r) => diasDesde(r.atualizado_em) > 30),
    [cargosList],
  );
  const descOutdated = useMemo(
    () => descList.length > 0 && descList.every((r) => diasDesde(r.atualizado_em) > 30),
    [descList],
  );
  const totalCargos = useMemo(() => cargosList.reduce((s, r) => s + (r.total_registros ?? 0), 0), [cargosList]);
  const totalDesc = useMemo(() => descList.reduce((s, r) => s + (r.total_registros ?? 0), 0), [descList]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">
          Carregue e mantenha atualizados os documentos que alimentam a precificação e a IA. Você pode adicionar quantos arquivos quiser de cada tipo.
        </p>
      </div>

      {(cargosOutdated || descOutdated) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Arquivos desatualizados</AlertTitle>
          <AlertDescription>Há mais de 30 dias sem atualização em todos os arquivos de um tipo.</AlertDescription>
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
            ) : cargosList.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {cargosList.length} arquivo(s) · <Badge variant="secondary">{totalCargos}</Badge> registros no total
                </div>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {cargosList.map((r) => (
                    <FileRow key={r.id} row={r} onRemove={() => removeOne(r.id)} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum arquivo carregado ainda.</p>
            )}

            <div className="flex gap-2">
              <input
                ref={cargosRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) handleCargos(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => cargosRef.current?.click()} disabled={busy === "cargos_salarios"}>
                {busy === "cargos_salarios" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Adicionar Arquivos
              </Button>
              {cargosList.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline"><Trash2 className="h-4 w-4 mr-2" /> Limpar tudo</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar todos os arquivos de cargos?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação remove todos os arquivos de cargos e salários da Base de Conhecimento.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeAll("cargos_salarios")}>Remover</AlertDialogAction>
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
            ) : descList.length > 0 ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {descList.length} arquivo(s) · <Badge variant="secondary">{totalDesc}</Badge> cargos identificados no total
                </div>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {descList.map((r) => (
                    <FileRow key={r.id} row={r} onRemove={() => removeOne(r.id)} />
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
                multiple
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) handleDescritivos(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => descRef.current?.click()} disabled={busy === "descritivos"}>
                {busy === "descritivos" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Adicionar Arquivos
              </Button>
              {descList.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline"><Trash2 className="h-4 w-4 mr-2" /> Limpar tudo</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar todos os descritivos?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação remove todos os descritivos da Base de Conhecimento.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeAll("descritivos")}>Remover</AlertDialogAction>
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

function FileRow({ row, onRemove }: { row: KbRow; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{row.nome_arquivo}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(row.atualizado_em).toLocaleString("pt-BR")} · {row.total_registros ?? 0} registros
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remover arquivo">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}