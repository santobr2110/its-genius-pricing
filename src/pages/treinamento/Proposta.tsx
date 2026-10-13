import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

export default function TreinamentoProposta() {
  return (
    <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-3">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Emissão da proposta</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        A proposta será gerada a partir dos itens do <Link to="/observabilidade/treinamento" className="text-primary hover:underline">Configurador</Link>. Disponível na próxima fase.
      </p>
    </div>
  );
}
