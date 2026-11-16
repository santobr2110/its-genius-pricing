import { useState } from "react";
import { toast } from "sonner";
import { History, Library, Upload, Undo2, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useITSMContext } from "@/contexts/ITSMContext";
import { usePersistentState } from "@/hooks/usePersistentState";
import { normalizarValorLegado } from "@/lib/normalizacoesLegado";
import {
  ConflitoCatalogoError,
  listarHistoricoCatalogo,
  publicarCatalogo,
  recarregarCatalogoCentral,
  type CatalogoHistoricoItem,
} from "@/hooks/useCatalogoCentral";
import type { useCatalogoEditor } from "@/hooks/useCatalogoEditor";
import type { Rotina } from "@/data/rotinas";
import {
  AJUSTES_COTACAO_KEY, AJUSTES_COTACAO_PADRAO, aplicarAjustesCotacao, normalizarAjustes, type AjustesCotacao,
} from "@/lib/ajustesCotacao";
import type { Gmud } from "@/data/gmuds";

type Editor = ReturnType<typeof useCatalogoEditor>;
type VersaoCotacao = { rotinas?: number; gmuds?: number; salvoEm?: string } | null;

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function CatalogoCentralBanner({ catalogo }: { catalogo: Editor }) {
  const { modo, central } = catalogo;
  const { fullName, user } = useAuth();
  const { simularPrecoMensal, results } = useITSMContext();
  const [versaoCotacao, setVersaoCotacao] = usePersistentState<VersaoCotacao>("catalogo:versao", null);

  const [initOpen, setInitOpen] = useState(false);
  const [pubOpen, setPubOpen] = useState(false);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [historico, setHistorico] = useState<CatalogoHistoricoItem[] | null>(null);
  const [verItem, setVerItem] = useState<CatalogoHistoricoItem | null>(null);
  const [atualizarOpen, setAtualizarOpen] = useState(false);
  const [ajustesCot, setAjustesCot] = usePersistentState<AjustesCotacao>(AJUSTES_COTACAO_KEY, AJUSTES_COTACAO_PADRAO);

  if (modo === "carregando") return null;

  const ultimo = [central.rotinas, central.gmuds]
    .filter(Boolean)
    .sort((a, b) => String(b!.updatedAt).localeCompare(String(a!.updatedAt)))[0];
  const versaoTxt = `rotinas v${central.rotinas?.versao ?? 0} · GMUDs v${central.gmuds?.versao ?? 0}`;

  const abrirHistorico = async () => {
    setHistOpen(true);
    try { setHistorico(await listarHistoricoCatalogo()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao carregar histórico."); }
  };

  const inicializar = async () => {
    setBusy(true);
    try {
      const rot = normalizarValorLegado("gestao-ti:rotinas", catalogo.rotinasPessoais);
      const gm = normalizarValorLegado("gestao-ti:gmuds", catalogo.gmudsPessoais);
      const coment = `Inicialização a partir do catálogo de ${fullName || user?.email || "usuário"}`;
      await publicarCatalogo("rotinas", rot, 0, coment);
      await publicarCatalogo("gmuds", gm, 0, coment);
      await recarregarCatalogoCentral();
      toast.success("Catálogo central inicializado.");
      setInitOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao inicializar.");
      await recarregarCatalogoCentral();
    } finally { setBusy(false); }
  };

  const publicar = async () => {
    setBusy(true);
    try {
      await catalogo.publicar(comentario.trim());
      toast.success("Catálogo central publicado.");
      setPubOpen(false); setComentario("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar.", e instanceof ConflitoCatalogoError ? { duration: 10000 } : undefined);
    } finally { setBusy(false); }
  };

  const centralRotinas = (central.rotinas?.conteudo as Rotina[] | undefined) ?? catalogo.rotinas;
  const centralGmuds = (central.gmuds?.conteudo as Gmud[] | undefined) ?? catalogo.gmuds;
  const totalAtual = results.precoVendaMensal;
  const orfaos = atualizarOpen ? aplicarAjustesCotacao(centralRotinas, centralGmuds, ajustesCot).ignorados : [];
  const totalVigente = atualizarOpen ? simularPrecoMensal(centralRotinas, centralGmuds) : 0;

  const atualizarCotacao = () => {
    catalogo.setRotinasPessoais(centralRotinas); // modo cotação: grava na cópia da cotação
    catalogo.setGmudsPessoais(centralGmuds);
    if (orfaos.length) {
      const fora = new Set(orfaos.map((o) => `${o.tipo}:${o.id}`));
      const a = normalizarAjustes(ajustesCot);
      setAjustesCot({
        gmudsOff: a.gmudsOff.filter((id) => !fora.has(`gmud:${id}`)),
        rotinas: Object.fromEntries(Object.entries(a.rotinas).filter(([id]) => !fora.has(`rotina:${id}`))),
      });
    }
    setVersaoCotacao({ rotinas: central.rotinas?.versao ?? 0, gmuds: central.gmuds?.versao ?? 0, salvoEm: new Date().toISOString() });
    setAtualizarOpen(false);
    toast.success("Cotação atualizada para o catálogo central vigente.");
  };

  const historicoBtn = (
    <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={abrirHistorico}>
      <History className="h-3.5 w-3.5" /> Histórico
    </Button>
  );

  let faixa: React.ReactNode = null;
  if (modo === "pessoal") {
    if (!catalogo.podeEditarCentral) return null;
    faixa = (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
        <Library className="h-4 w-4 text-primary" />
        <span className="flex-1">O catálogo central de rotinas e GMUDs ainda não foi inicializado. Hoje cada pessoa usa a própria cópia.</span>
        <Button size="sm" className="h-7" onClick={() => setInitOpen(true)}>Inicializar catálogo central a partir do meu catálogo atual</Button>
      </div>
    );
  } else if (modo === "cotacao") {
    const salvoEm = versaoCotacao?.salvoEm;
    faixa = (
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-xs">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">
          {versaoCotacao
            ? <>Catálogo desta cotação — salvo em {dataHora(salvoEm)}, versão central rotinas v{versaoCotacao.rotinas ?? 0} · GMUDs v{versaoCotacao.gmuds ?? 0}</>
            : <>Catálogo desta cotação — versão anterior ao catálogo central</>}
          . Somente leitura.
        </span>
        {(central.rotinas || central.gmuds) && (
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setAtualizarOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar para o catálogo central vigente
          </Button>
        )}
      </div>
    );
  } else {
    faixa = (
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-xs">
        <Library className="h-4 w-4 text-primary" />
        <span className="flex-1">
          Catálogo central · {versaoTxt} · atualizado em {dataHora(ultimo?.updatedAt)} por {ultimo?.autorNome || "—"}
          {modo === "central-leitura" && " · somente leitura"}
        </span>
        {modo === "central-edicao" && catalogo.alteracoes > 0 && (
          <Badge variant="secondary">{catalogo.alteracoes} {catalogo.alteracoes === 1 ? "alteração não publicada" : "alterações não publicadas"}</Badge>
        )}
        {historicoBtn}
        {modo === "central-edicao" && (
          <>
            <Button size="sm" variant="outline" className="h-7 gap-1" disabled={catalogo.alteracoes === 0 || busy} onClick={() => void catalogo.descartar()}>
              <Undo2 className="h-3.5 w-3.5" /> Descartar
            </Button>
            <Button size="sm" className="h-7 gap-1" disabled={catalogo.alteracoes === 0 || busy} onClick={() => setPubOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Publicar
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {faixa}

      <Dialog open={initOpen} onOpenChange={setInitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inicializar catálogo central</DialogTitle>
            <DialogDescription>
              Será publicado como versão 1: {catalogo.rotinasPessoais.length} rotinas, {catalogo.gmudsPessoais.length} GMUDs.
              Depois disso, todos passam a usar este catálogo fora das cotações. Cotações já salvas não mudam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitOpen(false)}>Cancelar</Button>
            <Button disabled={busy} onClick={inicializar}>Confirmar e publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pubOpen} onOpenChange={setPubOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar catálogo central</DialogTitle>
            <DialogDescription>{catalogo.alteracoes} alteração(ões) serão publicadas para todos. Cotações já salvas não mudam.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Comentário (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPubOpen(false)}>Cancelar</Button>
            <Button disabled={busy} onClick={publicar}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={atualizarOpen} onOpenChange={setAtualizarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar para o catálogo central vigente</DialogTitle>
            <DialogDescription>
              Total atual {brl(totalAtual)} → com o catálogo vigente {brl(totalVigente)}
            </DialogDescription>
          </DialogHeader>
          {orfaos.length > 0 && (
            <div className="rounded border p-2 text-xs space-y-1">
              <p className="font-medium">Ajustes desta cotação que serão descartados (item não existe no catálogo vigente):</p>
              <ul className="list-disc pl-4">
                {orfaos.map((o) => {
                  const nome = o.tipo === "rotina"
                    ? (catalogo.rotinas.find((r) => r.id === o.id)?.rotina ?? o.id)
                    : (catalogo.gmuds.find((g) => g.id === o.id)?.descricao ?? o.id);
                  return <li key={o.tipo + o.id}>{o.tipo === "rotina" ? "Rotina" : "GMUD"}: {nome}</li>;
                })}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtualizarOpen(false)}>Cancelar</Button>
            <Button onClick={atualizarCotacao}>Confirmar atualização</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={histOpen} onOpenChange={(o) => { setHistOpen(o); if (!o) setVerItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{verItem ? `${verItem.tipo === "rotinas" ? "Rotinas" : "GMUDs"} · versão ${verItem.versao}` : "Histórico do catálogo central"}</DialogTitle>
            <DialogDescription>{verItem ? "Somente leitura." : "Cada publicação fica registrada e não pode ser alterada."}</DialogDescription>
          </DialogHeader>
          {verItem ? (
            <div className="space-y-2">
              <Button variant="ghost" size="sm" onClick={() => setVerItem(null)}>← Voltar</Button>
              <ul className="text-xs space-y-1">
                {(verItem.conteudo as Array<Record<string, unknown>>).map((it, i) => (
                  <li key={String(it.id ?? i)} className="rounded border px-2 py-1">
                    <strong>{String(it.rotina ?? it.descricao ?? it.id)}</strong>
                    {" · "}{String(it.oferta ?? "")} {it.frequencia ? `· ${String(it.frequencia)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : !historico ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : historico.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma publicação.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {historico.map((h) => (
                <li key={h.id} className="flex items-center gap-2 rounded border px-2 py-1.5">
                  <span className="flex-1">
                    <strong>{h.tipo === "rotinas" ? "Rotinas" : "GMUDs"} v{h.versao}</strong> · {dataHora(h.updatedAt)} · {h.autorNome || "—"}
                    {h.comentario && <span className="block text-muted-foreground">{h.comentario}</span>}
                  </span>
                  <Button variant="outline" size="sm" className="h-6" onClick={() => setVerItem(h)}>Ver</Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
