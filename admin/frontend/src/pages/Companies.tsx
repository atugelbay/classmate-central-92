import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ChevronLeft, ChevronRight, Users, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

export default function Companies() {
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, limit],
    queryFn: () => companiesApi.getAll(page, limit),
  });

  const { data: companyDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['company', selectedCompany],
    queryFn: () => companiesApi.getById(selectedCompany!),
    enabled: !!selectedCompany,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const companies = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Companies</h1>
        <p className="text-muted-foreground">Manage all registered companies</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Companies</CardTitle>
              <CardDescription>Total: {data?.total || 0} companies</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company: {
                    id: string;
                    name: string;
                    usersCount: number;
                    studentsCount: number;
                    created_at: string;
                  }) => (
                    <TableRow
                      key={company.id}
                      className={selectedCompany === company.id ? 'bg-muted' : ''}
                    >
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company.usersCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company.studentsCount}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(company.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCompany(company.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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

        {/* Company Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCompany ? (
                <p className="text-muted-foreground text-sm">
                  Select a company to view details
                </p>
              ) : detailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : companyDetails?.data ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {companyDetails.data.company.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {companyDetails.data.company.id}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                      <Users className="h-4 w-4" />
                      <div>
                        <p className="text-sm text-muted-foreground">Users</p>
                        <p className="font-semibold">{companyDetails.data.stats.usersCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                      <GraduationCap className="h-4 w-4" />
                      <div>
                        <p className="text-sm text-muted-foreground">Students</p>
                        <p className="font-semibold">{companyDetails.data.stats.studentsCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teachers</span>
                      <span>{companyDetails.data.stats.teachersCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Groups</span>
                      <span>{companyDetails.data.stats.groupsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transactions</span>
                      <span>{companyDetails.data.stats.transactionsCount}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Created: {format(new Date(companyDetails.data.company.created_at), 'PPP')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Company not found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
