import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { termo } from "@/lib/servicedesk/glossario";

interface SiglaProps {
  /** Sigla presente no glossário (UM, FTE, SLA...). */
  termo: string;
  /** Texto exibido; por padrão a própria sigla. */
  children?: React.ReactNode;
}

/** Sigla com explicação em tooltip, alimentada pelo glossário do Service Desk. */
export default function Sigla({ termo: sigla, children }: SiglaProps) {
  const t = termo(sigla);
  const label = children ?? sigla;
  if (!t) return <>{label}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <abbr
          title=""
          className="cursor-help underline decoration-dotted underline-offset-2 no-underline-hover"
        >
          {label}
        </abbr>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs font-semibold">{t.sigla} — {t.titulo}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.descricao}</p>
      </TooltipContent>
    </Tooltip>
  );
}
