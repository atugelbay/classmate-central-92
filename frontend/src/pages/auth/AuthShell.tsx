import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormPanel } from "./FormPanel";
import { VisualPanel } from "./VisualPanel";

export type AuthMode = "login" | "register";

const TRANSITION = { duration: 0.55, ease: [0.32, 0.72, 0, 1] as const };

interface AuthShellProps {
  mode: AuthMode;
  children: ReactNode;
  /** Current wizard step (1–4) when mode="register". Passed to VisualPanel. */
  registerStep?: number;
  /** Use "verification" for standalone verify-email page (same layout, verification title). */
  formPanelVariant?: "default" | "verification";
}

export function AuthShell({ mode, children, registerStep, formPanelVariant = "default" }: AuthShellProps) {
  const isMobile = useIsMobile();
  const isLogin = mode === "login";

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[hsl(270,58%,97%)] via-[hsl(270,35%,95%)] to-[hsl(25,50%,96%)] dark:from-[hsl(224,71%,6%)] dark:via-[hsl(224,71%,4%)] dark:to-[hsl(215,28%,10%)] px-2 sm:px-3 md:px-6 px-2 sm:px-3 md:px-6 py-4 sm:py-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="relative w-full max-w-[1200px] h-full min-h-0 flex flex-col md:block">
        <div className="relative z-10 flex-1 md:flex-none min-h-0 md:min-h-[680px] lg:h-[720px] max-h-[85dvh] md:max-h-[90vh] rounded-[20px] md:rounded-[28px] border border-white/50 dark:border-white/10 bg-white/90 dark:bg-[rgba(9,12,20,0.96)] shadow-[0_24px_80px_rgba(15,20,26,0.12)] overflow-hidden flex flex-col md:flex-row">
          {isMobile ? (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
              <FormPanel mode={mode} variant={formPanelVariant}>{children}</FormPanel>
            </div>
          ) : (
            <motion.div
              layout
              className="flex h-full w-full"
              transition={TRANSITION}
            >
              <motion.div
                layoutId="formPanel"
                transition={TRANSITION}
                className="flex-[1.1] min-w-0 flex flex-col"
                style={{ order: isLogin ? 1 : 2 }}
              >
                <FormPanel mode={mode} variant={formPanelVariant}>{children}</FormPanel>
              </motion.div>
              <motion.div
                layoutId="visualPanel"
                transition={TRANSITION}
                className="flex-[0.9] min-w-0 hidden sm:flex flex-col"
                style={{ order: isLogin ? 2 : 1 }}
              >
                <VisualPanel mode={mode} currentStep={registerStep} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
