import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface ErrorEntry {
  id: number;
  level: 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  source?: string;
}

export default function Errors() {
  const [search, setSearch] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['errors', search, limit, offset],
    queryFn: () =>
      logsApi.getErrors({
        search: search || undefined,
        limit,
        offset,
      }),
    refetchInterval: 30000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['logs', 'stats'],
    queryFn: logsApi.getStats,
    refetchInterval: 30000,
  });

  const errors = data?.data || [];
  const stats = statsData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Errors</h1>
          <p className="text-muted-foreground">Track and monitor system errors</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats?.byLevel.error || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {stats?.errorsLast24h || 0}
            </div>
            <p className="text-sm text-muted-foreground">Errors (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stats?.last24h || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Logs (24h)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error Log
          </CardTitle>
          <CardDescription>
            Showing {errors.length} of {data?.total || 0} errors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search errors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refetch()}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => refetch()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : errors.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Errors Found</h3>
              <p className="text-muted-foreground">Your system is running smoothly!</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {errors.map((error: ErrorEntry) => (
                  <div
                    key={error.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive">ERROR</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(error.timestamp), 'MMM d, yyyy HH:mm:ss')}
                          </span>
                          {error.source && (
                            <Badge variant="outline" className="text-xs">
                              {error.source}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{error.message}</p>
                      </div>
                      {expandedId === error.id ? (
                        <ChevronUp className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      )}
                    </button>

                    {expandedId === error.id && (
                      <div className="border-t bg-muted/30 p-4">
                        <h4 className="font-medium mb-2">Full Message</h4>
                        <p className="text-sm mb-4 whitespace-pre-wrap">{error.message}</p>
                        
                        {error.context && Object.keys(error.context).length > 0 && (
                          <>
                            <h4 className="font-medium mb-2">Context</h4>
                            <pre className="text-xs bg-card p-3 rounded border overflow-x-auto">
                              {JSON.stringify(error.context, null, 2)}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Load More */}
          {errors.length < (data?.total || 0) && (
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
