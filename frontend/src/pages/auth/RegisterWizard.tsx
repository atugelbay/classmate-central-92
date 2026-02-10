import { FormEvent, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { User, Building2, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authAPI } from "@/api/auth";

const STEPS = 4;
const TRANSITION = { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const };

export function RegisterWizard({ onStepChange }: { onStepChange?: (step: number) => void }) {
  const [step, setStep] = useState(1);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    onStepChange?.(verificationEmail ? 5 : step);
  }, [step, verificationEmail, onStepChange]);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading">("idle");
  const [resendLoading, setResendLoading] = useState(false);

  const navigate = useNavigate();
  // Не используем useAuth().register — он сохраняет токен и сразу редиректит в CRM.
  // Вызываем API напрямую, чтобы остаться на странице и показать шаг верификации.
  const { t } = useTranslation("auth");

  const canGoNext = useCallback(() => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return companyName.trim().length > 0;
    if (step === 3) return email.trim().length > 0;
    if (step === 4) {
      if (password.length < 6) return false;
      if (password !== confirmPassword) return false;
      return true;
    }
    return false;
  }, [step, name, companyName, email, password, confirmPassword]);

  const goNext = useCallback(() => {
    if (step === 1 && !name.trim()) {
      toast.error(t("common:validation.required"));
      return;
    }
    if (step === 2 && !companyName.trim()) {
      toast.error(t("common:validation.required"));
      return;
    }
    if (step === 3 && !email.trim()) {
      toast.error(t("common:validation.required"));
      return;
    }
    if (step === 4) return;
    setStep((s) => Math.min(s + 1, STEPS));
  }, [step, name, companyName, email, t]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step < STEPS) {
      goNext();
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("errors.weakPassword"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("common:validation.minLength", { min: 6 }));
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.register({ name, email, password, companyName, phone: phone || "" });
      if (typeof window.gtag === "function") {
        const transactionId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `reg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        window.gtag("event", "conversion", {
          send_to: "AW-17925890772/T7IECMPy5_UbENTF3eNC",
          value: 1.0,
          currency: "USD",
          transaction_id: transactionId,
        });
      }
      toast.success(t("common:success"));
      setVerificationEmail(email);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || t("errors.emailExists"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!verificationEmail || code.length !== 6) {
      toast.error(t("verification.enterCode") || "Введите 6-значный код");
      return;
    }
    setVerifyStatus("loading");
    try {
      await authAPI.verifyEmail(verificationEmail, code);
      toast.success("Email подтверждён");
      navigate("/login", { state: { emailVerified: true } });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Неверный или просроченный код");
    } finally {
      setVerifyStatus("idle");
    }
  };

  const handleResend = async () => {
    if (!verificationEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerification(verificationEmail);
      toast.success(t("verification.resend") || "Код отправлен повторно");
    } catch {
      toast.error("Ошибка отправки");
    } finally {
      setResendLoading(false);
    }
  };

  const progress = verificationEmail ? 1 : step / STEPS;

  if (verificationEmail) {
    return (
      <form onSubmit={handleVerify} className="flex flex-col flex-1 min-h-0">
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("verification.title")}
          </p>
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={false}
              animate={{ width: "100%" }}
              transition={TRANSITION}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-sm text-muted-foreground mb-4">
            {t("verification.subtitle")} <span className="font-medium text-foreground">{verificationEmail}</span>
          </p>
          <div className="space-y-2 mb-4">
            <Label htmlFor="verify-code">{t("verification.enterCode")}</Label>
            <Input
              id="verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6))}
              className="h-12 text-center text-lg tracking-[0.4em] font-mono uppercase"
              maxLength={6}
              disabled={verifyStatus === "loading"}
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Не пришёл код? В режиме разработки он может выводиться в консоль сервера. Или нажмите «Отправить повторно».
          </p>
          <div className="flex flex-col gap-3 mt-auto">
            <Button
              type="submit"
              className="h-12 w-full"
              disabled={code.length !== 6 || verifyStatus === "loading"}
            >
              {verifyStatus === "loading" ? (
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
              disabled={resendLoading}
              className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
            >
              {resendLoading ? t("common:loading") : t("verification.resend")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:underline"
            >
              Пропустить — войти позже
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          {t("register.stepLabel", { current: step, total: STEPS })}
        </p>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={TRANSITION}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={TRANSITION}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="wizard-name">{t("register.name")}</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-name"
                    type="text"
                    placeholder={t("register.name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 h-12"
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={TRANSITION}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="wizard-company">{t("register.companyName")}</Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-company"
                    type="text"
                    placeholder={t("register.companyName")}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 h-12"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("register.companyNameHint")}</p>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={TRANSITION}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="wizard-email">{t("register.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-email"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 h-12"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-phone">{t("register.phone")} <span className="text-muted-foreground font-normal">({t("register.optional")})</span></Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-phone"
                    type="tel"
                    placeholder="+7"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 h-12"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={TRANSITION}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="wizard-password">{t("register.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 h-12"
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-confirm">{t("register.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="wizard-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-11 h-12"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {step === 4 && (
          <p className="text-xs text-muted-foreground">{t("register.ctaHint")}</p>
        )}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 md:flex-none"
              onClick={goBack}
              disabled={isLoading}
            >
              {t("register.back")}
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 md:flex-none min-w-[140px] h-12"
            disabled={!canGoNext() || isLoading}
            onClick={(e) => {
              if (step < STEPS) {
                e.preventDefault();
                goNext();
              }
            }}
          >
            {isLoading
              ? t("common:loading")
              : step === STEPS
                ? t("register.submit")
                : t("register.next")}
          </Button>
        </div>
      </div>
    </form>
  );
}
