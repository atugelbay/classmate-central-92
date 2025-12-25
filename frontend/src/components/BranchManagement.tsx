import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from '@/hooks/useBranches';
import { Branch } from '@/types';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function BranchManagement() {
  const { data: branches = [], isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
  });

  const deleteConfirm = useConfirmDelete(async (id: string) => {
    try {
      await deleteBranch.mutateAsync(id);
    } catch (error) {
      // Error is handled by the mutation
    }
  });

  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '' });
    setEditingBranch(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    await createBranch.mutateAsync({
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
    });

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingBranch || !formData.name.trim()) return;

    await updateBranch.mutateAsync({
      branchId: editingBranch.id,
      data: {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
      },
    });

    resetForm();
  };

  const handleDelete = (branch: Branch) => {
    deleteConfirm.open(branch.id);
  };

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Филиалы</h3>
          <p className="text-sm text-muted-foreground">
            Управление филиалами организации
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить филиал
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новый филиал</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Основной филиал"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="ул. Примерная, 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+7 (777) 123-45-67"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name.trim()}>
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Нет филиалов
                </TableCell>
              </TableRow>
            ) : (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {branch.name}
                    </div>
                  </TableCell>
                  <TableCell>{branch.address || '—'}</TableCell>
                  <TableCell>{branch.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                      {branch.status === 'active' ? 'Активный' : 'Неактивный'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog
                        open={editingBranch?.id === branch.id}
                        onOpenChange={(open) => {
                          if (!open) resetForm();
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(branch)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактировать филиал</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Название*</Label>
                              <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-address">Адрес</Label>
                              <Input
                                id="edit-address"
                                value={formData.address}
                                onChange={(e) =>
                                  setFormData({ ...formData, address: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-phone">Телефон</Label>
                              <Input
                                id="edit-phone"
                                value={formData.phone}
                                onChange={(e) =>
                                  setFormData({ ...formData, phone: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={resetForm}>
                              Отмена
                            </Button>
                            <Button
                              onClick={handleUpdate}
                              disabled={!formData.name.trim()}
                            >
                              Сохранить
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(branch)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleteConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open) deleteConfirm.close();
        }}
        title="Удалить филиал"
        description={`Вы уверены, что хотите удалить филиал "${branches.find(b => b.id === deleteConfirm.itemId)?.name}"? Это действие необратимо. Все данные, связанные с этим филиалом, будут удалены.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        onConfirm={deleteConfirm.confirm}
      />
    </div>
  );
}

