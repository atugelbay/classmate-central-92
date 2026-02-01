import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, RefreshCw, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  source?: string;
}

export default function Logs() {
  const [level, setLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['logs', level, search, limit, offset],
    queryFn: () =>
      logsApi.getAll({
        level: level === 'all' ? undefined : (level as 'info' | 'warn' | 'error'),
        search: search || undefined,
        limit,
        offset,
      }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: statsData } = useQuery({
    queryKey: ['logs', 'stats'],
    queryFn: logsApi.getStats,
    refetchInterval: 30000,
  });

  const logs = data?.data || [];
  const stats = statsData?.data;

  const getLevelIcon = (logLevel: string) => {
    switch (logLevel) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelBadge = (logLevel: string) => {
    switch (logLevel) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'warn':
        return <Badge variant="warning">WARN</Badge>;
      default:
        return <Badge variant="secondary">INFO</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground">View system logs and activity</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.byLevel.info}</div>
              <p className="text-sm text-muted-foreground">Info</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.byLevel.warn}</div>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.byLevel.error}</div>
              <p className="text-sm text-muted-foreground">Errors</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
          <CardDescription>
            Showing {logs.length} of {data?.total || 0} logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refetch()}
              />
              <Button variant="outline" onClick={() => refetch()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logs found
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {logs.map((log: LogEntry) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {getLevelIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getLevelBadge(log.level)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                        </span>
                        {log.source && (
                          <Badge variant="outline" className="text-xs">
                            {log.source}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm break-words">{log.message}</p>
                      {log.context && Object.keys(log.context).length > 0 && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Load More */}
          {logs.length < (data?.total || 0) && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => setOffset((o) => o + limit)}
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
