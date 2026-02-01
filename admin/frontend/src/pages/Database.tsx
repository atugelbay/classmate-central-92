import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { databaseApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Database as DatabaseIcon,
  Play,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Database() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10');
  const limit = 50;

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['database', 'tables'],
    queryFn: databaseApi.getTables,
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['database', 'table', selectedTable, page],
    queryFn: () => databaseApi.getTableData(selectedTable!, page, limit),
    enabled: !!selectedTable,
  });

  const queryMutation = useMutation({
    mutationFn: (sql: string) => databaseApi.executeQuery(sql),
    onError: (error: Error) => {
      toast.error(error.message || 'Query failed');
    },
  });

  const handleRunQuery = () => {
    if (!sqlQuery.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }
    queryMutation.mutate(sqlQuery);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!selectedTable) return;

    try {
      const data = await databaseApi.exportTable(selectedTable, format);
      
      const blob = format === 'csv' 
        ? new Blob([data], { type: 'text/csv' })
        : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedTable}.${format}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const tables = tablesData?.data || [];
  const totalPages = tableData?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database</h1>
        <p className="text-muted-foreground">View and query database tables (readonly)</p>
      </div>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="query">SQL Query</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Tables List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Tables</CardTitle>
                <CardDescription>{tables.length} tables</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {tablesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {tables.map((table: { name: string; rowCount: number }) => (
                        <button
                          key={table.name}
                          onClick={() => {
                            setSelectedTable(table.name);
                            setPage(1);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedTable === table.name
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <DatabaseIcon className="h-3 w-3" />
                            {table.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {table.rowCount}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Table Data */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedTable || 'Select a table'}
                    </CardTitle>
                    {tableData && (
                      <CardDescription>
                        {tableData.total} rows total
                      </CardDescription>
                    )}
                  </div>
                  {selectedTable && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('csv')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('json')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedTable ? (
                  <p className="text-muted-foreground text-center py-8">
                    Select a table from the list to view its data
                  </p>
                ) : tableLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableData?.data?.[0] &&
                              Object.keys(tableData.data[0]).map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData?.data?.map((row: Record<string, unknown>, index: number) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value, i) => (
                                <TableCell key={i} className="max-w-xs truncate">
                                  {value === null
                                    ? <span className="text-muted-foreground">null</span>
                                    : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="query">
          <Card>
            <CardHeader>
              <CardTitle>SQL Query</CardTitle>
              <CardDescription>
                Execute readonly SELECT queries. Other operations are not allowed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM users LIMIT 10"
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleRunQuery()}
                />
                <Button onClick={handleRunQuery} disabled={queryMutation.isPending}>
                  {queryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </>
                  )}
                </Button>
              </div>

              {queryMutation.data && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">{queryMutation.data.data.rowCount} rows</Badge>
                    <span>Fields: {queryMutation.data.data.fields.join(', ')}</span>
                  </div>
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {queryMutation.data.data.fields.map((field: string) => (
                            <TableHead key={field}>{field}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryMutation.data.data.rows.map((row: Record<string, unknown>, index: number) => (
                          <TableRow key={index}>
                            {queryMutation.data.data.fields.map((field: string) => (
                              <TableCell key={field} className="max-w-xs truncate">
                                {row[field] === null
                                  ? <span className="text-muted-foreground">null</span>
                                  : typeof row[field] === 'object'
                                  ? JSON.stringify(row[field])
                                  : String(row[field])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
