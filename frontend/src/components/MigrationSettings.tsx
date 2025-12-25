import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Database, CheckCircle2, XCircle, AlertCircle, Trash2, Clock, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const migrationStartTimeRef = useRef<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00');

  // Автоматическое восстановление статуса миграции при загрузке страницы
  useEffect(() => {
    const checkActiveMigration = async () => {
      try {
        const status = await migrationAPI.getStatus();
        if (status.status === 'running') {
          setIsMigrating(true);
          setMigrationStatus(status);
          migrationStartTimeRef.current = new Date(status.startedAt);
          toast({
            title: 'Миграция восстановлена',
            description: 'Обнаружена активная миграция. Прогресс будет обновляться автоматически.',
          });
        }
      } catch (error) {
        // Игнорируем ошибки при проверке статуса
        console.log('No active migration found');
      }
    };

    checkActiveMigration();
  }, [toast]);

  // Предупреждение при попытке закрыть страницу во время миграции
  useEffect(() => {
    if (!isMigrating) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Миграция данных все еще выполняется. Вы уверены, что хотите закрыть страницу?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isMigrating]);

  // Таймер прошедшего времени миграции
  useEffect(() => {
    if (!isMigrating || !migrationStartTimeRef.current) {
      setElapsedTime('00:00');
      return;
    }

    const updateElapsedTime = () => {
      const now = new Date();
      const start = migrationStartTimeRef.current!;
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateElapsedTime();
    const timerInterval = setInterval(updateElapsedTime, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [isMigrating]);

  // Обновление заголовка страницы с прогрессом миграции
  useEffect(() => {
    if (isMigrating && migrationStatus) {
      const originalTitle = document.title;
      document.title = `[${migrationStatus.progress}%] Миграция... - ${originalTitle.split(' - ').pop() || 'Classmate Central'}`;
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isMigrating, migrationStatus]);

  // Проверка статуса миграции
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
          migrationStartTimeRef.current = null;
          
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          
          // Восстанавливаем заголовок страницы
          const titleParts = document.title.split(' - ');
          if (titleParts.length > 1) {
            document.title = titleParts[titleParts.length - 1];
          }
          
          if (status.status === 'completed') {
            toast({
              title: '🎉 Миграция завершена!',
              description: `Импортировано: ${status.teachersCount} учителей, ${status.studentsCount} студентов, ${status.groupsCount} групп`,
              duration: 10000,
            });
          } else {
            toast({
              title: 'Ошибка миграции',
              description: status.error || 'Произошла ошибка при миграции',
              variant: 'destructive',
              duration: 10000,
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
          migrationStartTimeRef.current = null;
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
    }, 1000);

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
    migrationStartTimeRef.current = new Date();

    try {
      const result = await migrationAPI.startMigration({
        alfacrmUrl: formData.alfacrmUrl,
        email: formData.email,
        apiKey: formData.apiKey,
        migrateRooms: true,
        migrateLessons: true,
        useOldScript: true, // Используем старый скрипт миграции
      });
      
      setMigrationStatus(result.status);
      if (result.status.startedAt) {
        migrationStartTimeRef.current = new Date(result.status.startedAt);
      }
      
      // Если миграция уже завершена (не должна, но на всякий случай)
      if (result.status.status === 'completed' || result.status.status === 'failed') {
        setIsMigrating(false);
        migrationStartTimeRef.current = null;
      }
      
      toast({
        title: 'Миграция запущена',
        description: 'Процесс миграции начался. Вы можете переключиться на другую вкладку - прогресс сохранится.',
        duration: 5000,
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
      setIsClearDialogOpen(false);
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
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              API ключ из настроек AlfaCRM (Настройки → API → Ключ)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection || isMigrating}
              className="w-full sm:flex-1"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверка...
                </>
              ) : connectionTested === true ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  <span className="hidden sm:inline">Соединение установлено</span>
                  <span className="sm:hidden">Соединение ОК</span>
                </>
              ) : connectionTested === false ? (
                <>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  <span className="hidden sm:inline">Ошибка подключения</span>
                  <span className="sm:hidden">Ошибка</span>
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Проверить соединение</span>
                  <span className="sm:hidden">Проверить</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleStartMigration}
              disabled={!connectionTested || isMigrating || isClearing}
              className="w-full sm:flex-1"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Миграция...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Запуск миграции
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => setIsClearDialogOpen(true)}
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
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {migrationStatus.status === 'running' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {migrationStatus.status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {migrationStatus.status === 'failed' && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  Прогресс миграции
                </CardTitle>
                <CardDescription className="mt-1">{migrationStatus.currentStep}</CardDescription>
              </div>
              {migrationStatus.status === 'running' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{elapsedTime}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Прогресс</span>
                <span className="font-bold text-primary">{migrationStatus.progress}%</span>
              </div>
              <Progress value={migrationStatus.progress} className="h-3" />
            </div>

            {migrationStatus.status === 'running' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Миграция выполняется</AlertTitle>
                <AlertDescription className="text-sm">
                  <p className="mt-1">
                    Процесс может занять 10-20 минут в зависимости от объема данных.
                    Вы можете переключиться на другую вкладку - прогресс будет сохранен.
                  </p>
                  <p className="mt-2 font-medium">
                    ⚠️ Не закрывайте эту страницу до завершения миграции!
                  </p>
                </AlertDescription>
              </Alert>
            )}

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

      {!isMigrating && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Важно!</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Миграция может занять 10-20 минут в зависимости от объема данных</li>
              <li>Не закрывайте страницу во время миграции - вы получите предупреждение при попытке закрыть</li>
              <li>Если вы случайно закрыли страницу - просто вернитесь, миграция продолжится автоматически</li>
              <li>Повторная миграция обновит существующие данные</li>
              <li>Все импортированные данные будут привязаны к вашей компании</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Внимание! Необратимое действие
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <p className="mb-4 font-medium text-foreground">
                Это действие удалит <span className="text-destructive font-semibold">ВСЕ данные</span> вашей компании:
              </p>
              <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                <li>Всех учителей</li>
                <li>Всех студентов</li>
                <li>Все группы</li>
                <li>Все уроки</li>
                <li>Все абонементы</li>
                <li>Все транзакции</li>
                <li>Все долги</li>
              </ul>
              <p className="mt-4 font-semibold text-foreground">
                Это действие <span className="text-destructive">НЕОБРАТИМО</span>!
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Вы уверены, что хотите продолжить?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isClearing} className="w-full sm:w-auto">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isClearing}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Очистка...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Да, удалить все данные
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

