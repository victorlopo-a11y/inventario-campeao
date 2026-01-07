import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const params = new URLSearchParams(hash);
    if (params.get("type") === "recovery") {
      setRecoveryMode(true);
      setIsLogin(true);
    }
  }, []);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "Informe seu email",
        description: "Digite seu email para receber o link de redefinição.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast({
        title: "Link enviado",
        description: "Verifique seu email para redefinir a senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoveryPassword || recoveryPassword.length < 6) {
      toast({
        title: "Senha invalida",
        description: "Use pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (recoveryPassword !== recoveryConfirm) {
      toast({
        title: "Senhas diferentes",
        description: "Confirme a mesma senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: recoveryPassword,
      });
      if (error) throw error;
      toast({
        title: "Senha atualizada",
        description: "Agora voce ja pode fazer login.",
      });
      window.history.replaceState({}, document.title, "/auth");
      setRecoveryMode(false);
      setRecoveryPassword("");
      setRecoveryConfirm("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao sistema.",
        });
        navigate("/");
      } else {
        if (!fullName.trim()) {
          toast({
            title: "Informe seu nome",
            description: "Adicione seu nome para criar a conta.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName.trim(),
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Conta criada com sucesso!",
          description: "VocǦ jǭ pode fazer login.",
        });
        setIsLogin(true);
        setFullName("");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryMode) {
      await handleRecovery();
      return;
    }
    await handleAuth();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {recoveryMode ? "Redefinir senha" : isLogin ? "Login" : "Criar Conta"}
          </CardTitle>
          <CardDescription className="text-center">
            Sistema de Rastreamento de PerifǸricos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !recoveryMode && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            {!recoveryMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
                </Button>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="w-full text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}
            {recoveryMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recoveryPassword">Nova senha</Label>
                  <Input
                    id="recoveryPassword"
                    type="password"
                    placeholder="********"
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recoveryConfirm">Confirmar senha</Label>
                  <Input
                    id="recoveryConfirm"
                    type="password"
                    placeholder="********"
                    value={recoveryConfirm}
                    onChange={(e) => setRecoveryConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Carregando..." : "Salvar nova senha"}
                </Button>
              </>
            )}
          </form>
          {!recoveryMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin
                  ? "Nǜo tem uma conta? Criar conta"
                  : "Jǭ tem uma conta? Fazer login"}
              </button>
            </div>
          )}
          {recoveryMode && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  window.history.replaceState({}, document.title, "/auth");
                  setRecoveryMode(false);
                }}
                className="text-sm text-primary hover:underline"
              >
                Voltar para login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
