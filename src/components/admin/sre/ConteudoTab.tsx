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
import { useAuth } from "@/contexts/AuthContext";
import type { SreContent } from "@/lib/sre/calc";
import { CAMPOS_ESPECIFICO_SRE, tipoPacoteSre } from "@/lib/sre/proposta";
import type { SreCadastro } from "@/hooks/useSreCadastro";

const COMUNS = [
  { key: "proposta_generico_titulo", label: "Título", longo: false },
  { key: "proposta_generico_descricao", label: "Descrição", longo: true },
  { key: "proposta_generico_fora_escopo", label: "Fora do escopo (um item por linha)", longo: true },
  { key: "proposta_generico_restricoes", label: "Restrições (um item por linha)", longo: true },
];

function ConteudoComum({ params, refresh }: SreCadastro) {
  const { user } = useAuth();
  const ler = () => Object.fromEntries(COMUNS.map(({ key }) => [key, String(params.find((p) => p.key === key)?.value ?? "")]));
  const [v, setV] = useState<Record<string, string>>(ler);
  useEffect(() => setV(ler()), [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const salvar = async () => {
    for (const { key } of COMUNS) {
      const r = await supabase.from("sre_params").update({ value: v[key] as never, updated_by: user?.id ?? null }).eq("key", key);
      if (r.error) return toast.error(r.error.message);
    }
    toast.success("Conteúdo comum salvo"); refresh();
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Conteúdo comum dos pacotes genéricos</CardTitle>
          <p className="text-xs text-muted-foreground">Vale para todos os pacotes genéricos. Escreva {"{horas}"} onde deve aparecer o volume de horas do pacote.</p>
        </div>
        <Button size="sm" onClick={salvar}>Salvar</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {COMUNS.map(({ key, label, longo }) => (
          <div key={key}>
            <Label className="text-xs">{label}</Label>
            {longo
              ? <Textarea rows={5} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
              : <Input value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SreConteudoTab(cad: SreCadastro) {
  const { pacotes, contents, refresh } = cad;
  const [sel, setSel] = useState<string>(pacotes[0]?.id ?? "");
  const atual = contents.find((c) => c.pacote_id === sel);
  const [d, setD] = useState<SreContent | null>(null);
  useEffect(() => {
    setD(atual ?? (sel ? ({ pacote_id: sel, a_confirmar: true, tipo: "generico" } as SreContent) : null));
  }, [atual, sel]);
  const pac = pacotes.find((s) => s.id === sel);
  const tipo = tipoPacoteSre(d);

  const salvar = async () => {
    if (!d) return;
    const r = await supabase.from("sre_pacote_content").upsert({ ...d, tipo } as never);
    if (r.error) return toast.error(r.error.message);
    toast.success("Conteúdo salvo"); refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Conteúdo do pacote</CardTitle>
          <Button size="sm" onClick={salvar} disabled={!d}>Salvar</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={sel} onValueChange={setSel}>
            <SelectTrigger><SelectValue placeholder="Escolha o pacote" /></SelectTrigger>
            <SelectContent>{pacotes.map((s) => {
              const t = tipoPacoteSre(contents.find((c) => c.pacote_id === s.id));
              return <SelectItem key={s.id} value={s.id}>{s.part_number} · {s.horas_execucao} h · {t === "generico" ? "Genérico" : "Específico"}</SelectItem>;
            })}</SelectContent>
          </Select>
          {d && (
            <>
              <div>
                <Label className="text-xs">Tipo de pacote</Label>
                <Select value={tipo} onValueChange={(t) => setD({ ...d, tipo: t as "generico" | "especifico" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generico">Genérico (usa o conteúdo comum)</SelectItem>
                    <SelectItem value="especifico">Específico (escopo próprio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tipo === "generico" ? (
                <p className="text-sm text-muted-foreground">Este pacote usa o conteúdo comum dos pacotes genéricos, abaixo. Na proposta muda apenas o volume de horas.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2"><Switch checked={d.a_confirmar} onCheckedChange={(v) => setD({ ...d, a_confirmar: v })} /><Label>Conteúdo a confirmar</Label></div>
                  {CAMPOS_ESPECIFICO_SRE.map(({ k, label }) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Textarea rows={4} value={(d[k] as string) ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value || null })} />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pré-visualização</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pac && d ? (tipo === "generico" ? (() => {
            const g = (k: string) => String(cad.params.find((p) => p.key === k)?.value ?? "").replace(/\{horas\}/g, String(pac.horas_execucao));
            return (<>
              <p className="text-lg font-bold text-primary">{g("proposta_generico_titulo") || pac.nome}</p>
              <p className="whitespace-pre-line">{g("proposta_generico_descricao")}</p>
              <p className="whitespace-pre-line"><span className="font-semibold">Fora do escopo: </span>{g("proposta_generico_fora_escopo")}</p>
              <p className="whitespace-pre-line"><span className="font-semibold">Restrições: </span>{g("proposta_generico_restricoes")}</p>
            </>);
          })() : (
            <>
              <p className="text-lg font-bold text-primary">{pac.nome} {d.a_confirmar && <Badge variant="outline" className="ml-1 text-[10px]">A CONFIRMAR</Badge>}</p>
              {CAMPOS_ESPECIFICO_SRE.filter(({ k }) => d[k]).map(({ k, label }) => (
                <p key={k} className="whitespace-pre-line"><span className="font-semibold">{label}: </span>{d[k] as string}</p>
              ))}
              {CAMPOS_ESPECIFICO_SRE.every(({ k }) => !d[k]) && <p className="text-muted-foreground">[A CONFIRMAR] Escopo ainda não preenchido.</p>}
            </>
          )) : <p className="text-muted-foreground">Escolha um pacote.</p>}
        </CardContent>
      </Card>
      <div className="lg:col-span-2"><ConteudoComum {...cad} /></div>
    </div>
  );
}
