import { afterEach, describe, expect, it, vi } from "vitest";
import { aguardarResumoExportavel } from "@/lib/resumoExport";

afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

describe("summary export readiness", () => {
  it("waits for a slow summary instead of failing at the former 400ms deadline", async () => {
    vi.useFakeTimers();
    let resolved = false;
    const pending = aguardarResumoExportavel("slow-summary").then(el => { resolved = true; return el; });
    await vi.advanceTimersByTimeAsync(1200);
    expect(resolved).toBe(false);
    const summary = document.createElement("div"); summary.id = "slow-summary";
    document.body.append(summary);
    expect(await pending).toBe(summary);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exports an already mounted summary immediately", async () => {
    const summary = document.createElement("div"); summary.id = "ready-summary";
    document.body.append(summary);
    expect(await aguardarResumoExportavel("ready-summary")).toBe(summary);
  });

  it("fails cleanly if the summary never becomes available", async () => {
    vi.useFakeTimers();
    const pending = expect(aguardarResumoExportavel("missing", 1000)).rejects.toBeInstanceOf(Error);
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });
});