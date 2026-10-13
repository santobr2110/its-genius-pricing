import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Pendencia } from "@/lib/treinamento/pendencias";

const ORIGEM: Record<Pendencia["origem"], string> = { curso: "Cursos", conteudo: "Conteúdo", parametro: "Parâmetros" };

export default function PendenciasTab({ pendencias }: { pendencias: Pendencia[] }) {
  const grupos = (Object.keys(ORIGEM) as Pendencia["origem"][]).map((o) => ({ o, itens: pendencias.filter((p) => p.origem === o) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pendências ({pendencias.length})</CardTitle>
        <p className="text-xs text-muted-foreground">Tudo o que está marcado como simulado, a confirmar ou com custo pendente.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {grupos.map(({ o, itens }) => (
          <div key={o} className="space-y-2">
            <p className="text-sm font-semibold">{ORIGEM[o]} <Badge variant="secondary" className="ml-1">{itens.length}</Badge></p>
            {itens.length === 0 && <p className="text-xs text-muted-foreground">Nada pendente.</p>}
            <ul className="space-y-1.5">
              {itens.map((p, i) => (
                <li key={i} className="rounded-md border px-2 py-1.5 text-xs">
                  <span className="font-medium">{p.titulo}</span>
                  <span className="text-muted-foreground"> · {p.detalhe}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
