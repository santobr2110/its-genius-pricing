import { Navigate, Route, Routes } from "react-router-dom";
import { BookOpen, ClipboardList, Loader2, SlidersHorizontal, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useBodyshopCadastro } from "@/hooks/useBodyshopCadastro";
import { listarPendenciasBs, type PendenciaBs } from "@/lib/bodyshop/calc";
import SubNav from "@/pages/treinamento/financeiro/SubNav";
import BsCargosTab from "@/components/admin/bodyshop/CargosTab";
import BsConteudoTab from "@/components/admin/bodyshop/ConteudoTab";
import BsParametrosTab from "@/components/admin/bodyshop/ParametrosTab";

const BASE = "/profissionais-alocados/configuracoes";
const ORIGEM: Record<PendenciaBs["origem"], string> = { cargo: "Cargos", conteudo: "Conteúdo", parametro: "Parâmetros" };

function Pendencias({ pendencias }: { pendencias: PendenciaBs[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pendências ({pendencias.length})</CardTitle>
        <p className="text-xs text-muted-foreground">Tudo o que está marcado como simulado ou a confirmar.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(ORIGEM) as PendenciaBs["origem"][]).map((o) => {
          const itens = pendencias.filter((p) => p.origem === o);
          return (
            <div key={o} className="space-y-2">
              <p className="text-sm font-semibold">{ORIGEM[o]} <Badge variant="secondary" className="ml-1">{itens.length}</Badge></p>
              {itens.length === 0 && <p className="text-xs text-muted-foreground">Nada pendente.</p>}
              <ul className="space-y-1.5">{itens.map((p, i) => (
                <li key={i} className="rounded-md border px-2 py-1.5 text-xs"><span className="font-medium">{p.titulo}</span><span className="text-muted-foreground"> · {p.detalhe}</span></li>
              ))}</ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function BsConfiguracoes() {
  const { can } = useAuth();
  const data = useBodyshopCadastro();
  if (!can("page.prof.admin")) return <p className="text-sm text-muted-foreground">Você não tem permissão para administrar o BodyShop.</p>;
  if (data.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (data.error) return <p className="text-sm text-destructive">Não foi possível carregar o cadastro.</p>;
  const pend = listarPendenciasBs(data.cargos, data.contents, data.params);
  const items = [
    { to: `${BASE}/cargos`, label: "Cargos", icon: UsersRound },
    { to: `${BASE}/conteudo`, label: "Conteúdo", icon: BookOpen },
    { to: `${BASE}/parametros`, label: "Parâmetros", icon: SlidersHorizontal },
    { to: `${BASE}/pendencias`, label: `Pendências${pend.length ? ` (${pend.length})` : ""}`, icon: ClipboardList },
  ];
  return (
    <div className="space-y-4">
      <SubNav items={items} />
      <Routes>
        <Route index element={<Navigate to="cargos" replace />} />
        <Route path="cargos" element={<BsCargosTab {...data} />} />
        <Route path="conteudo" element={<BsConteudoTab {...data} />} />
        <Route path="parametros" element={<BsParametrosTab {...data} />} />
        <Route path="pendencias" element={<Pendencias pendencias={pend} />} />
      </Routes>
    </div>
  );
}
