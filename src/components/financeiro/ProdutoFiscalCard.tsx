import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Package, MapPin, Settings } from "lucide-react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useTaxCodes } from "@/hooks/useTaxCodes";
import { resolveTaxRates, codigoServeOferta, type OfertaFiscal } from "@/lib/pricing/taxRates";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoje = () => new Date().toISOString().slice(0, 10);

interface Props {
  /** Prefixo das chaves persistidas (ex.: "financeiro" ou "prof.financeiro"). */
  storagePrefix: string;
  current: { pisPerc: number; cofinsPerc: number; issPerc: number };
  onApply: (r: { pisPerc: number; cofinsPerc: number; issPerc: number }) => void;
  /** Mostra só os códigos desta oferta (mais os gerais). */
  oferta?: OfertaFiscal;
  /** Modo controlado (ex.: Treinamento guarda código/município na cotação). */
  codigo?: string;
  municipio?: string;
  onChange?: (v: { codigo: string; municipio: string }) => void;
  /** Código preferido quando nada foi escolhido. */
  codigoPadrao?: string;
}

/** Seleção de código fiscal + município lendo o cadastro tributário central. */
export default function ProdutoFiscalCard({ storagePrefix, current, onApply, oferta, codigo: codigoCtl, municipio: municipioCtl, onChange, codigoPadrao }: Props) {
  const { codes, rates, loading } = useTaxCodes();
  const auth = useAuth() as { isAdmin?: boolean };
  const ativos = useMemo(() => codes.filter((c) => c.ativo && codigoServeOferta(c, oferta)), [codes, oferta]);
  const municipios = useMemo(() => Array.from(new Set(rates.map((r) => r.municipio))).sort(), [rates]);

  const [codigoLs, setCodigoLs] = usePersistentState<string>(`${storagePrefix}.codigoProduto`, "");
  const [municipioLs, setMunicipioLs] = usePersistentState<string>(`${storagePrefix}.municipio`, "Joinville");
  const codigo = codigoCtl ?? codigoLs;
  const municipio = municipioCtl ?? municipioLs;
  const setCodigo = (v: string) => (onChange ? onChange({ codigo: v, municipio }) : setCodigoLs(v));
  const setMunicipio = (v: string) => (onChange ? onChange({ codigo, municipio: v }) : setMunicipioLs(v));

  const padrao = ativos.find((c) => c.codigo === codigoPadrao) ?? ativos.find((c) => c.ofertas?.includes(oferta ?? "")) ?? ativos[0];
  const codigoEf = ativos.some((c) => c.codigo === codigo) ? codigo : padrao?.codigo ?? "";
  const municipioEf = municipios.includes(municipio) ? municipio : municipios[0] ?? "";
  const code = ativos.find((c) => c.codigo === codigoEf);
  const r = codigoEf && municipioEf ? resolveTaxRates(codigoEf, municipioEf, hoje(), codes, rates) : null;

  useEffect(() => {
    if (!r) return;
    if (current.pisPerc !== r.pisPerc || current.cofinsPerc !== r.cofinsPerc || current.issPerc !== r.issPerc) {
      onApply({ pisPerc: r.pisPerc, cofinsPerc: r.cofinsPerc, issPerc: r.issPerc });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.rateId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Código do Produto para Faturamento
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              PIS, COFINS e ISS vêm do cadastro tributário oficial, conforme o código e o município.
            </p>
          </div>
          {auth.isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
              <Settings className="h-3 w-3" /> Cadastro tributário de produtos
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando cadastro tributário…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Código Protheus / Descrição</Label>
                <Select value={codigoEf} onValueChange={setCodigo}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[60vh]">
                    {ativos.map((c) => (
                      <SelectItem key={c.id} value={c.codigo}>
                        <span className="font-mono text-xs mr-2">{c.codigo}</span>
                        <span className="text-xs">{c.nome}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> Município do ISS</Label>
                <RadioGroup value={municipioEf} onValueChange={setMunicipio} className="flex gap-1 rounded-md border bg-background p-1">
                  {municipios.map((m) => {
                    const rm = resolveTaxRates(codigoEf, m, hoje(), codes, rates);
                    return (
                      <label key={m} className={`flex-1 flex items-center justify-center gap-1 rounded px-2 py-1.5 text-xs cursor-pointer transition-colors ${municipioEf === m ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted"}`}>
                        <RadioGroupItem value={m} className="sr-only" />
                        {m}
                        {rm && <span className="tabular-nums opacity-80">({fmt(rm.issPerc)}%)</span>}
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
            {r ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Item LC 116</p><p className="font-mono font-semibold text-foreground">{code?.lc116_item ?? "—"}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">PIS / COFINS</p><p className="font-semibold text-foreground tabular-nums">{fmt(r.pisPerc)}% / {fmt(r.cofinsPerc)}%</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">ISS aplicado</p><p className="font-bold text-primary tabular-nums">{fmt(r.issPerc)}%</p></div>
                <div className="flex items-end">{r.aConfirmar && <Badge variant="outline">a confirmar</Badge>}</div>
              </div>
            ) : (
              <p className="text-xs text-destructive">Sem alíquota vigente para este código/município no cadastro tributário.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
