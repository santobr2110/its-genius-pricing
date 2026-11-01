import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import UserRolePicker from "@/components/admin/UserRolePicker";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const roles = [{ id: "sales", name: "Vendas", slug: "sales" }, { id: "training", name: "Treinamento", slug: "training" }];
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("saves both rapidly selected profiles in one request and prevents another save while pending", async () => {
  let finish: ((value: unknown) => void) | undefined;
  invoke.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const onSaved = vi.fn();
  render(<UserRolePicker userId="user" roles={roles} assigned={[]} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Selecionar perfis" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Vendas" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Treinamento" }));
  expect(invoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfis" }));
  expect(invoke).toHaveBeenCalledExactlyOnceWith("admin-users", { body: { action: "assign_role", user_id: "user", role_ids: ["sales", "training"] } });
  expect(screen.getByRole("checkbox", { name: "Vendas" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfis" }));
  expect(invoke).toHaveBeenCalledTimes(1);
  await act(async () => { finish?.({ data: { ok: true }, error: null }); });
  expect(onSaved).toHaveBeenCalledExactlyOnceWith(roles);
});

it("keeps the selected profiles available for retry when saving fails", async () => {
  invoke.mockResolvedValue({ error: new Error("Failed") });
  const onSaved = vi.fn();
  render(<UserRolePicker userId="user" roles={roles} assigned={[roles[0]]} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "Selecionar perfis" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Treinamento" }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar perfis" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Salvar perfis" })).toBeEnabled());
  expect(screen.getByRole("checkbox", { name: "Vendas" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Treinamento" })).toBeChecked();
  expect(onSaved).not.toHaveBeenCalled();
});