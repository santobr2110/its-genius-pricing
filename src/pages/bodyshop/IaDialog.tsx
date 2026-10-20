import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FAIXAS, type BodyshopCargo } from "@/lib/bodyshop/calc";
import type { LinhaBS } from "@/lib/bodyshop/carrinho";
export function BsIaDialog({ open, onOpenChange, cargos, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; cargos: BodyshopCargo[]; onAdd: (l: LinhaBS) => void }) {
  const [descricao, setDescricao] = useState(""), [busy, setBusy] = useState(false);
  const analisar = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("precificacao-ia", { body: { descricao, oferta: "bodyshop" } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      const cargo = cargos.find(c => norm(c.cargo) === norm(String(data.cargo_identificado ?? "")) && c.nivel_num === Number(data.nivel_num));
      if (!cargo) throw new Error("O perfil sugerido não está no cadastro vigente do BodyShop. Selecione um cargo manualmente.");
      const sugerida = String(data.faixa ?? "C3").toLowerCase();
      const faixa = FAIXAS.find(f => f === sugerida && cargo[`salario_${f}`] != null) ?? FAIXAS.find(f => cargo[`salario_${f}`] != null);
      if (!faixa) throw new Error("O cargo sugerido não possui faixa salarial preenchida.");
      onAdd({ id: crypto.randomUUID(), cargoId: cargo.id, faixa, quantidade: 1, regime: "integral", horasLinha: null, descontoPerc: 0, iaJustificativa: String(data.justificativa ?? ""), iaIndiceAderencia: Number(data.indice_aderencia) || 0 });
      onOpenChange(false); setDescricao(""); toast.success("Perfil adicionado à cotação");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Adicionar por descrição de vaga</DialogTitle><DialogDescription>Descrição da necessidade técnica</DialogDescription></DialogHeader><Textarea aria-label="Descrição da vaga" rows={8} value={descricao} onChange={e => setDescricao(e.target.value)} /><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={busy || !descricao.trim()} onClick={analisar}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Analisar e adicionar</Button></DialogFooter></DialogContent></Dialog>;
}