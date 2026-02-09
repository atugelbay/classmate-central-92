import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authAPI } from "@/api/auth";
import { AuthShell } from "./auth/AuthShell";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Введите email");
      return;
    }
    if (code.length !== 6) {
      toast.error("Код должен состоять из 6 символов");
      return;
    }
    setStatus("loading");
    try {
      await authAPI.verifyEmail(email.trim(), code);
      setStatus("success");
      toast.success("Email подтверждён");
      navigate("/login", { state: { emailVerified: true } });
    } catch (err: unknown) {
      setStatus("idle");
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Неверный код подтверждения");
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendLoading) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerification(email.trim());
      toast.success(t("verification.resend") || "Код отправлен повторно");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Ошибка отправки");
    } finally {
      setResendLoading(false);
    }
  };

  if (status === "success") {
    return (
      <AuthShell mode="register" formPanelVariant="verification">
        <div className="flex flex-col flex-1 min-h-0 justify-center text-center py-8">
          <p className="text-sm text-muted-foreground">Email подтверждён. Перенаправляем на вход...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="register" formPanelVariant="verification">
      <form onSubmit={handleVerify} className="flex flex-col flex-1 min-h-0">
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("verification.title")}
          </p>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-full bg-primary rounded-full" />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("verification.subtitle")}{" "}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              "— укажите email ниже"
            )}
          </p>
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email</Label>
            <Input
              id="verify-email"
              type="email"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verify-code">{t("verification.enterCode")}</Label>
            <Input
              id="verify-code"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6))}
              className="h-12 text-center text-lg tracking-[0.4em] font-mono uppercase"
              maxLength={6}
              disabled={status === "loading"}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Не пришёл код? В режиме разработки он может выводиться в консоль сервера.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="submit"
            className="h-12 w-full"
            disabled={code.length !== 6 || !email.trim() || status === "loading"}
          >
            {status === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Проверка...
              </>
            ) : (
              "Подтвердить"
            )}
          </Button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || !email.trim()}
            className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Отправка..." : t("verification.resend")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-sm text-muted-foreground hover:underline"
          >
            Пропустить — войти позже
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
