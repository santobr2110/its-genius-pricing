import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft } from "lucide-react";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";

const TITLES: Record<string, string> = {
  "/datacenter": "Datacenter",
  "/cloud": "Cloud",
  "/observabilidade": "Observabilidade",
  "/pacote-horas": "Pacote de Horas",
  "/bodyshop": "Bodyshop",
};

export default function EmBreve() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? "Em breve";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Construction className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-bold text-foreground truncate text-base">IT Solutions · {title}</h1>
          </div>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <BUMenu />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-4">
        <div className="rounded-lg border bg-background p-12 flex flex-col items-center justify-center text-center gap-4">
          <Construction className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground max-w-md">
            Este agrupamento da Business Unit IT Solutions ainda está em construção e será disponibilizado em breve.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para IT Solutions
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}