import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Mail, Lock, Building2 } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("errors.weakPassword"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("common:validation.minLength", { min: 6 }));
      return;
    }

    if (!companyName.trim()) {
      toast.error(t("common:validation.required"));
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password, companyName);
      toast.success(t("common:success"));
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("errors.emailExists"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(270,60%,98%)] via-[hsl(270,40%,96%)] to-[hsl(25,60%,97%)] dark:from-[hsl(224,71%,4%)] dark:via-[hsl(224,71%,6%)] dark:to-[hsl(215,28%,10%)] p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[hsl(262,83%,70%)] rounded-full opacity-[0.08] dark:opacity-[0.15] blur-[100px] translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[hsl(25,95%,75%)] dark:bg-[hsl(262,60%,50%)] rounded-full opacity-[0.1] dark:opacity-[0.12] blur-[120px] -translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/3 left-0 w-64 h-64 bg-[hsl(262,83%,70%)] rounded-full opacity-[0.06] dark:opacity-[0.1] blur-[80px] -translate-x-1/2" />
      
      <Card className="w-full max-w-md relative z-10 shadow-soft-lg border-0 backdrop-blur-sm bg-white/80 dark:bg-card/90">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex justify-center">
            <img 
              src="/Neosmart/logo.png" 
              alt="Neosmart Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold">
              {t("register.title")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("register.subtitle")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">{t("register.name")}</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder={t("register.name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("register.email")}</Label>
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
              <Label htmlFor="companyName" className="text-sm font-medium">{t("register.companyName")}</Label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder={t("register.companyName")}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t("register.password")}</Label>
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">{t("register.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-11"
                  />
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? t("common:loading") : t("register.submit")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("register.hasAccount")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline underline-offset-4">
              {t("register.login")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

