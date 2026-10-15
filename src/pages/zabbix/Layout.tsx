import { Link, Outlet, useLocation } from "react-router-dom";
import { Settings, ShieldCheck } from "lucide-react";
import BUMenu from "@/components/BUMenu";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import BackHomeButton from "@/components/BackHomeButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const BASE = "/observabilidade/subscricoes-zabbix";

export function ZabbixEmConstrucao() {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldCheck className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">Subscrições Zabbix</h1>
        <p className="text-sm text-muted-foreground">Configurador de Subscrições Zabbix em construção.</p>
      </CardContent>
    </Card>
  );
}

export default function ZabbixLayout() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <BackHomeButton />
          <BUMenu />
          <div className="ml-auto flex items-center gap-2">
            {can("page.zbx.admin") && (
              <Button asChild size="sm" variant={pathname.startsWith(`${BASE}/configuracoes`) ? "default" : "outline"}>
                <Link to={`${BASE}/configuracoes`}><Settings className="h-4 w-4 mr-1" />Configurações</Link>
              </Button>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
