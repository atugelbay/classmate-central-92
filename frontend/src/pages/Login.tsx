import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success(t("common:success"));
      // Полная перезагрузка страницы для сброса всех данных
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("errors.invalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(270,60%,98%)] via-[hsl(270,40%,96%)] to-[hsl(25,60%,97%)] dark:from-[hsl(224,71%,4%)] dark:via-[hsl(224,71%,6%)] dark:to-[hsl(215,28%,10%)] p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[hsl(262,83%,70%)] rounded-full opacity-[0.08] dark:opacity-[0.15] blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[hsl(25,95%,75%)] dark:bg-[hsl(262,60%,50%)] rounded-full opacity-[0.1] dark:opacity-[0.12] blur-[120px] translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-[hsl(262,83%,70%)] rounded-full opacity-[0.06] dark:opacity-[0.1] blur-[80px] translate-x-1/2" />
      
      <Card className="w-full max-w-md relative z-10 shadow-soft-lg border-0 backdrop-blur-sm bg-white/80 dark:bg-card/90">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <img 
              src="/Neosmart/logo.png" 
              alt="Neosmart Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold">
              {t("login.title")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("login.subtitle")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? t("common:loading") : t("login.submit")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <Link to="/register" className="text-primary font-medium hover:underline underline-offset-4">
              {t("login.register")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

