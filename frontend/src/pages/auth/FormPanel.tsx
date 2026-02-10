import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { AuthMode } from "./AuthShell";

interface FormPanelProps {
  mode: AuthMode;
  children: ReactNode;
  /** Override for verification step (same card, different title/subtitle) */
  variant?: "default" | "verification";
}

export function FormPanel({ mode, children, variant = "default" }: FormPanelProps) {
  const { t } = useTranslation("auth");
  const isLogin = mode === "login";
  const isVerification = variant === "verification";

  const titleKey = isVerification ? "verification.title" : isLogin ? "login.title" : "register.title";
  const subtitleKey = isVerification ? "verification.subtitle" : isLogin ? "login.subtitle" : "register.subtitle";
  const trustText = isVerification ? "" : isLogin ? t("login.trust") : t("register.offer");
  const bottomText = isLogin ? t("login.noAccount") : t("register.hasAccount");
  const bottomLinkText = isLogin ? t("login.register") : t("register.login");
  const bottomLinkTo = isLogin ? "/register" : "/login";

  return (
    <div className={`flex h-full min-h-0 flex-col bg-white dark:bg-card rounded-2xl md:rounded-none shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 min-w-0 ${isLogin ? "md:rounded-l-[28px]" : "md:rounded-r-[28px]"}`}>
      <div className="flex items-center gap-2 mb-5 sm:mb-8 shrink-0">
        <img
          src="/Neosmart/logo.png"
          alt="Neosmart"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain"
        />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Neosmart
        </span>
      </div>

      <div className="space-y-1.5 mb-5 sm:mb-8 shrink-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground break-words">
          {t(titleKey)}
        </h1>
        <p className="text-sm text-muted-foreground break-words">
          {t(subtitleKey)}
        </p>
        {trustText ? (
          <p className="text-xs text-primary/80 mt-2 break-words">
            {trustText}
          </p>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>

      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-sm text-muted-foreground shrink-0">
        <span className="break-words">{bottomText}</span>
        <Link
          to={bottomLinkTo}
          className="text-primary font-medium hover:underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded touch-manipulation"
        >
          {bottomLinkText}
        </Link>
      </div>
    </div>
  );
}
