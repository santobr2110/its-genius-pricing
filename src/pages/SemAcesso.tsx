import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

export default function SemAcesso() {
  const { signOut, role, user } = useAuth();
  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 grid place-items-center mb-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <CardTitle>Sem acesso</CardTitle>
          <CardDescription>
            {role
              ? "Seu perfil não tem permissão para acessar esta área."
              : "Sua conta ainda não foi vinculada a um perfil. Aguarde a aprovação do administrador."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Logado como {user?.email}</p>
          <Button variant="outline" onClick={() => signOut()} className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
