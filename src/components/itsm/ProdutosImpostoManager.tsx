import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Plus, Trash2, RotateCcw, Settings2 } from "lucide-react";
import { CodigoProdutoImposto } from "@/data/codigosProdutoImposto";
import { useCodigosProdutoImposto } from "@/hooks/useCodigosProdutoImposto";
import { toast } from "@/hooks/use-toast";

const EMPTY: CodigoProdutoImposto = {
  codigo: "",
  descricao: "",
  buDeb: "",
  ctaContabil: "",
  codServIss: "",
  pis: 0,
  cofins: 0,
  issJlle: 0,
  issBlum: 0,
  issBarueri: 0,
};

export default function ProdutosImpostoManager() {
  const { lista, upsert, remove, resetCodigo, isDefault, isCustomized } =
    useCodigosProdutoImposto();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CodigoProdutoImposto | null>(null);
  const [originalCodigo, setOriginalCodigo] = useState<string | undefined>();

  function startNew() {
    setEditing({ ...EMPTY });
    setOriginalCodigo(undefined);
  }

  function startEdit(p: CodigoProdutoImposto) {
    setEditing({ ...p });
    setOriginalCodigo(p.codigo);
  }

  function save() {
    if (!editing) return;
    if (!editing.codigo.trim()) {
      toast({ title: "Código obrigatório", variant: "destructive" });
      return;
    }
    if (!editing.descricao.trim()) {
      toast({ title: "Descrição obrigatória", variant: "destructive" });
      return;
    }
    const duplicate =
      editing.codigo !== originalCodigo &&
      lista.some((p) => p.codigo === editing.codigo);
    if (duplicate) {
      toast({ title: "Código já existe", variant: "destructive" });
      return;
    }
    upsert(editing, originalCodigo);
    toast({ title: originalCodigo ? "Produto atualizado" : "Produto adicionado" });
    setEditing(null);
    setOriginalCodigo(undefined);
  }

  function handleRemove(codigo: string) {
    if (!confirm(`Remover o produto ${codigo}?`)) return;
    remove(codigo);
    toast({ title: "Produto removido" });
  }

  function handleReset(codigo: string) {
    resetCodigo(codigo);
    toast({ title: "Produto restaurado ao padrão" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Gerenciar produtos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Produtos para Faturamento</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova códigos fiscais. Edições nos códigos padrão ficam
            marcadas como "customizado" e podem ser restauradas.
          </DialogDescription>
        </DialogHeader>

        {!editing ? (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={startNew} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo produto
              </Button>
            </div>
            <ScrollArea className="flex-1 rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[110px]">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[80px] text-right">PIS</TableHead>
                    <TableHead className="w-[80px] text-right">COFINS</TableHead>
                    <TableHead className="w-[70px] text-right">JLLE</TableHead>
                    <TableHead className="w-[70px] text-right">BLUM</TableHead>
                    <TableHead className="w-[70px] text-right">BARUERI</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((p) => {
                    const def = isDefault(p.codigo);
                    const custom = isCustomized(p.codigo);
                    return (
                      <TableRow key={p.codigo}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col gap-1">
                            {p.codigo}
                            {!def && (
                              <Badge variant="secondary" className="w-fit text-[9px]">novo</Badge>
                            )}
                            {def && custom && (
                              <Badge variant="outline" className="w-fit text-[9px]">customizado</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{p.descricao}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{p.pis.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{p.cofins.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{p.issJlle.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{p.issBlum.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{p.issBarueri.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {def && custom && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Restaurar padrão"
                                onClick={() => handleReset(p.codigo)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Editar"
                              onClick={() => startEdit(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title={def ? "Ocultar" : "Remover"}
                              onClick={() => handleRemove(p.codigo)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        ) : (
          <ProdutoForm
            value={editing}
            onChange={setEditing}
            isNew={!originalCodigo}
            onCancel={() => {
              setEditing(null);
              setOriginalCodigo(undefined);
            }}
            onSave={save}
          />
        )}

        {!editing && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProdutoForm({
  value,
  onChange,
  isNew,
  onCancel,
  onSave,
}: {
  value: CodigoProdutoImposto;
  onChange: (p: CodigoProdutoImposto) => void;
  isNew: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  function set<K extends keyof CodigoProdutoImposto>(k: K, v: CodigoProdutoImposto[K]) {
    onChange({ ...value, [k]: v });
  }
  function setNum(k: keyof CodigoProdutoImposto, v: string) {
    onChange({ ...value, [k]: parseFloat(v) || 0 });
  }
  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      <h3 className="font-semibold text-sm">
        {isNew ? "Novo produto" : `Editar ${value.codigo}`}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Código">
          <Input value={value.codigo} onChange={(e) => set("codigo", e.target.value)} />
        </Field>
        <Field label="BU Deb.">
          <Input value={value.buDeb} onChange={(e) => set("buDeb", e.target.value)} />
        </Field>
        <Field label="Descrição" className="md:col-span-2">
          <Input value={value.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
        <Field label="Cta Contábil">
          <Input value={value.ctaContabil} onChange={(e) => set("ctaContabil", e.target.value)} />
        </Field>
        <Field label="Cod. Serv. ISS">
          <Input value={value.codServIss} onChange={(e) => set("codServIss", e.target.value)} />
        </Field>
        <Field label="PIS (%)">
          <Input type="number" step={0.01} value={value.pis} onChange={(e) => setNum("pis", e.target.value)} />
        </Field>
        <Field label="COFINS (%)">
          <Input type="number" step={0.01} value={value.cofins} onChange={(e) => setNum("cofins", e.target.value)} />
        </Field>
        <Field label="ISS Joinville (%)">
          <Input type="number" step={0.01} value={value.issJlle} onChange={(e) => setNum("issJlle", e.target.value)} />
        </Field>
        <Field label="ISS Blumenau (%)">
          <Input type="number" step={0.01} value={value.issBlum} onChange={(e) => setNum("issBlum", e.target.value)} />
        </Field>
        <Field label="ISS Barueri (%)">
          <Input type="number" step={0.01} value={value.issBarueri} onChange={(e) => setNum("issBarueri", e.target.value)} />
        </Field>
      </div>
      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onSave}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}