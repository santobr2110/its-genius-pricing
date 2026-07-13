import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/lib/permissions";
import { Lock } from "lucide-react";

interface Props {
  /** Permissão de escrita necessária. Se ausente, o conteúdo é apenas leitura. */
  permission: PermissionKey;
  /** Permissões adicionais que também concedem escrita (OR). */
  anyOf?: PermissionKey[];
  /** Ocultar a faixa "somente leitura" no topo (padrão: mostra). */
  hideBanner?: boolean;
  children: ReactNode;
}

/**
 * Desabilita todos os controles de formulário (input, select, textarea,
 * button) contidos em `children` quando o usuário não tem a permissão de
 * escrita informada. Links de navegação (`<a>`) continuam funcionais.
 * Complementa as verificações servidor-side (RLS) já existentes.
 */
export default function WriteFence({ permission, anyOf, hideBanner, children }: Props) {
  const { can } = useAuth();
  const canWrite = can(permission) || (anyOf?.some((p) => can(p)) ?? false);

  if (canWrite) return <>{children}</>;

  return (
    <>
      {!hideBanner && (
        <div
          role="status"
          className="mb-3 flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-100"
        >
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Você está no modo <strong>somente leitura</strong>. Sem permissão para editar esta página.
          </span>
        </div>
      )}
      <fieldset disabled className="m-0 border-0 p-0 min-w-0 disabled:opacity-100">
        {children}
      </fieldset>
    </>
  );
}