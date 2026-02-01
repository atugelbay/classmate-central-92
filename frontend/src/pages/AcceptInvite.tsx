import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAcceptInvite } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { AuthResponse } from "@/api/auth";
import { UserPlus, Mail, Key, Lock, CheckCircle } from "lucide-react";

function useQueryParams() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function AcceptInvite() {
  const params = useQueryParams();
  const navigate = useNavigate();
  const { handleAuth } = useAuth();
  const acceptInvite = useAcceptInvite();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const paramEmail = params.get("email");
    const paramCode = params.get("code");
    if (paramEmail) setEmail(paramEmail);
    if (paramCode) setCode(paramCode);
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    try {
      const res = await acceptInvite.mutateAsync({
        email,
        code,
        password,
        confirmPassword,
      }) as AuthResponse;
      // Используем токены из ответа напрямую
      handleAuth(res);
      toast.success("Приглашение принято! Добро пожаловать!");
      navigate("/");
    } catch (err) {
      // handled by hook toast
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-background to-[hsl(var(--accent)/0.1)] relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute top-[40%] right-[10%] w-48 h-48 bg-primary/10 rounded-full blur-2xl" />

      <Card className="w-full max-w-md shadow-soft-lg border-0 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 rounded-3xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-[hsl(280,70%,45%)] flex items-center justify-center shadow-soft">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-[hsl(280,70%,45%)] bg-clip-text text-transparent">
              Принять приглашение
            </CardTitle>
            <CardDescription className="mt-2">
              Завершите настройку вашего аккаунта
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Код приглашения</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-значный код"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Не менее 6 символов"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Повторите пароль</Label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={acceptInvite.isPending}>
              {acceptInvite.isPending ? "Сохраняем..." : "Завершить регистрацию"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
