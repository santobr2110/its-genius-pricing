import { useCallback, useMemo } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";

/**
 * Seleção manual de rotinas por precificação.
 *
 * Guarda os IDs das rotinas DESATIVADAS no projeto. As rotinas continuam sendo
 * trazidas do catálogo (Gestão de TI), mas o usuário escolhe no painel de
 * Camadas quais entram na precificação — útil quando uma rotina de abrangência
 * "Ambiente" não se aplica ao cliente (ex.: sem virtualização, sem backup).
 */
export const ROTINAS_OFF_KEY = "gestao-ti:rotinasOff";

export function useRotinasSelecao() {
  const [off, setOff] = usePersistentState<string[]>(ROTINAS_OFF_KEY, []);
  const offSet = useMemo(() => new Set(off ?? []), [off]);
  const isOff = useCallback((id: string) => offSet.has(id), [offSet]);
  const toggle = useCallback(
    (id: string) =>
      setOff((prev) =>
        (prev ?? []).includes(id) ? (prev ?? []).filter((x) => x !== id) : [...(prev ?? []), id],
      ),
    [setOff],
  );
  return { off: off ?? [], offSet, isOff, toggle, setOff };
}

/** Remove do array as rotinas desativadas na precificação. */
export function filterRotinasAtivas<T extends { id: string }>(
  rotinas: T[],
  off: string[] | Set<string> | undefined,
): T[] {
  if (!off) return rotinas;
  const set = off instanceof Set ? off : new Set(off);
  if (set.size === 0) return rotinas;
  return rotinas.filter((r) => !set.has(r.id));
}
