import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";

const credSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(72),
});

const signupSchema = credSchema.extend({
  fullName: z.string().trim().min(2, "Informe seu nome").max(120),
});

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signEmail, setSignEmail] = useState("");
  const [signPassword, setSignPassword] = useState("");
  const [signName, setSignName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (error) toast.error(error);
    else navigate("/", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({
      email: signEmail,
      password: signPassword,
      fullName: signName,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Cadastro realizado! Faça login.");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 grid place-items-center mb-2">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Smart ITO</CardTitle>
          <CardDescription>Acesse sua conta ou crie uma nova</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="le">Email</Label>
                  <Input id="le" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp">Senha</Label>
                  <Input id="lp" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sn">Nome</Label>
                  <Input id="sn" value={signName} onChange={(e) => setSignName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="se">Email</Label>
                  <Input id="se" type="email" value={signEmail} onChange={(e) => setSignEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sp">Senha (mín. 8)</Label>
                  <Input id="sp" type="password" value={signPassword} onChange={(e) => setSignPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O primeiro usuário cadastrado torna-se Administrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}