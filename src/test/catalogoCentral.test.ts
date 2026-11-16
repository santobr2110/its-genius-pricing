import { describe, it, expect } from "vitest";
import { contarAlteracoesCatalogo } from "@/lib/catalogoCentral";
import { isCatalogKey, stripCatalogKeys, SMART_ITO_PARAM_KEYS } from "@/lib/paramKeys";

describe("catálogo central", () => {
  it("conta alteração de frequência como 1 alteração não publicada", () => {
    const base = [{ id: "a", frequencia: "Mensal" }, { id: "b", frequencia: "Semanal" }];
    expect(contarAlteracoesCatalogo(base, [{ id: "a", frequencia: "Diária" }, base[1]])).toBe(1);
  });
  it("conta inclusão e remoção", () => {
    const base = [{ id: "a" }, { id: "b" }];
    expect(contarAlteracoesCatalogo(base, [{ id: "a" }, { id: "c" }])).toBe(2);
    expect(contarAlteracoesCatalogo(base, base)).toBe(0);
  });
  it("perfis não gravam nem aplicam o catálogo (rotinas, GMUDs, versão)", () => {
    const p = stripCatalogKeys({
      "ito.smart-ito.gestao-ti:rotinas": [1],
      "ito.smart-ito.gestao-ti:gmuds": [2],
      "ito.smart-ito.catalogo:versao": { rotinas: 1 },
      "ito.smart-ito.itsm:n1team:v1": {},
    });
    expect(Object.keys(p)).toEqual(["ito.smart-ito.itsm:n1team:v1"]);
    expect(isCatalogKey("ito.smart-ito.preset.abc.gestao-ti:rotinas")).toBe(true);
    expect(isCatalogKey("ito.smart-ito.gestao-ti:rotinasOff")).toBe(false);
  });
  it("cotação continua guardando a cópia do catálogo e a versão", () => {
    expect(SMART_ITO_PARAM_KEYS).toContain("ito.smart-ito.gestao-ti:rotinas");
    expect(SMART_ITO_PARAM_KEYS).toContain("ito.smart-ito.catalogo:versao");
  });
});
