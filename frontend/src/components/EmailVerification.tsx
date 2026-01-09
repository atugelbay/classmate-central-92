import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import authAPI from "@/api/auth";
import { useAuth } from "@/context/AuthContext";

export function EmailVerification() {
  const { user, handleAuth } = useAuth();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.email) {
      toast.error("Email не найден");
      return;
    }
    
    if (code.length !== 6) {
      toast.error("Код должен состоять из 6 символов");
      return;
    }

    setIsVerifying(true);
    try {
      await authAPI.verifyEmail(user.email, code);
      toast.success("Email успешно подтвержден!");
      
      // Обновляем информацию о пользователе
      const updatedUser = await authAPI.me();
      handleAuth({
        token: localStorage.getItem('token') || '',
        refreshToken: localStorage.getItem('refreshToken') || '',
        user: updatedUser
      });
      
      setCode("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Неверный код подтверждения");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email) {
      toast.error("Email не найден");
      return;
    }
    
    setIsResending(true);
    try {
      // For authenticated users, backend will use email from context automatically
      // For unauthenticated users, email will be sent in request body
      await authAPI.resendVerification(user.email);
      toast.success("Новый код отправлен на вашу почту");
      setCode(""); // Clear code input after resending
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Ошибка отправки кода");
    } finally {
      setIsResending(false);
    }
  };

  if (!user) {
    return null;
  }

  const isVerified = user.isEmailVerified === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Подтверждение Email
        </CardTitle>
        <CardDescription>
          {isVerified
            ? "Ваш email успешно подтвержден"
            : "Подтвердите ваш email адрес для полного доступа к функциям системы"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isVerified ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Email подтвержден: {user.email}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Email не подтвержден
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Подтвердите ваш email адрес: <strong>{user.email}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Код подтверждения</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Введите 6-значный код"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(value.toUpperCase());
                  }}
                  maxLength={6}
                  disabled={isVerifying || isResending}
                  className="text-center text-lg tracking-widest font-mono"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Введите 6-значный код, отправленный на вашу почту
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={code.length !== 6 || isVerifying || isResending}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Подтверждение...
                    </>
                  ) : (
                    "Подтвердить Email"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={isVerifying || isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить код заново"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
