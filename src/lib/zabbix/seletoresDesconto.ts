/** Os seletores são operáveis e mutuamente exclusivos, sem mudar os demais campos. */
export function alternarDesconto<T extends { temRO: boolean; publicTender?: boolean }>(
  config: T,
  desconto: "temRO" | "publicTender",
  ativo: boolean,
): T {
  return {
    ...config,
    [desconto]: ativo,
    ...(ativo ? { [desconto === "temRO" ? "publicTender" : "temRO"]: false } : {}),
  };
}