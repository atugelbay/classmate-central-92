import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, companiesApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ChevronLeft, ChevronRight, Search, CheckCircle, XCircle, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type UserRow = {
  id: number;
  email: string;
  name: string;
  company_name: string;
  role_name: string;
  is_email_verified: boolean;
  created_at: string;
};

export default function Users() {
  const [page, setPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const limit = 50;
  const queryClient = useQueryClient();

  // Fetch companies for filter dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companiesApi.getAll(1, 1000),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', page, limit, emailFilter, verifiedFilter, companyFilter],
    queryFn: () =>
      usersApi.getAll({
        page,
        limit,
        email: emailFilter || undefined,
        is_verified: verifiedFilter === 'all' ? undefined : verifiedFilter === 'true',
        company_id: companyFilter === 'all' ? undefined : companyFilter,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: usersApi.getStats,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => usersApi.deleteWithAllData(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setUserToDelete(null);
      toast.success('Пользователь и все связанные данные удалены');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Не удалось удалить пользователя');
    },
  });

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const users = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const stats = statsData?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">View all users across all companies</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.unverified}</div>
              <p className="text-sm text-muted-foreground">Unverified</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.new_this_week}</div>
              <p className="text-sm text-muted-foreground">New This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.new_this_month}</div>
              <p className="text-sm text-muted-foreground">New This Month</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Total: {data?.total || 0} users</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px] flex gap-2">
              <Input
                placeholder="Search by email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companiesData?.data?.map((company: { id: string; name: string }) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
              </SelectContent>
            </Select>
            {(companyFilter !== 'all' || verifiedFilter !== 'all' || emailFilter) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setCompanyFilter('all');
                  setVerifiedFilter('all');
                  setEmailFilter('');
                  setPage(1);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>

          {/* Active filters display */}
          {(companyFilter !== 'all' || verifiedFilter !== 'all') && (
            <div className="flex gap-2 mb-4">
              {companyFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Company: {companiesData?.data?.find((c: { id: string }) => c.id === companyFilter)?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => { setCompanyFilter('all'); setPage(1); }}
                  />
                </Badge>
              )}
              {verifiedFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {verifiedFilter === 'true' ? 'Verified' : 'Unverified'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => { setVerifiedFilter('all'); setPage(1); }}
                  />
                </Badge>
              )}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: UserRow) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.company_name || '-'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role_name || '-'}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_email_verified ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-yellow-600" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setUserToDelete(user)}
                      title="Удалить пользователя и все данные"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Delete confirmation dialog */}
          <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Удалить пользователя?</DialogTitle>
                <DialogDescription>
                  Будет удалён пользователь <strong>{userToDelete?.email}</strong> и все связанные с ним данные из базы (роли, филиалы и т.д.). Это действие необратимо.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={deleteMutation.isPending}>
                  Отмена
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Удаление...</>
                  ) : (
                    'Удалить'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
        </CardContent>
      </Card>
    </div>
  );
}
