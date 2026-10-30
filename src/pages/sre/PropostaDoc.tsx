import { A_CONFIRMAR, dataExtenso, type ModeloPropostaSre } from "@/lib/sre/proposta";
import selbettiLogo from "@/assets/selbetti-logo.png.asset.json";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtH = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
// Documento impresso: cores fixas de papel (não seguem o tema da tela).
const COR = "#17392F";
const PEND = "#FFF59D";

const Pd = ({ t }: { t: string }) => <span style={t.includes(A_CONFIRMAR) ? { background: PEND } : undefined}>{t}</span>;
function T({ children }: { children: string }) {
  return <>{children.split(/\n+/).filter((l) => l.trim()).map((l, i) => <p key={i} style={{ margin: "0 0 8px" }}><Pd t={l} /></p>)}</>;
}
function Pagina({ children }: { children: React.ReactNode }) {
  return (
    <div className="sre-pagina mx-auto mb-6 shadow-sm" style={{ width: "210mm", minHeight: "297mm", padding: "22mm 20mm", background: "#fff", color: "#000", fontFamily: "'Segoe UI', sans-serif", fontSize: 13, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ color: COR, fontSize: 22, fontWeight: 700, margin: "0 0 14px" }}>{children}</h2>;
const S = ({ children }: { children: React.ReactNode }) => <h3 style={{ color: COR, fontSize: 15, fontWeight: 700, margin: "18px 0 6px" }}>{children}</h3>;

/** Proposta SRE em páginas A4 — usada na pré-visualização e no PDF. */
export default function PropostaDocSre({ m }: { m: ModeloPropostaSre }) {
  const td: React.CSSProperties = { border: "1px solid #bfbfbf", padding: "6px 8px", fontSize: 12 };
  const cli = m.cliente.razao || A_CONFIRMAR;
  const ref = `${m.numeroProposta}${m.versao ? ` · versão ${m.versao}` : ""}`;
  return (
    <div id="sre-proposta-doc">
      <Pagina>
        <img src={selbettiLogo.url} alt="Selbetti" crossOrigin="anonymous" style={{ height: 52, width: "auto" }} />
        <div style={{ marginTop: "70mm" }}>
          <p style={{ color: COR, fontSize: 34, fontWeight: 700, margin: 0 }}>PROPOSTA COMERCIAL</p>
          <p style={{ color: COR, fontSize: 22, margin: "0 0 50px" }}>Pacotes Consultivos Zabbix SRE</p>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}><Pd t={cli} /></p>
          <p style={{ fontSize: 12 }}>{ref}</p>
        </div>
        <div style={{ height: 40 }} />
        <p style={{ marginBottom: 24 }}>{m.cidade}, {dataExtenso(m.dataEmissao)}.</p>
        <p style={{ fontWeight: 700, margin: 0 }}><Pd t={cli} /></p>
        {m.cliente.cnpj && <p style={{ margin: 0 }}>CNPJ: {m.cliente.cnpj}</p>}
        {m.cliente.endereco && <p style={{ margin: 0 }}>{m.cliente.endereco}</p>}
        {m.contato.nome && <p style={{ margin: 0 }}>A/C {m.contato.nome}{m.contato.cargo ? ` – ${m.contato.cargo}` : ""}</p>}
        {m.contato.email && <p style={{ margin: 0 }}>{m.contato.email}</p>}
        <div style={{ height: 20 }} />
        <p>Prezado(a),</p>
        <p>Agradecemos a oportunidade de apresentar nossa proposta de pacotes consultivos para Zabbix. Nas próximas páginas detalhamos o escopo, as condições comerciais e os investimentos.</p>
        <p style={{ marginBottom: 30 }}>Permanecemos à disposição para quaisquer esclarecimentos.</p>
        <p style={{ margin: 0 }}>Atenciosamente,</p>
        <p style={{ fontWeight: 700, margin: 0 }}><Pd t={m.consultor.nome || A_CONFIRMAR} /></p>
        {m.consultor.cargo && <p style={{ margin: 0 }}>{m.consultor.cargo}</p>}
        <p>Selbetti IT Solutions</p>
      </Pagina>
      <Pagina>
        <H>Quem somos</H>
        <T>{m.quemSomos}</T>
        <ul style={{ paddingLeft: 20, listStyle: "disc" }}>{m.numeros.map((n, i) => <li key={i}><Pd t={`${n.valor}${n.rotulo ? ` ${n.rotulo}` : ""}`} /></li>)}</ul>
        <div style={{ height: 24 }} />
        <H>Objeto e escopo</H>
        <T>{m.objeto}</T>
        <p style={{ fontWeight: 700 }}>{m.fraseEscopo}</p>
      </Pagina>
      {m.blocos.map((b) => (
        <Pagina key={b.partNumber}>
          <H>{b.titulo}</H>
          <p style={{ fontSize: 11, marginTop: -8 }}>{b.partNumber} · {fmtH(b.horas)} horas{b.tagline ? ` · ${b.tagline}` : ""}</p>
          {b.campos.map((c) => (<div key={c.label}><S>{c.label}</S><T>{c.texto}</T></div>))}
        </Pagina>
      ))}
      <Pagina>
        <H>Investimento</H>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Part number", "Descrição", "Horas", "Quantidade", "Valor por hora", "Valor Total"].map((h) => <th key={h} style={{ ...td, background: "#E7EFEA", fontWeight: 700, textAlign: "center" }}>{h}</th>)}</tr></thead>
          <tbody>
            {m.itens.map((i, k) => (
              <tr key={k}>
                <td style={td}>{i.partNumber}</td><td style={td}>{i.descricao}</td>
                <td style={{ ...td, textAlign: "center" }}>{fmtH(i.horas)}</td><td style={{ ...td, textAlign: "center" }}>{i.quantidade}</td>
                <td style={{ ...td, textAlign: "right" }}>{brl(i.valorHora)}</td><td style={{ ...td, textAlign: "right" }}>{brl(i.total)}</td>
              </tr>
            ))}
            <tr><td colSpan={5} style={{ ...td, textAlign: "right", fontWeight: 700 }}>Total geral</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{brl(m.total)}</td></tr>
          </tbody>
        </table>
        <p style={{ fontSize: 11 }}>Valor por hora calculado sobre as horas do pacote.</p>
        <S>Condições comerciais</S>
        <ul style={{ paddingLeft: 20, listStyle: "disc" }}>{m.condicoes.map((c, i) => <li key={i}><Pd t={c} /></li>)}</ul>
        {m.observacoes && (<><S>Observações</S><T>{m.observacoes}</T></>)}
        <S>Informações tributárias</S>
        <T>{m.textoTributario}</T>
        <S>Dados de faturamento da Selbetti</S>
        {m.dadosFaturamento.map((l, i) => <p key={i} style={{ margin: 0 }}><Pd t={l} /></p>)}
      </Pagina>
      <Pagina>
        <H>Aceite</H>
        <p>Declaramos estar de acordo com a proposta {ref}, contemplando:</p>
        <ul style={{ paddingLeft: 20, listStyle: "disc" }}>{m.aceite.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <p style={{ fontWeight: 700, marginBottom: 60 }}>Valor total: {brl(m.total)}</p>
        <p style={{ margin: 0 }}>_____________________________________________</p>
        <p style={{ fontWeight: 700, margin: 0 }}><Pd t={cli} /></p>
        <p style={{ fontSize: 11 }}>Nome / Cargo / Data</p>
      </Pagina>
    </div>
  );
}

/** PDF página a página a partir das páginas A4 renderizadas. */
export async function exportarPropostaSrePdf(nomeArquivo: string) {
  const root = document.getElementById("sre-proposta-doc");
  if (!root) throw new Error("Proposta indisponível.");
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
  const pags = Array.from(root.querySelectorAll<HTMLElement>(".sre-pagina"));
  for (let i = 0; i < pags.length; i++) {
    const c = await html2canvas(pags[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const h = Math.min(297, (c.height * 210) / c.width);
    if (i) pdf.addPage();
    pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, h, undefined, "FAST");
  }
  pdf.save(nomeArquivo);
}
