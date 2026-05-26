import { Link } from "react-router-dom";
import { ListChecks, RotateCcw } from "lucide-react";
import SortableNav from "@/components/SortableNav";
import BackHomeButton from "@/components/BackHomeButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useAuth } from "@/contexts/AuthContext";
import {
  CAMADA_LABEL, CAMADA_ORDEM, ESCOPO_DEFAULT, ESCOPO_STORAGE_KEY,
  RESTRICOES_GERAIS_DEFAULT, RESTRICOES_GERAIS_STORAGE_KEY,
  type CamadaKey, type EscopoCamada, type EscopoProposicao,
} from "@/data/escopoProposicao";

// Mantém linhas vazias durante a edição para permitir adicionar novas linhas
// (a filtragem só ocorre na renderização do relatório).
const linesToList = (s: string) => s.split("\n");
const listToLines = (xs: string[]) => xs.join("\n");

export default function Escopo() {
  const { can } = useAuth();
  const canEdit = can("page.detalhamento.write");
  const [escopo, setEscopo] = usePersistentState<EscopoProposicao>(
    ESCOPO_STORAGE_KEY,
    ESCOPO_DEFAULT,
  );
  const [restricoesGerais, setRestricoesGerais] = usePersistentState<string[]>(
    RESTRICOES_GERAIS_STORAGE_KEY,
    RESTRICOES_GERAIS_DEFAULT,
  );

  const updateCamada = (key: CamadaKey, patch: Partial<EscopoCamada>) => {
    setEscopo((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const resetCamada = (key: CamadaKey) => {
    setEscopo((prev) => ({ ...prev, [key]: ESCOPO_DEFAULT[key] }));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-3 px-4">
          <BackHomeButton />
          <Link to="/ito" className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
            <ListChecks className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-foreground truncate">Escopo da Proposição</h1>
          </Link>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <SortableNav current="taxas" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdo do Relatório de Proposição</CardTitle>
            <p className="text-xs text-muted-foreground">
              Edite os textos exibidos em cada camada da proposta comercial e as restrições de
              atuação. Os itens incluídos aparecem na seção <strong>“O que está incluído”</strong>
              {" "}de cada camada, e as restrições são apresentadas em um bloco compacto ao final do
              relatório.
            </p>
          </CardHeader>
        </Card>

        {CAMADA_ORDEM.map((key) => {
          const c = escopo[key];
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {CAMADA_LABEL[key]}
                    </Badge>
                    <CardTitle className="text-base">{c.titulo}</CardTitle>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs"
                    onClick={() => resetCamada(key)}
                    disabled={!canEdit}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título</Label>
                    <Input
                      value={c.titulo}
                      onChange={(e) => updateCamada(key, { titulo: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tagline (subtítulo curto)</Label>
                    <Input
                      value={c.tagline}
                      onChange={(e) => updateCamada(key, { tagline: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    rows={3}
                    value={c.descricao}
                    onChange={(e) => updateCamada(key, { descricao: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Itens incluídos <span className="text-muted-foreground">(um por linha)</span>
                    </Label>
                    <Textarea
                      rows={6}
                      value={listToLines(c.incluidos)}
                      onChange={(e) => updateCamada(key, { incluidos: linesToList(e.target.value) })}
                      disabled={!canEdit}
                      placeholder="Um item por linha"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Exibidos em “O que está incluído” na camada {CAMADA_LABEL[key]}.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Restrições de atuação <span className="text-muted-foreground">(um por linha)</span>
                    </Label>
                    <Textarea
                      rows={6}
                      value={listToLines(c.restricoes)}
                      onChange={(e) => updateCamada(key, { restricoes: linesToList(e.target.value) })}
                      disabled={!canEdit}
                      placeholder="Uma restrição por linha"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Exibidas no bloco compacto “Restrições de atuação” ao final do relatório.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  Geral
                </Badge>
                <CardTitle className="text-base">Restrições Gerais</CardTitle>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs"
                onClick={() => setRestricoesGerais(RESTRICOES_GERAIS_DEFAULT)}
                disabled={!canEdit}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label className="text-xs">
              Restrições aplicáveis a todas as proposições{" "}
              <span className="text-muted-foreground">(uma por linha)</span>
            </Label>
            <Textarea
              rows={8}
              value={listToLines(restricoesGerais)}
              onChange={(e) => setRestricoesGerais(linesToList(e.target.value))}
              disabled={!canEdit}
              placeholder="Uma restrição por linha"
            />
            <p className="text-[10px] text-muted-foreground">
              Exibidas ao final do bloco “Restrições de atuação” do Relatório de Proposição,
              independentemente das camadas ativas.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}