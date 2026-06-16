import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackHomeButtonProps {
  /** Destino do botão "Início". Padrão: /ito (camadas da oferta Smart ITO). */
  to?: string;
}

export default function BackHomeButton({ to = "/ito" }: BackHomeButtonProps) {
  return (
    <Link to={to}>
      <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 shrink-0" aria-label="Voltar para o início">
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Início</span>
      </Button>
    </Link>
  );
}
