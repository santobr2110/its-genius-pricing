import { moedaBS, secoesPropostaBS, type ModeloPropostaBS } from '@/lib/bodyshop/proposta';
import logo from '@/assets/selbetti-logo.png.asset.json';
export default function PropostaDoc({modelo:m}:{modelo:ModeloPropostaBS}) {
  return <div className="bs-resumo-printable p-6 sm:p-8 space-y-6 break-words">
    <header className="space-y-2 border-b pb-5"><img src={logo.url} alt="Selbetti" className="w-40"/><h1 className="text-2xl font-bold">BodyShop — Alocação de Profissionais</h1><p>{m.cliente}</p><p className="text-sm">{m.codigo} · v{m.versao}</p></header>
    {secoesPropostaBS(m).map((s,k)=><section key={k} className="space-y-3"><h2 className="text-lg font-semibold">{s.titulo}</h2>
      {'investimento' in s && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b"><th className="text-left py-2">Perfil</th><th>Quantidade</th><th>Valor Mensal Unitário</th><th>Valor Mensal Total</th></tr></thead><tbody>{m.itens.map(i=><tr key={i.id} className="border-b"><td className="py-2">{i.perfil}</td><td className="text-center">{i.quantidade}</td><td className="text-right whitespace-nowrap">{moedaBS(i.unitario)}</td><td className="text-right whitespace-nowrap">{moedaBS(i.total)}</td></tr>)}</tbody></table></div>}
      {s.textos.filter(Boolean).map((t,i)=><p key={i} className="text-sm whitespace-pre-line leading-relaxed">{t}</p>)}
    </section>)}
  </div>;
}