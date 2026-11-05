import { describe, expect, it } from "vitest";
import { alternarDesconto } from "@/lib/zabbix/seletoresDesconto";

describe("seletores de descontos Zabbix", () => {
  it("ativar Public Tender desliga RO e preserva pagamento em 30 dias", () => {
    expect(alternarDesconto({ temRO: true, publicTender: false, pagamento30d: true }, "publicTender", true))
      .toEqual({ temRO: false, publicTender: true, pagamento30d: true });
  });

  it("RO continua operável e sua ativação desliga Public Tender", () => {
    expect(alternarDesconto({ temRO: false, publicTender: true }, "temRO", true))
      .toEqual({ temRO: true, publicTender: false });
  });

  it("desativar Public Tender não liga RO automaticamente", () => {
    expect(alternarDesconto({ temRO: false, publicTender: true }, "publicTender", false))
      .toEqual({ temRO: false, publicTender: false });
  });
});