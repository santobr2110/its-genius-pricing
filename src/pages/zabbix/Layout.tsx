import { ShieldCheck } from "lucide-react";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import BackHomeButton from "@/components/BackHomeButton";
import { Card, CardContent } from "@/components/ui/card";

/** Layout provisório das Subscrições Zabbix (Fase 1). */
export default function ZabbixLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <BackHomeButton />
          <BUMenu />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Subscrições Zabbix</h1>
            <p className="text-sm text-muted-foreground">Configurador de Subscrições Zabbix em construção.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
