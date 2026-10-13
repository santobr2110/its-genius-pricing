import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { listarPendencias } from "@/lib/treinamento/pendencias";
import CursosTab from "./CursosTab";
import ConteudoTab from "./ConteudoTab";
import CombosTab from "./CombosTab";
import ParametrosTab from "./ParametrosTab";
import PendenciasTab from "./PendenciasTab";

export default function TreinamentoAdminTab() {
  const data = useTreinamentoCadastro();
  if (data.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (data.error) return <p className="text-sm text-destructive">Não foi possível carregar o cadastro do Treinamento.</p>;
  const pend = listarPendencias(data.courses, data.contents, data.params);
  return (
    <Tabs defaultValue="cursos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="cursos">Cursos</TabsTrigger>
        <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
        <TabsTrigger value="combos">Combos</TabsTrigger>
        <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
        <TabsTrigger value="pendencias" className="gap-1.5">
          Pendências {pend.length > 0 && <Badge variant="secondary" className="h-5 px-1.5">{pend.length}</Badge>}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="cursos"><CursosTab {...data} /></TabsContent>
      <TabsContent value="conteudo"><ConteudoTab {...data} /></TabsContent>
      <TabsContent value="combos"><CombosTab {...data} /></TabsContent>
      <TabsContent value="parametros"><ParametrosTab {...data} /></TabsContent>
      <TabsContent value="pendencias"><PendenciasTab pendencias={pend} /></TabsContent>
    </Tabs>
  );
}

export type CadastroProps = ReturnType<typeof useTreinamentoCadastro>;
