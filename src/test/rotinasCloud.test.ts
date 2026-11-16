import { describe, it, expect } from "vitest";
import { ROTINAS_DEFAULT, rotinaMultiplicador, ajustarRotinasCloud, COMPLEX_FLAG_KEYS, type ComplexFlags, type Rotina } from "@/data/rotinas";
import { CLIENT_PROFILE_CALCULATOR_FIELDS } from "@/lib/clientProfileFields";

const flags = (on: Partial<ComplexFlags> = {}) =>
  ({ ...Object.fromEntries(COMPLEX_FLAG_KEYS.map((k) => [k, false])), ...on }) as ComplexFlags;
const inv = (servidores: number, cloud: number) => ({ qtdServidores: servidores, qtdAtivosRede: 0, qtdBancosDados: 0, qtdSistemas: 0, qtdAmbientesCloud: cloud });
const health = ROTINAS_DEFAULT.find((r) => r.id === "cl-2")!;
const capacidade = ROTINAS_DEFAULT.find((r) => r.id === "cl-1")!;

describe("rotinas de nuvem condicionadas ao inventário", () => {
  it("Health check Cloud não entra sem nuvem", () => {
    expect(rotinaMultiplicador(health, inv(10, 0), flags())).toBe(0);
  });
  it("Health check Cloud entra uma vez com 2 ambientes de nuvem", () => {
    expect(rotinaMultiplicador(health, inv(10, 2), flags())).toBe(1);
  });
  it("Análise de capacidade entra para cliente só com nuvem", () => {
    expect(rotinaMultiplicador(capacidade, inv(0, 3), flags())).toBe(1);
  });
  it("Análise de capacidade não entra com híbrido e nuvem 0", () => {
    expect(rotinaMultiplicador(capacidade, inv(5, 0), flags({ complexHibridoCloudOnPrem: true }))).toBe(0);
  });
  it("ajuste do catálogo é idempotente e remove a marca de híbrido", () => {
    const antiga = { ...capacidade, ativo: "Ambiente", complexidade: "Complexo", complexFlag: "complexHibridoCloudOnPrem" } as Rotina;
    const [nova] = ajustarRotinasCloud([antiga]);
    expect(nova.ativo).toBe("Cloud");
    expect(nova.complexidade).toBe("Padrão");
    expect("complexFlag" in nova).toBe(false);
    const lista = [nova];
    expect(ajustarRotinasCloud(lista)).toBe(lista);
  });
  it("ambientes de nuvem é dado do cliente, fora do perfil", () => {
    expect(CLIENT_PROFILE_CALCULATOR_FIELDS.has("qtdAmbientesCloud")).toBe(true);
  });
});
