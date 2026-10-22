import { useEffect, useState } from "react";
import { Landmark, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useReformaCBS } from "@/hooks/useReformaCBS";
import { REFORMA_VIGENCIA } from "@/lib/pricing/reformaTributaria";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/** Parâmetro central único da CBS (reforma tributária), usado por todas as calculadoras. */
export default function ReformaCBSCard() {
  const { user, can } = useAuth();
  const { cbsPerc, loading, salvar } = useReformaCBS();
  const [v, setV] = useState("");
  useEffect(() => { setV(cbsPerc == null ? "" : String(cbsPerc).replace(".", ",")); }, [cbsPerc]);
  const podeSalvar = can("params.save_defaults");
  const gravar = async () => {
    const t = v.trim().replace(",", ".");
    const n = t === "" ? null : Number(t);
    if (n != null && (!Number.isFinite(n) || n < 0 || n >= 100)) return toast.error("Informe uma alíquota entre 0 e 100, ou deixe vazio.");
    try { await salvar(n, user?.id); toast.success(n == null ? "CBS marcada como não definida" : "Alíquota da CBS salva"); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" /> Reforma tributária — CBS
          {cbsPerc == null && !loading && <Badge variant="outline" className="text-[10px]">Alíquota a definir</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Alíquota única da CBS para o preço vigente a partir de {REFORMA_VIGENCIA}, exibido em todas as calculadoras, resumos e propostas.
          Conta: preço atual − PIS − COFINS + CBS sobre o líquido sem PIS/COFINS/ISS. Vazio = mostra "R$ valor + CBS". Os preços atuais não mudam.
        </p>
      </CardHeader>
      <CardContent className="flex items-end gap-2">
        <div className="w-40">
          <label className="text-xs text-muted-foreground">Alíquota CBS (%)</label>
          <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="a definir" disabled={!podeSalvar} inputMode="decimal" />
        </div>
        <Button size="sm" className="gap-1" onClick={gravar} disabled={!podeSalvar || loading}><Save className="h-3.5 w-3.5" /> Salvar</Button>
      </CardContent>
    </Card>
  );
}
