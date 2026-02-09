import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "./AuthShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const location = useLocation();
  const state = location.state as { emailVerified?: boolean } | null;

  useEffect(() => {
    if (state?.emailVerified) {
      toast.success("Email подтверждён. Войдите в аккаунт.");
      window.history.replaceState({}, "", location.pathname);
    }
  }, [state?.emailVerified, location.pathname]);

  return (
    <AuthShell mode="login">
      <LoginForm />
    </AuthShell>
  );
}
