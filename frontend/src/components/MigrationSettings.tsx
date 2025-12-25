import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Database, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { migrationAPI, MigrationStatus } from '@/api/migration';
import { useToast } from '@/hooks/use-toast';

export function MigrationSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    alfacrmUrl: '',
    email: '',
    apiKey: '',
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState<boolean | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

  useEffect(() => {
    if (!isMigrating) {
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const checkStatus = async () => {
      if (!isMounted || !isMigrating) {
        return;
      }

      try {
        const status = await migrationAPI.getStatus();
        
        if (!isMounted) return;
        
        setMigrationStatus(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          setIsMigrating(false);
          
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          
          if (status.status === 'completed') {
            toast({
              title: 'Миграция завершена!',
              description: `Импортировано: ${status.teachersCount} учителей, ${status.studentsCount} студентов, ${status.groupsCount} групп`,
            });
          } else {
            toast({
              title: 'Ошибка миграции',
              description: status.error || 'Произошла ошибка при миграции',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Error checking migration status:', error);
        // При ошибке тоже останавливаем polling чтобы не спамить запросами
        // Но только если это не временная ошибка сети
        if (isMounted) {
          // Проверяем, что это не просто ошибка сети (4xx/5xx)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Network Error') || errorMessage.includes('timeout')) {
            // Для сетевых ошибок продолжаем polling
            return;
          }
          
          setIsMigrating(false);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    };

    // Первая проверка сразу
    checkStatus();
    
    // Затем каждые 1 секунду для более частых обновлений, но только если isMigrating еще true
    intervalId = setInterval(() => {
      if (isMounted && isMigrating) {
        checkStatus();
      } else if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 1000); // Уменьшено с 2000 до 1000 мс для более частых обновлений

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [isMigrating, toast]);

  const handleTestConnection = async () => {
    if (!formData.alfacrmUrl || !formData.email || !formData.apiKey) {
      toast({
        title: 'Заполните все поля',
        description: 'Для проверки соединения необходимо заполнить все поля',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTested(null);

    try {
      const result = await migrationAPI.testConnection(formData);
      setConnectionTested(result.success);
      
      if (result.success) {
        toast({
          title: 'Соединение установлено',
          description: 'Подключение к AlfaCRM успешно',
        });
      } else {
        toast({
          title: 'Ошибка подключения',
          description: result.error || 'Не удалось подключиться к AlfaCRM',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setConnectionTested(false);
      toast({
        title: 'Ошибка подключения',
        description: error.response?.data?.error || 'Не удалось подключиться к AlfaCRM',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleStartMigration = async () => {
    if (!connectionTested) {
      toast({
        title: 'Проверьте соединение',
        description: 'Сначала проверьте подключение к AlfaCRM',
        variant: 'destructive',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationStatus(null); // Сбрасываем предыдущий статус

    try {
      const result = await migrationAPI.startMigration({
        alfacrmUrl: formData.alfacrmUrl,
        email: formData.email,
        apiKey: formData.apiKey,
        migrateRooms: true,
        migrateLessons: true,
      });
      
      setMigrationStatus(result.status);
      
      // Если миграция уже завершена (не должна, но на всякий случай)
      if (result.status.status === 'completed' || result.status.status === 'failed') {
        setIsMigrating(false);
      }
      
      toast({
        title: 'Миграция запущена',
        description: 'Процесс миграции начался. Это может занять несколько минут.',
      });
    } catch (error: any) {
      setIsMigrating(false);
      setMigrationStatus(null);
      toast({
        title: 'Ошибка запуска миграции',
        description: error.response?.data?.error || 'Не удалось запустить миграцию',
        variant: 'destructive',
      });
    }
  };

  const handleStartOldMigration = async () => {
    if (!connectionTested) {
      toast({
        title: 'Проверьте соединение',
        description: 'Сначала проверьте подключение к AlfaCRM',
        variant: 'destructive',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationStatus(null); // Сбрасываем предыдущий статус

    try {
      const result = await migrationAPI.startMigration({
        alfacrmUrl: formData.alfacrmUrl,
        email: formData.email,
        apiKey: formData.apiKey,
        migrateRooms: true,
        migrateLessons: true,
        useOldScript: true, // Флаг для использования старого скрипта
      });
      
      setMigrationStatus(result.status);
      
      // Если миграция уже завершена (не должна, но на всякий случай)
      if (result.status.status === 'completed' || result.status.status === 'failed') {
        setIsMigrating(false);
      }
      
      toast({
        title: 'Старая миграция запущена',
        description: 'Процесс миграции начался. Это может занять несколько минут.',
      });
    } catch (error: any) {
      setIsMigrating(false);
      setMigrationStatus(null);
      toast({
        title: 'Ошибка запуска миграции',
        description: error.response?.data?.error || 'Не удалось запустить миграцию',
        variant: 'destructive',
      });
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      '⚠️ ВНИМАНИЕ! Это удалит ВСЕ данные вашей компании:\n' +
      '• Всех учителей\n' +
      '• Всех студентов\n' +
      '• Все группы\n' +
      '• Все уроки\n' +
      '• Все абонементы\n' +
      '• Все транзакции\n' +
      '• Все долги\n\n' +
      'Это действие НЕОБРАТИМО!\n\n' +
      'Продолжить?'
    );

    if (!confirmed) return;

    setIsClearing(true);

    try {
      await migrationAPI.clearData();
      
      toast({
        title: 'Данные очищены',
        description: 'Все данные компании успешно удалены. Теперь можно запустить миграцию заново.',
      });
      
      // Reset migration status and stop polling
      setMigrationStatus(null);
      setIsMigrating(false);
    } catch (error: any) {
      toast({
        title: 'Ошибка очистки данных',
        description: error.response?.data?.error || 'Не удалось очистить данные',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Миграция данных из AlfaCRM</AlertTitle>
        <AlertDescription>
          Импортируйте данные из вашей системы AlfaCRM. Все данные будут добавлены в вашу компанию.
          Вам понадобится URL вашей AlfaCRM, email и API ключ.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Параметры подключения AlfaCRM</CardTitle>
          <CardDescription>
            Введите данные для подключения к вашей системе AlfaCRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="alfacrmUrl">URL AlfaCRM *</Label>
            <Input
              id="alfacrmUrl"
              placeholder="https://yourcompany.s20.online"
              value={formData.alfacrmUrl}
              onChange={(e) => setFormData({ ...formData, alfacrmUrl: e.target.value })}
              disabled={isMigrating}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Адрес вашей системы AlfaCRM (например: https://yourcompany.s20.online)
            </p>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isMigrating}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Email администратора AlfaCRM
            </p>
          </div>

          <div>
            <Label htmlFor="apiKey">API Ключ *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              disabled={isMigrating}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              API ключ из настроек AlfaCRM (Настройки → API → Ключ)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection || isMigrating}
              className="flex-1"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : connectionTested === true ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  Соединение установлено
                </>
              ) : connectionTested === false ? (
                <>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Ошибка подключения
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Проверить соединение
                </>
              )}
            </Button>

            <Button
              onClick={handleStartMigration}
              disabled={!connectionTested || isMigrating || isClearing}
              className="flex-1"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Миграция...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Запустить миграцию
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleStartOldMigration}
              disabled={!connectionTested || isMigrating || isClearing}
              variant="outline"
              className="w-full"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Миграция...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Запустить старую миграцию (с филиалами)
                </>
              )}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Использует проверенный старый скрипт миграции с поддержкой филиалов
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={isMigrating || isClearing}
              className="w-full"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Очистка данных...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Очистить все данные перед миграцией
                </>
              )}
            </Button>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              ⚠️ Удалит все данные компании (учителей, студентов, группы, уроки и т.д.)
            </p>
          </div>
        </CardContent>
      </Card>

      {migrationStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Прогресс миграции</CardTitle>
            <CardDescription>{migrationStatus.currentStep}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Прогресс</span>
                <span className="font-medium">{migrationStatus.progress}%</span>
              </div>
              <Progress value={migrationStatus.progress} />
            </div>

            {migrationStatus.status === 'completed' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Миграция завершена!</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <p>• Учителей: {migrationStatus.teachersCount}</p>
                    <p>• Студентов: {migrationStatus.studentsCount}</p>
                    <p>• Групп: {migrationStatus.groupsCount}</p>
                    <p>• Аудиторий: {migrationStatus.roomsCount}</p>
                    <p>• Уроков: {migrationStatus.lessonsCount}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {migrationStatus.status === 'failed' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Ошибка миграции</AlertTitle>
                <AlertDescription>{migrationStatus.error}</AlertDescription>
              </Alert>
            )}

            {migrationStatus.logs && (
              <div className="mt-4">
                <details className="group">
                  <summary className="cursor-pointer font-medium text-sm hover:underline">
                    📋 Показать детальные логи миграции
                  </summary>
                  <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-md overflow-auto max-h-96">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {migrationStatus.logs}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Важно!</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Миграция может занять несколько минут в зависимости от объема данных</li>
            <li>Не закрывайте страницу во время миграции</li>
            <li>Повторная миграция обновит существующие данные</li>
            <li>Все импортированные данные будут привязаны к вашей компании</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

