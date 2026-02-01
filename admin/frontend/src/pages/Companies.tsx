import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi, databaseApi } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ChevronLeft, ChevronRight, Users, GraduationCap, BookOpen, CreditCard, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Companies() {
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailTab, setDetailTab] = useState('overview');
  const limit = 20;
  
  // Pagination for detail tabs
  const [studentsPage, setStudentsPage] = useState(1);
  const [groupsPage, setGroupsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const detailLimit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, limit],
    queryFn: () => companiesApi.getAll(page, limit),
  });

  const { data: companyDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['company', selectedCompany],
    queryFn: () => companiesApi.getById(selectedCompany!),
    enabled: !!selectedCompany,
  });

  // Fetch company users
  const { data: companyUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['company', selectedCompany, 'users'],
    queryFn: () => companiesApi.getUsers(selectedCompany!, 1, 100),
    enabled: !!selectedCompany && detailTab === 'users',
  });

  // Fetch company students via SQL query with pagination
  const { data: companyStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['company', selectedCompany, 'students', studentsPage],
    queryFn: () => databaseApi.executeQuery(`
      SELECT s.id, s.name, s.phone, s.email, s.status, s.created_at,
             (SELECT COUNT(*) FROM students WHERE company_id = '${selectedCompany}') as total_count
      FROM students s
      WHERE s.company_id = '${selectedCompany}'
      ORDER BY s.created_at DESC
      LIMIT ${detailLimit} OFFSET ${(studentsPage - 1) * detailLimit}
    `),
    enabled: !!selectedCompany && detailTab === 'students',
  });

  // Fetch company groups with pagination
  const { data: companyGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['company', selectedCompany, 'groups', groupsPage],
    queryFn: () => databaseApi.executeQuery(`
      SELECT g.id, g.name, g.subject, g.status, g.created_at,
             t.name as teacher_name,
             (SELECT COUNT(*) FROM enrollment e WHERE e.group_id = g.id) as students_count,
             (SELECT COUNT(*) FROM groups WHERE company_id = '${selectedCompany}') as total_count
      FROM groups g
      LEFT JOIN teachers t ON g.teacher_id = t.id
      WHERE g.company_id = '${selectedCompany}'
      ORDER BY g.created_at DESC
      LIMIT ${detailLimit} OFFSET ${(groupsPage - 1) * detailLimit}
    `),
    enabled: !!selectedCompany && detailTab === 'groups',
  });

  // Fetch company transactions with pagination
  const { data: companyTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['company', selectedCompany, 'transactions', transactionsPage],
    queryFn: () => databaseApi.executeQuery(`
      SELECT t.id, t.amount, t.kind, t.created_at,
             i.id as invoice_id,
             (SELECT COUNT(*) FROM transaction WHERE company_id = '${selectedCompany}') as total_count
      FROM transaction t
      LEFT JOIN invoice i ON t.invoice_id = i.id
      WHERE t.company_id = '${selectedCompany}'
      ORDER BY t.created_at DESC
      LIMIT ${detailLimit} OFFSET ${(transactionsPage - 1) * detailLimit}
    `),
    enabled: !!selectedCompany && detailTab === 'transactions',
  });

  // Filter companies by search
  const filteredCompanies = data?.data?.filter((company: { name: string }) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Companies</h1>
        <p className="text-sm lg:text-base text-muted-foreground">Manage all registered companies</p>
      </div>

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        <div className={selectedCompany ? 'lg:col-span-1 hidden lg:block' : 'lg:col-span-3'}>
          <Card>
            <CardHeader>
              <CardTitle>All Companies</CardTitle>
              <CardDescription>Total: {data?.total || 0} companies</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto -mx-4 lg:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {!selectedCompany && (
                      <>
                        <TableHead className="hidden sm:table-cell">Users</TableHead>
                        <TableHead className="hidden sm:table-cell">Students</TableHead>
                        <TableHead className="hidden md:table-cell">Created</TableHead>
                      </>
                    )}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company: {
                    id: string;
                    name: string;
                    usersCount: number;
                    studentsCount: number;
                    created_at: string;
                  }) => (
                    <TableRow
                      key={company.id}
                      className={selectedCompany === company.id ? 'bg-muted' : 'cursor-pointer hover:bg-muted/50'}
                      onClick={() => {
                        setSelectedCompany(company.id);
                        setDetailTab('overview');
                        // Reset pagination
                        setStudentsPage(1);
                        setGroupsPage(1);
                        setTransactionsPage(1);
                      }}
                    >
                      <TableCell className="font-medium text-sm">{company.name}</TableCell>
                      {!selectedCompany && (
                        <>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">{company.usersCount}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary">{company.studentsCount}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {format(new Date(company.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {selectedCompany === company.id ? (
                          <Badge>Selected</Badge>
                        ) : (
                          <Button variant="ghost" size="sm">View</Button>
                        )}
                      </TableCell>
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
            </CardContent>
          </Card>
        </div>

        {/* Company Details with Tabs */}
        {selectedCompany && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="lg:hidden shrink-0"
                    onClick={() => setSelectedCompany(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0">
                    <CardTitle className="text-lg lg:text-xl truncate">
                      {companyDetails?.data?.company?.name || 'Company Details'}
                    </CardTitle>
                    <CardDescription className="text-xs lg:text-sm truncate">
                      ID: {selectedCompany.slice(0, 8)}...
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="hidden lg:flex" onClick={() => setSelectedCompany(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
                {detailsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : companyDetails?.data ? (
                  <Tabs value={detailTab} onValueChange={setDetailTab}>
                    <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
                      <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-5">
                        <TabsTrigger value="overview" className="text-xs lg:text-sm">Overview</TabsTrigger>
                        <TabsTrigger value="users" className="text-xs lg:text-sm">Users</TabsTrigger>
                        <TabsTrigger value="students" className="text-xs lg:text-sm">Students</TabsTrigger>
                        <TabsTrigger value="groups" className="text-xs lg:text-sm">Groups</TabsTrigger>
                        <TabsTrigger value="transactions" className="text-xs lg:text-sm whitespace-nowrap">Transactions</TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                          <BookOpen className="h-4 w-4" />
                          <div>
                            <p className="text-sm text-muted-foreground">Groups</p>
                            <p className="font-semibold">{companyDetails.data.stats.groupsCount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                          <CreditCard className="h-4 w-4" />
                          <div>
                            <p className="text-sm text-muted-foreground">Transactions</p>
                            <p className="font-semibold">{companyDetails.data.stats.transactionsCount}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Teachers</span>
                          <span>{companyDetails.data.stats.teachersCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span>{format(new Date(companyDetails.data.company.created_at), 'PPP')}</span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users" className="mt-4">
                      {usersLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {companyUsers?.data?.map((user: {
                              id: number;
                              email: string;
                              name: string;
                              role_name: string;
                              created_at: string;
                            }) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.email}</TableCell>
                                <TableCell>{user.name || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{user.role_name || '-'}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    {/* Students Tab */}
                    <TabsContent value="students" className="mt-4">
                      {studentsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto -mx-4 lg:mx-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden sm:table-cell">Created</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {companyStudents?.data?.rows?.map((student: {
                                id: string;
                                name: string;
                                phone: string;
                                email: string;
                                status: string;
                                created_at: string;
                                total_count: number;
                              }) => (
                                <TableRow key={student.id}>
                                  <TableCell className="font-medium text-sm">{student.name}</TableCell>
                                  <TableCell className="text-sm">{student.phone || '-'}</TableCell>
                                  <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm">{student.email || '-'}</TableCell>
                                  <TableCell>
                                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                                      {student.status || 'active'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                    {student.created_at ? format(new Date(student.created_at), 'MMM d, yyyy') : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!companyStudents?.data?.rows || companyStudents.data.rows.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No students found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          </div>
                          {/* Pagination */}
                          {companyStudents?.data?.rows?.[0]?.total_count > detailLimit && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-muted-foreground">
                                Page {studentsPage} of {Math.ceil(companyStudents.data.rows[0].total_count / detailLimit)}
                                {' '}({companyStudents.data.rows[0].total_count} total)
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                                  disabled={studentsPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStudentsPage((p) => p + 1)}
                                  disabled={studentsPage >= Math.ceil(companyStudents.data.rows[0].total_count / detailLimit)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    {/* Groups Tab */}
                    <TabsContent value="groups" className="mt-4">
                      {groupsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Teacher</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {companyGroups?.data?.rows?.map((group: {
                                id: string;
                                name: string;
                                subject: string;
                                teacher_name: string;
                                students_count: number;
                                status: string;
                                total_count: number;
                              }) => (
                                <TableRow key={group.id}>
                                  <TableCell className="font-medium">{group.name}</TableCell>
                                  <TableCell>{group.subject || '-'}</TableCell>
                                  <TableCell>{group.teacher_name || '-'}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{group.students_count}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={group.status === 'active' ? 'default' : 'secondary'}>
                                      {group.status || 'active'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!companyGroups?.data?.rows || companyGroups.data.rows.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No groups found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          {/* Pagination */}
                          {companyGroups?.data?.rows?.[0]?.total_count > detailLimit && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-muted-foreground">
                                Page {groupsPage} of {Math.ceil(companyGroups.data.rows[0].total_count / detailLimit)}
                                {' '}({companyGroups.data.rows[0].total_count} total)
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setGroupsPage((p) => Math.max(1, p - 1))}
                                  disabled={groupsPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setGroupsPage((p) => p + 1)}
                                  disabled={groupsPage >= Math.ceil(companyGroups.data.rows[0].total_count / detailLimit)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions" className="mt-4">
                      {transactionsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {companyTransactions?.data?.rows?.map((tx: {
                                id: string;
                                amount: number;
                                kind: string;
                                invoice_id: string;
                                created_at: string;
                                total_count: number;
                              }) => (
                                <TableRow key={tx.id}>
                                  <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                                  <TableCell>
                                    <Badge variant={Number(tx.amount) >= 0 ? 'default' : 'destructive'}>
                                      {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount)?.toLocaleString()} ₸
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{tx.kind || '-'}</Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {tx.invoice_id || '-'}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {tx.created_at ? format(new Date(tx.created_at), 'MMM d, HH:mm') : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!companyTransactions?.data?.rows || companyTransactions.data.rows.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No transactions found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          {/* Pagination */}
                          {companyTransactions?.data?.rows?.[0]?.total_count > detailLimit && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-muted-foreground">
                                Page {transactionsPage} of {Math.ceil(companyTransactions.data.rows[0].total_count / detailLimit)}
                                {' '}({companyTransactions.data.rows[0].total_count} total)
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTransactionsPage((p) => Math.max(1, p - 1))}
                                  disabled={transactionsPage === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTransactionsPage((p) => p + 1)}
                                  disabled={transactionsPage >= Math.ceil(companyTransactions.data.rows[0].total_count / detailLimit)}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="text-muted-foreground">Company not found</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
