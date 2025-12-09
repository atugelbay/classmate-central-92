import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAcceptInvite } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { AuthResponse } from "@/api/auth";

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Принять приглашение</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Код приглашения</Label>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-значный код"
              />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Не менее 6 символов"
              />
            </div>
            <div className="space-y-2">
              <Label>Повторите пароль</Label>
              <Input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
              />
            </div>
            <Button type="submit" className="w-full" disabled={acceptInvite.isPending}>
              {acceptInvite.isPending ? "Сохраняем..." : "Завершить приглашение"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

