import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Database, Hand, Bot, FolderOpen, ArrowLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import UserMenu from "@/components/auth/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/profissionais-alocados/base-conhecimento", label: "Base de Conhecimento", icon: Database },
  { to: "/profissionais-alocados/precificacao-manual", label: "Precificação Manual", icon: Hand },
  { to: "/profissionais-alocados/precificacao-ia", label: "Precificação por IA", icon: Bot },
  { to: "/profissionais-alocados/cotacoes", label: "Cotações Salvas", icon: FolderOpen },
];

function AppSidebar() {
  const { pathname } = useLocation();
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(it.to)}>
                    <NavLink to={it.to} className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function ProfissionaisLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center gap-2 px-4">
            <SidebarTrigger />
            <Button asChild variant="ghost" size="sm">
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Hub</Link>
            </Button>
            <div className="flex-1 text-sm font-semibold tracking-tight">
              Precificação de Profissionais Alocados
            </div>
            <ThemeToggle />
            <UserMenu />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}