/**
 * Ajustes de rotina feitos só nesta cotação (frequência, automação, horas).
 * Selo e dica aparecem apenas na tela; relatórios mostram só o valor ajustado.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { SlidersHorizontal, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FREQUENCIAS, type Frequencia } from "@/data/rotinas";
import type { AjusteRotina, AjustesCotacao, RotinaAjustada } from "@/lib/ajustesCotacao";

interface Ctx {
  porId: Map<string, RotinaAjustada>;
  ajustes: AjustesCotacao;
  ajustarRotina: (id: string, a: AjusteRotina | null) => void;
  desabilitado?: boolean;
}
export const AjustesRotinaContext = createContext<Ctx | null>(null);

function descreverOriginal(r: RotinaAjustada) {
  const o = r.original;
  if (!o) return "";
  const partes = [o.frequencia, o.automacao ? "automatizada" : "manual"];
  if (o.horasExecucao && o.horasExecucao > 0) partes.push(`${o.horasExecucao}h/execução`);
  return `Catálogo: ${partes.join(", ")}`;
}

export function AjusteRotinaBotao({ id }: { id: string }) {
  const ctx = useContext(AjustesRotinaContext);
  const r = ctx?.porId.get(id);
  const [open, setOpen] = useState(false);
  const [freq, setFreq] = useState<Frequencia>("Mensal");
  const [auto, setAuto] = useState(false);
  const [horas, setHoras] = useState("");
  const base = r?.original ?? (r ? { frequencia: r.frequencia, automacao: r.automacao, horasExecucao: r.horasExecucao } : null);
  const usaHoras = !!(base?.horasExecucao && base.horasExecucao > 0);

  useEffect(() => {
    if (open && r) {
      setFreq(r.frequencia);
      setAuto(r.automacao);
      setHoras(r.horasExecucao ? String(r.horasExecucao) : "");
    }
  }, [open, r]);

  if (!ctx || !r || !base) return null;

  const aplicar = () => {
    const a: AjusteRotina = {};
    if (freq !== base.frequencia) a.frequencia = freq;
    if (auto !== base.automacao) a.automacao = auto;
    const h = Number(horas.replace(",", "."));
    if (usaHoras && h > 0 && h !== base.horasExecucao) a.horasExecucao = h;
    ctx.ajustarRotina(id, Object.keys(a).length ? a : null);
    setOpen(false);
  };

  return (
    <>
      {r.ajustadaNaCotacao && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-1 rounded bg-accent px-1 text-[9px] text-accent-foreground">ajustada nesta cotação</span>
          </TooltipTrigger>
          <TooltipContent>{descreverOriginal(r)}</TooltipContent>
        </Tooltip>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={ctx.desabilitado}
            className="ml-1 inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-40"
            title="Ajustar esta rotina só nesta cotação"
          >
            <SlidersHorizontal className="h-3 w-3" /> Ajustar
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <p className="text-xs font-semibold">Ajuste só nesta cotação</p>
          <div className="space-y-1">
            <Label className="text-[11px]">Frequência</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v as Frequencia)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Automação</Label>
            <Switch checked={auto} onCheckedChange={setAuto} />
          </div>
          {usaHoras && (
            <div className="space-y-1">
              <Label className="text-[11px]">Horas por execução</Label>
              <Input className="h-8 text-xs" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">{descreverOriginal({ ...r, original: base } as RotinaAjustada)}</p>
          <div className="flex justify-between gap-2">
            {r.ajustadaNaCotacao ? (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { ctx.ajustarRotina(id, null); setOpen(false); }}>
                <Undo2 className="h-3 w-3" /> Voltar ao catálogo
              </Button>
            ) : <span />}
            <Button size="sm" className="h-7 text-xs" onClick={aplicar}>Aplicar</Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

/** Resumo no topo de uma lista de rotinas. */
export function ResumoAjustesRotinas({ ids }: { ids: string[] }) {
  const ctx = useContext(AjustesRotinaContext);
  if (!ctx) return null;
  const ajustadas = ids.filter((id) => ctx.ajustes.rotinas[id]);
  if (!ajustadas.length) return null;
  return (
    <div className="flex items-center justify-between rounded bg-accent/40 px-2 py-0.5 text-[10px]">
      <span>{ajustadas.length} {ajustadas.length === 1 ? "rotina ajustada" : "rotinas ajustadas"} nesta cotação</span>
      <button
        type="button"
        disabled={ctx.desabilitado}
        className="underline disabled:opacity-40"
        onClick={() => ajustadas.forEach((id) => ctx.ajustarRotina(id, null))}
      >
        Voltar tudo ao catálogo
      </button>
    </div>
  );
}
