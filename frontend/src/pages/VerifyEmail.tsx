import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import authApi from "@/api/auth";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email");
  const [email, setEmail] = useState(emailFromQuery || "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Введите email");
      return;
    }
    if (code.length !== 6) {
      toast.error("Код должен состоять из 6 символов");
      return;
    }

    setStatus("loading");
    try {
      await authApi.verifyEmail(email, code);
      setStatus("success");
      toast.success("Email успешно подтвержден!");
      setTimeout(() => navigate("/select-plan"), 2000);
    } catch (error: any) {
      setStatus("idle");
      toast.error(error.response?.data?.error || "Неверный код подтверждения");
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Введите email для повторной отправки");
      return;
    }
    
    try {
      await authApi.resendVerification(email);
      toast.success("Новый код отправлен на вашу почту");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка отправки");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-background to-[hsl(var(--accent)/0.1)] relative overflow-hidden">
        {/* Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

        <Card className="w-full max-w-md shadow-soft-lg border-0 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 rounded-3xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-soft">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Email подтвержден!
              </CardTitle>
              <CardDescription className="mt-2">
                Вы будете перенаправлены на выбор тарифа...
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-background to-[hsl(var(--accent)/0.1)] relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute top-[40%] right-[10%] w-48 h-48 bg-primary/10 rounded-full blur-2xl" />

      <Card className="w-full max-w-md shadow-soft-lg border-0 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 rounded-3xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-[hsl(280,70%,45%)] flex items-center justify-center shadow-soft">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-[hsl(280,70%,45%)] bg-clip-text text-transparent">
              Введите код подтверждения
            </CardTitle>
            <CardDescription className="mt-2">
              Мы отправили 6-значный код на {email || "вашу почту"}.
              Введите его ниже для завершения регистрации.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === "loading"}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-2xl tracking-widest uppercase font-mono"
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : (
                "Подтвердить"
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-primary hover:underline font-medium"
            >
              Отправить код повторно
            </button>
          </div>
          
          <div className="mt-2 text-center">
            <button
              onClick={() => navigate("/select-plan")}
              className="text-sm text-muted-foreground hover:underline"
            >
              Пропустить верификацию
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
