import { Link } from "react-router-dom";
import { ListChecks, Plus, Trash2 } from "lucide-react";
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
  ITENS_ADICIONAIS_DEFAULT, ITENS_ADICIONAIS_STORAGE_KEY,
  type CamadaKey, type EscopoCamada, type EscopoProposicao,
  type ItemAdicional, type ItemAdicionalTipo,
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
  const [itens, setItens] = usePersistentState<ItemAdicional[]>(
    ITENS_ADICIONAIS_STORAGE_KEY,
    ITENS_ADICIONAIS_DEFAULT,
  );

  const updateCamada = (key: CamadaKey, patch: Partial<EscopoCamada>) => {
    setEscopo((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const updateItem = (id: string, patch: Partial<ItemAdicional>) => {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const removeItem = (id: string) => {
    setItens((prev) => prev.filter((it) => it.id !== id));
  };
  const addItem = () => {
    const id = `item-${Date.now()}`;
    setItens((prev) => [
      ...prev,
      { id, descricao: "Novo item", unidade: "Unidade", tipo: "fixo", valorManual: 0, observacao: "" },
    ]);
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  Adicionais
                </Badge>
                <CardTitle className="text-base">Itens Adicionais ao Contrato</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={addItem}
                  disabled={!canEdit}
                >
                  <Plus className="h-3.5 w-3.5" /> Novo item
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Itens cobrados como adicionais ao contrato. Para tipos monitorados (servidor,
              rede, firewall, banco de dados, sistema), o valor unitário é calculado
              automaticamente combinando o custo de monitoramento, os chamados previstos
              (incidentes ponderados no funil) e a parcela proporcional de rotinas/GMUDs por
              ativo. Para os demais, informe o valor unitário manualmente.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {itens.map((it) => (
              <div key={it.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-[11px]">Descrição</Label>
                    <Input
                      value={it.descricao}
                      onChange={(e) => updateItem(it.id, { descricao: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px]">Unidade</Label>
                    <Input
                      value={it.unidade}
                      onChange={(e) => updateItem(it.id, { unidade: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[11px]">Tipo</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={it.tipo}
                      onChange={(e) => updateItem(it.id, { tipo: e.target.value as ItemAdicionalTipo })}
                      disabled={!canEdit}
                    >
                      <option value="monitorado-servidor">Monitorado · Servidor</option>
                      <option value="monitorado-rede">Monitorado · Ativo de Rede</option>
                      <option value="monitorado-firewall">Monitorado · Firewall</option>
                      <option value="monitorado-bd">Monitorado · Banco de Dados</option>
                      <option value="monitorado-sistema">Monitorado · Sistema</option>
                      <option value="proxy">Proxy adicional</option>
                      <option value="itsm">Acesso ao ITSM</option>
                      <option value="hora-n3">Hora N3 avulsa</option>
                      <option value="tam">TAM</option>
                      <option value="owner">Owner</option>
                      <option value="fixo">Outro (valor fixo)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[11px]">
                      Valor manual (R$)
                      <span className="text-muted-foreground"> opcional</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={it.valorManual ?? ""}
                      onChange={(e) =>
                        updateItem(it.id, {
                          valorManual: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="auto"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(it.id)}
                      disabled={!canEdit}
                      aria-label="Remover item"
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Observação</Label>
                  <Textarea
                    rows={2}
                    value={it.observacao ?? ""}
                    onChange={(e) => updateItem(it.id, { observacao: e.target.value })}
                    disabled={!canEdit}
                    placeholder="Notas explicativas exibidas no relatório."
                  />
                </div>
              </div>
            ))}
            {itens.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                Nenhum item adicional cadastrado. Use “Novo item” para adicionar.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}