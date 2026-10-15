import { describe, it, expect } from "vitest";
import { resolveDescontos, DESCONTOS_PADRAO } from "@/lib/zabbix/calc";

// Retrato gravado antes da Fase 2.5 (ro, sem_ro, 30d c/RO, 30d s/RO) e estado após a migração.
const ANTES: [string, "suporte" | "academy", number[], (number | null)[]][] = [
  ["SUP-ZBX-SVR-SLV", "suporte", [60, 40, 0, 0], [60, 40, 0, 0]],
  ["SUP-ZBX-SVR-GLD", "suporte", [70, 55, 20, 20], [null, null, null, null]],
  ["SUP-ZBX-PRX-GLD", "suporte", [70, 55, 20, 20], [null, null, null, null]],
  ["SUP-ZBX-SVR-PLT", "suporte", [70, 55, 20, 20], [null, null, null, null]],
  ["SUP-ZBX-PRX-PLT", "suporte", [70, 55, 20, 20], [null, null, null, null]],
  ["SUP-ZBX-PRX-ENT", "suporte", [70, 55, 40, 20], [null, null, 40, null]],
  ["SUP-ZBX-PRX-GLB", "suporte", [70, 55, 40, 40], [null, null, 40, 40]],
  ["ACA-ZBX-IND", "academy", [30, 0, 0, 0], [null, null, null, null]],
  ["ACA-ZBX-ANN", "academy", [30, 0, 0, 0], [null, null, null, null]],
];

describe("Fase 2.5 — descontos herdados preservam os valores", () => {
  for (const [pn, categoria, antes, depois] of ANTES) {
    it(pn, () => {
      const r = resolveDescontos({ categoria, ro_perc: depois[0], sem_ro_perc: depois[1], pgto30_ro_perc: depois[2], pgto30_sem_ro_perc: depois[3] }, DESCONTOS_PADRAO);
      expect([r.ro, r.semRo, r.pgto30Ro, r.pgto30SemRo]).toEqual(antes);
    });
  }
});
