import { Navigate, Route, Routes } from "react-router-dom";
import { BookOpen, ClipboardList, Loader2, Megaphone, Package, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSreCadastro } from "@/hooks/useSreCadastro";
import { listarPendenciasSre, type PendenciaSre } from "@/lib/sre/calc";
import SubNav from "@/pages/treinamento/financeiro/SubNav";
import SrePacotesTab from "@/components/admin/sre/PacotesTab";
import SreConteudoTab from "@/components/admin/sre/ConteudoTab";
import SreCampanhasTab from "@/components/admin/sre/CampanhasTab";
import SreParametrosTab from "@/components/admin/sre/ParametrosTab";

const BASE = "/observabilidade/consultivo-sre/configuracoes";
const ORIGEM: Record<PendenciaSre["origem"], string> = { pacote: "Pacotes", conteudo: "Conteúdo", campanha: "Campanhas", parametro: "Parâmetros" };

function Pendencias({ pendencias }: { pendencias: PendenciaSre[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pendências ({pendencias.length})</CardTitle>
        <p className="text-xs text-muted-foreground">Tudo o que está marcado como simulado ou a confirmar.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(Object.keys(ORIGEM) as PendenciaSre["origem"][]).map((o) => {
          const itens = pendencias.filter((p) => p.origem === o);
          return (
            <div key={o} className="space-y-2">
              <p className="text-sm font-semibold">{ORIGEM[o]} <Badge variant="secondary" className="ml-1">{itens.length}</Badge></p>
              {itens.length === 0 && <p className="text-xs text-muted-foreground">Nada pendente.</p>}
              <ul className="space-y-1.5">
                {itens.map((p, i) => (
                  <li key={i} className="rounded-md border px-2 py-1.5 text-xs"><span className="font-medium">{p.titulo}</span><span className="text-muted-foreground"> · {p.detalhe}</span></li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function SreConfiguracoes() {
  const { can } = useAuth();
  const data = useSreCadastro();
  if (!can("page.sre.admin")) return <p className="text-sm text-muted-foreground">Você não tem permissão para administrar os Pacotes Consultivos SRE.</p>;
  if (data.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (data.error) return <p className="text-sm text-destructive">Não foi possível carregar o cadastro.</p>;
  const pend = listarPendenciasSre(data.pacotes, data.contents, data.campanhas, data.params);
  const items = [
    { to: `${BASE}/pacotes`, label: "Pacotes", icon: Package },
    { to: `${BASE}/conteudo`, label: "Conteúdo", icon: BookOpen },
    { to: `${BASE}/campanhas`, label: "Campanhas", icon: Megaphone },
    { to: `${BASE}/parametros`, label: "Parâmetros", icon: SlidersHorizontal },
    { to: `${BASE}/pendencias`, label: `Pendências${pend.length ? ` (${pend.length})` : ""}`, icon: ClipboardList },
  ];
  return (
    <div className="space-y-4">
      <SubNav items={items} />
      <Routes>
        <Route index element={<Navigate to="pacotes" replace />} />
        <Route path="pacotes" element={<SrePacotesTab {...data} />} />
        <Route path="conteudo" element={<SreConteudoTab {...data} />} />
        <Route path="campanhas" element={<SreCampanhasTab {...data} />} />
        <Route path="parametros" element={<SreParametrosTab {...data} />} />
        <Route path="pendencias" element={<Pendencias pendencias={pend} />} />
      </Routes>
    </div>
  );
}
