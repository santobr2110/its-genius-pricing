import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BodyshopContent } from "@/lib/bodyshop/calc";
import type { BsCadastro } from "@/hooks/useBodyshopCadastro";

const CAMPOS: { k: keyof BodyshopContent; label: string }[] = [
  { k: "descricao", label: "Descrição" },
  { k: "atividades", label: "Atividades" },
  { k: "competencias", label: "Competências" },
  { k: "formacao", label: "Formação" },
  { k: "certificacoes", label: "Certificações" },
  { k: "entregaveis", label: "Entregáveis" },
  { k: "pre_requisitos", label: "Pré-requisitos" },
  { k: "observacoes", label: "Observações" },
];

export default function BsConteudoTab({ cargos, contents, refresh }: BsCadastro) {
  const [sel, setSel] = useState<string>(cargos[0]?.id ?? "");
  const atual = contents.find((c) => c.cargo_id === sel);
  const [d, setD] = useState<BodyshopContent | null>(null);
  useEffect(() => { setD(atual ?? (sel ? ({ cargo_id: sel, a_confirmar: true } as BodyshopContent) : null)); }, [atual, sel]);
  const cargo = cargos.find((c) => c.id === sel);

  const salvar = async () => {
    if (!d) return;
    const r = await supabase.from("bodyshop_cargo_content").upsert(d);
    if (r.error) return toast.error(r.error.message);
    toast.success("Conteúdo salvo"); refresh();
  };

  if (!cargos.length) return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Cadastre ou importe cargos primeiro.</CardContent></Card>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Conteúdo da proposta</CardTitle>
          <Button size="sm" onClick={salvar} disabled={!d}>Salvar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={sel} onValueChange={setSel}>
            <SelectTrigger><SelectValue placeholder="Escolha o cargo" /></SelectTrigger>
            <SelectContent>{cargos.map((c) => <SelectItem key={c.id} value={c.id}>{c.cargo} · {c.senioridade}</SelectItem>)}</SelectContent>
          </Select>
          {d && (
            <>
              <div className="flex items-center gap-2"><Switch checked={d.a_confirmar} onCheckedChange={(v) => setD({ ...d, a_confirmar: v })} /><Label>Conteúdo a confirmar</Label></div>
              {CAMPOS.map(({ k, label }) => (
                <div key={k}><Label className="text-xs">{label}</Label>
                  <Textarea rows={3} value={(d[k] as string) ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value || null })} /></div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pré-visualização na proposta</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {cargo && d ? (
            <>
              <p className="text-lg font-bold text-primary">{cargo.cargo} — {cargo.senioridade} {d.a_confirmar && <Badge variant="outline" className="ml-1 text-[10px]">A CONFIRMAR</Badge>}</p>
              {CAMPOS.filter(({ k }) => d[k]).map(({ k, label }) => (
                <p key={k} className="whitespace-pre-line"><span className="font-semibold">{label}: </span>{d[k] as string}</p>
              ))}
              {CAMPOS.every(({ k }) => !d[k]) && <p className="text-muted-foreground">[A CONFIRMAR] Descritivo do cargo ainda não fornecido.</p>}
            </>
          ) : <p className="text-muted-foreground">Escolha um cargo.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
