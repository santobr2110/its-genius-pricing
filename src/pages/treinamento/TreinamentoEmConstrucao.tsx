import { GraduationCap, Construction } from "lucide-react";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import BackHomeButton from "@/components/BackHomeButton";

export default function TreinamentoEmConstrucao() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-4">
          <BackHomeButton />
          <GraduationCap className="h-5 w-5 text-primary shrink-0" />
          <h1 className="font-bold text-foreground truncate text-base">Observabilidade · Treinamento</h1>
          <div className="ml-auto shrink-0 pl-2 flex items-center gap-2">
            <BUMenu />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] p-4">
        <div className="rounded-lg border bg-background p-12 flex flex-col items-center text-center gap-4">
          <Construction className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Configurador de Treinamento em construção</h2>
          <p className="text-muted-foreground max-w-md">
            Cursos oficiais Zabbix e corporativo Grafana. O configurador chega nas próximas fases.
          </p>
        </div>
      </main>
    </div>
  );
}
