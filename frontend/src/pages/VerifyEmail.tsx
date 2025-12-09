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
      setTimeout(() => navigate("/login"), 2000);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-center">Email подтвержден!</CardTitle>
            <CardDescription className="text-center">
              Вы будете перенаправлены на страницу входа...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Введите код подтверждения</CardTitle>
          <CardDescription className="text-center">
            Мы отправили 6-значный код на {email || "вашу почту"}.
            Введите его ниже для завершения регистрации.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-2xl tracking-widest uppercase"
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={status === "loading"}>
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
              className="text-sm text-primary hover:underline"
            >
              Отправить код повторно
            </button>
          </div>
          
          <div className="mt-2 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:underline"
            >
              Вернуться к входу
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
