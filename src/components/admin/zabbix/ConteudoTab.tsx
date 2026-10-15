import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ZabbixContent } from "@/lib/zabbix/calc";
import type { ZbxCadastro } from "@/hooks/useZabbixCadastro";

const CAMPOS: { k: keyof ZabbixContent; label: string; longo?: boolean }[] = [
  { k: "tagline", label: "Tagline" },
  { k: "descricao", label: "Descrição", longo: true },
  { k: "escopo_atendimento", label: "Escopo de atendimento", longo: true },
  { k: "sla", label: "SLA" },
  { k: "canais_atendimento", label: "Canais de atendimento" },
  { k: "idioma", label: "Idioma" },
  { k: "abrangencia", label: "Abrangência" },
  { k: "entregavel", label: "Entregável" },
  { k: "pre_requisito", label: "Pré-requisito" },
  { k: "observacoes", label: "Observações", longo: true },
  { k: "link_mais_informacoes", label: "Link para mais informações" },
];

export default function ZbxConteudoTab({ subs, contents, refresh }: ZbxCadastro) {
  const [sel, setSel] = useState<string>(subs[0]?.id ?? "");
  const atual = contents.find((c) => c.subscription_id === sel);
  const [d, setD] = useState<ZabbixContent | null>(null);
  useEffect(() => {
    setD(atual ?? (sel ? ({ subscription_id: sel, a_confirmar: true } as ZabbixContent) : null));
  }, [atual, sel]);
  const sub = subs.find((s) => s.id === sel);

  const salvar = async () => {
    if (!d) return;
    const r = await supabase.from("zabbix_subscription_content").upsert(d);
    if (r.error) return toast.error(r.error.message);
    toast.success("Conteúdo salvo"); refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Conteúdo da proposta</CardTitle>
          <Button size="sm" onClick={salvar} disabled={!d}>Salvar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={sel} onValueChange={setSel}>
            <SelectTrigger><SelectValue placeholder="Escolha a subscrição" /></SelectTrigger>
            <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.part_number} · {s.nome}</SelectItem>)}</SelectContent>
          </Select>
          {d && (
            <>
              <div className="flex items-center gap-2"><Switch checked={d.a_confirmar} onCheckedChange={(v) => setD({ ...d, a_confirmar: v })} /><Label>Conteúdo a confirmar</Label></div>
              {CAMPOS.map(({ k, label, longo }) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  {longo
                    ? <Textarea rows={3} value={(d[k] as string) ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value || null })} />
                    : <Input value={(d[k] as string) ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value || null })} />}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pré-visualização na proposta</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sub && d ? (
            <>
              <p className="text-lg font-bold text-primary">{sub.nome} {d.a_confirmar && <Badge variant="outline" className="ml-1 text-[10px]">A CONFIRMAR</Badge>}</p>
              {d.tagline && <p className="italic text-muted-foreground">{d.tagline}</p>}
              {d.descricao && <p className="whitespace-pre-line">{d.descricao}</p>}
              {CAMPOS.slice(2).filter(({ k }) => d[k]).map(({ k, label }) => (
                <p key={k} className="whitespace-pre-line"><span className="font-semibold">{label}: </span>{d[k] as string}</p>
              ))}
              {CAMPOS.every(({ k }) => !d[k]) && <p className="text-muted-foreground">[A CONFIRMAR] Descritivo comercial ainda não fornecido.</p>}
            </>
          ) : <p className="text-muted-foreground">Escolha uma subscrição.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
