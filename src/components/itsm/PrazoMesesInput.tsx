import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatarPrazo, mesesDoPrazo } from "@/lib/prazoContrato";

const ATALHOS = [12, 24, 36, 48, 60];

/** Prazo em meses (1–120). Recebe/devolve o texto gravado ("N meses"). */
export function PrazoMesesInput({ id, value, onChange, anterior }: {
  id?: string; value: string; onChange: (texto: string) => void; anterior?: string | null;
}) {
  const meses = mesesDoPrazo(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          step={1}
          className="w-24"
          value={meses ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isInteger(n) && n >= 1 && n <= 120 ? formatarPrazo(n) : "");
          }}
        />
        <span className="text-sm text-muted-foreground">meses</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {ATALHOS.map((n) => (
          <Button key={n} type="button" size="sm" variant={meses === n ? "default" : "outline"} className="h-6 px-2 text-xs" onClick={() => onChange(formatarPrazo(n))}>
            {n}
          </Button>
        ))}
      </div>
      {anterior && meses == null && (
        <p className="text-xs text-muted-foreground">Prazo anterior: {anterior} — informe em meses</p>
      )}
    </div>
  );
}
