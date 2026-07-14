import { ReactNode, useEffect, useRef } from "react";
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
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (canWrite) return;
    const root = wrapperRef.current;
    if (!root) return;

    // Disable only real data-entry controls (inputs, selects, textareas,
    // and native form submit/reset). We intentionally do NOT disable
    // generic <button> elements so that tab triggers, dropdown/menu
    // triggers, popovers, dialogs, expand/collapse toggles, and other
    // navigation controls remain usable in read-only mode.
    const apply = () => {
      const controls = root.querySelectorAll<HTMLElement>(
        'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([data-readonly-skip]), textarea, select',
      );
      controls.forEach((el) => {
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (!input.hasAttribute("data-readonly-fence")) {
          input.setAttribute("data-readonly-fence", "1");
          // Use readOnly where possible (keeps focus/scroll); disable selects.
          if (input.tagName === "SELECT") {
            (input as HTMLSelectElement).disabled = true;
          } else {
            (input as HTMLInputElement | HTMLTextAreaElement).readOnly = true;
          }
          input.setAttribute("aria-readonly", "true");
          input.classList.add("opacity-70", "cursor-not-allowed");
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true, attributes: false });
    return () => observer.disconnect();
  }, [canWrite]);

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
      <div ref={wrapperRef} data-readonly-fence-root="true">
        {children}
      </div>
    </>
  );
}