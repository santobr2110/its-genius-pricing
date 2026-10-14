import { Navigate, Route, Routes } from "react-router-dom";
import { BookOpen, Boxes, ClipboardList, GraduationCap, Loader2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTreinamentoCadastro } from "@/hooks/useTreinamentoCadastro";
import { listarPendencias } from "@/lib/treinamento/pendencias";
import CursosTab from "@/components/admin/treinamento/CursosTab";
import ConteudoTab from "@/components/admin/treinamento/ConteudoTab";
import CombosTab from "@/components/admin/treinamento/CombosTab";
import ParametrosTab from "@/components/admin/treinamento/ParametrosTab";
import PendenciasTab from "@/components/admin/treinamento/PendenciasTab";
import SubNav from "../financeiro/SubNav";

const BASE = "/observabilidade/treinamento/configuracoes";

/** Cadastro do Treinamento (antes em Admin): Cursos, Conteúdo, Combos, Parâmetros e Pendências. */
export default function TrnConfiguracoes() {
  const { can } = useAuth();
  const data = useTreinamentoCadastro();
  if (!can("page.trn.admin")) return <p className="text-sm text-muted-foreground">Você não tem permissão para administrar o Treinamento.</p>;
  if (data.loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>;
  if (data.error) return <p className="text-sm text-destructive">Não foi possível carregar o cadastro do Treinamento.</p>;
  const pend = listarPendencias(data.courses, data.contents, data.params);
  const items = [
    { to: `${BASE}/cursos`, label: "Cursos", icon: GraduationCap },
    { to: `${BASE}/conteudo`, label: "Conteúdo", icon: BookOpen },
    { to: `${BASE}/combos`, label: "Combos", icon: Boxes },
    { to: `${BASE}/parametros`, label: "Parâmetros", icon: SlidersHorizontal },
    { to: `${BASE}/pendencias`, label: `Pendências${pend.length ? ` (${pend.length})` : ""}`, icon: ClipboardList },
  ];
  return (
    <div className="space-y-4">
      <SubNav items={items} />
      <Routes>
        <Route index element={<Navigate to="cursos" replace />} />
        <Route path="cursos" element={<CursosTab {...data} />} />
        <Route path="conteudo" element={<ConteudoTab {...data} />} />
        <Route path="combos" element={<CombosTab {...data} />} />
        <Route path="parametros" element={<ParametrosTab {...data} />} />
        <Route path="pendencias" element={<PendenciasTab pendencias={pend} />} />
      </Routes>
    </div>
  );
}
