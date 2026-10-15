import { A_CONFIRMAR, dataExtenso, type ModeloPropostaZbx } from "@/lib/zabbix/proposta";
import selbettiLogo from "@/assets/selbetti-logo.png.asset.json";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Documento impresso: cores fixas de papel (não seguem o tema da tela).
const COR = "#17392F";
const PEND = "#B45309";

function T({ children }: { children: string }) {
  return <>{children.split(/\n+/).filter((l) => l.trim()).map((l, i) => <p key={i} style={{ margin: "0 0 8px", color: l.includes(A_CONFIRMAR) ? PEND : undefined }}>{l.replace("|", " ")}</p>)}</>;
}
function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="zbx-pagina mx-auto mb-6 shadow-sm" style={{ width: "210mm", minHeight: "297mm", padding: "22mm 22mm", background: "#fff", color: "#000", fontFamily: "'Segoe UI', sans-serif", fontSize: 13, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ color: COR, fontSize: 22, fontWeight: 700, margin: "0 0 14px" }}>{children}</h2>;
const S = ({ children }: { children: React.ReactNode }) => <h3 style={{ color: COR, fontSize: 15, fontWeight: 700, margin: "18px 0 6px" }}>{children}</h3>;

/** Proposta em páginas A4 — usada na pré-visualização e no PDF. */
export default function PropostaDoc({ m }: { m: ModeloPropostaZbx }) {
  const cab = ["Descrição", "Quantidade", ...(m.exibirLista ? ["Valor de lista Zabbix"] : []), "Valor Unitário Selbetti", "Valor Total"];
  const td: React.CSSProperties = { border: "1px solid #bfbfbf", padding: "6px 8px", fontSize: 12 };
  return (
    <div id="zbx-proposta-doc">
      <Pagina>
        <img src={selbettiLogo.url} alt="Selbetti" crossOrigin="anonymous" style={{ height: 52, width: "auto" }} />
        <div style={{ marginTop: "70mm" }}>
          <p style={{ color: COR, fontSize: 34, fontWeight: 700, margin: 0 }}>PROPOSTA COMERCIAL</p>
          <p style={{ color: COR, fontSize: 22, margin: "0 0 50px" }}>Subscrições Oficiais Zabbix</p>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{m.cliente || A_CONFIRMAR}</p>
          <p style={{ fontSize: 12 }}>{m.codigo}{m.versao ? ` · versão ${m.versao}` : ""}</p>
        </div>
      </Pagina>
      <Pagina>
        <p style={{ marginBottom: 24 }}>{m.cidade}, {dataExtenso(m.dataEmissao)}.</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{m.cliente || A_CONFIRMAR}</p>
        {m.contato && <p style={{ margin: 0 }}>A/C {m.contato}</p>}
        {m.email && <p style={{ margin: 0 }}>{m.email}</p>}
        <div style={{ height: 20 }} />
        <p>Prezado(a),</p>
        <p>Agradecemos a oportunidade de apresentar nossa proposta para fornecimento de subscrições oficiais Zabbix. Nas próximas páginas detalhamos o escopo, as condições comerciais e os investimentos.</p>
        <p style={{ marginBottom: 30 }}>Permanecemos à disposição para quaisquer esclarecimentos.</p>
        <p style={{ margin: 0 }}>Atenciosamente,</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{m.consultor || A_CONFIRMAR}</p>
        <p>Selbetti IT Solutions</p>
      </Pagina>
      <Pagina>
        <H>Quem somos</H>
        <T>{m.quemSomos}</T>
        <ul style={{ paddingLeft: 20, listStyle: "disc" }}>{m.numeros.map((n, i) => <li key={i} style={{ color: n.includes(A_CONFIRMAR) ? PEND : undefined }}>{n.replace(" | ", " ").replace("|", " ")}</li>)}</ul>
        <div style={{ height: 24 }} />
        <H>Objeto e escopo</H>
        <T>{m.objeto}</T>
      </Pagina>
      {m.blocos.map((b) => (
        <Pagina key={b.partNumber}>
          <H>{b.titulo}{b.aConfirmar && <span style={{ color: PEND, fontSize: 13, marginLeft: 8 }}>{A_CONFIRMAR}</span>}</H>
          <p style={{ fontSize: 11, marginTop: -8 }}>{b.partNumber}{b.tagline ? ` · ${b.tagline}` : ""}</p>
          {b.campos.map((c) => (<div key={c.label}><S>{c.label}</S><T>{c.texto}</T></div>))}
        </Pagina>
      ))}
      <Pagina>
        <H>Investimento</H>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{cab.map((h) => <th key={h} style={{ ...td, background: "#E7EFEA", fontWeight: 700, textAlign: "center" }}>{h}</th>)}</tr></thead>
          <tbody>
            {m.itens.map((i, k) => (
              <tr key={k}>
                <td style={td}>{i.descricao}</td>
                <td style={{ ...td, textAlign: "center" }}>{i.quantidade}</td>
                {m.exibirLista && <td style={{ ...td, textAlign: "right" }}>{i.listaUnitarioBrl == null ? "—" : brl(i.listaUnitarioBrl)}</td>}
                <td style={{ ...td, textAlign: "right" }}>{brl(i.unitario)}</td>
                <td style={{ ...td, textAlign: "right" }}>{brl(i.total)}</td>
              </tr>
            ))}
            <tr><td colSpan={cab.length - 1} style={{ ...td, textAlign: "right", fontWeight: 700 }}>Total geral</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{brl(m.total)}</td></tr>
          </tbody>
        </table>
        <S>Condições comerciais</S>
        <ul style={{ paddingLeft: 20, listStyle: "disc" }}>
          <li>Vigência: {m.vigenciaMeses} meses.</li>
          <li>Validade da proposta: {m.validadeDias} dias (até {dataExtenso(m.dataValidade)}).</li>
          <li style={{ color: m.prazoPagamento.includes(A_CONFIRMAR) ? PEND : undefined }}>Prazo de pagamento: {m.prazoPagamento}</li>
          <li>Impostos: inclusos.</li>
          <li>Faturamento sujeito à aprovação de crédito.</li>
        </ul>
        {m.observacoes && (<><S>Observações</S><T>{m.observacoes}</T></>)}
        <S>Informações tributárias</S>
        <T>{m.textoTributario}</T>
        <S>Dados de faturamento da Selbetti</S>
        {m.dadosFaturamento.map((l, i) => <p key={i} style={{ margin: 0, color: l.includes(A_CONFIRMAR) ? PEND : undefined }}>{l.replace("|", " ")}</p>)}
      </Pagina>
      <Pagina>
        <H>Aceite</H>
        <p>Declaramos estar de acordo com a proposta {m.codigo}{m.versao ? ` (versão ${m.versao})` : ""}, contemplando:</p>
        <ul style={{ paddingLeft: 20, listStyle: "disc" }}>{m.itens.map((i, k) => <li key={k}>{i.quantidade} × {i.descricao} — {brl(i.total)}</li>)}</ul>
        <p style={{ fontWeight: 700, marginBottom: 80 }}>Valor total: {brl(m.total)}</p>
        <p style={{ margin: 0 }}>_____________________________________________</p>
        <p style={{ fontWeight: 700, margin: 0 }}>{m.cliente || A_CONFIRMAR}</p>
        <p style={{ fontSize: 11 }}>Nome / Cargo / Data</p>
      </Pagina>
    </div>
  );
}

/** PDF página a página a partir da pré-visualização. */
export async function exportarPropostaPdf(nome: string) {
  const paginas = Array.from(document.querySelectorAll<HTMLElement>("#zbx-proposta-doc .zbx-pagina"));
  if (!paginas.length) throw new Error("Pré-visualização indisponível.");
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  for (let i = 0; i < paginas.length; i++) {
    const canvas = await html2canvas(paginas[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const h = Math.min(297, (canvas.height * 210) / canvas.width);
    if (i) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, h, undefined, "FAST");
  }
  pdf.save(nome);
}
