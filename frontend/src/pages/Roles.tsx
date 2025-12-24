import { useState } from "react";
import * as React from "react";
import { 
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useRolePermissions,
  useInviteUser,
  useUsers,
} from "@/hooks/useData";
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Shield, Check, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/PageHeader";

// Helper function to translate role names
const translateRoleName = (name: string): string => {
  const translations: Record<string, string> = {
    admin: "Администратор",
    manager: "Менеджер",
    teacher: "Учитель",
    accountant: "Бухгалтер",
    view_only: "Только просмотр",
  };
  return translations[name.toLowerCase()] || name;
};

// Helper function to translate role descriptions
const translateRoleDescription = (name: string, description: string): string => {
  if (description) return description;
  const translations: Record<string, string> = {
    admin: "Полный доступ ко всем функциям системы",
    manager: "Доступ ко всем функциям кроме управления ролями",
    teacher: "Ограниченный доступ к ученикам и расписанию",
    accountant: "Доступ к финансовым данным",
    view_only: "Только просмотр без возможности изменений",
  };
  return translations[name.toLowerCase()] || description;
};

export default function Roles() {
  const { hasPermission } = useAuth();
  const { data: roles = [], isLoading } = useRoles();
  const { data: permissions = [] } = usePermissions();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const inviteUser = useInviteUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [inviteRoleId, setInviteRoleId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteName, setInviteName] = useState<string>("");

  const canManage = hasPermission("roles.manage");

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions?.map(p => p.id) || []);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const roleData: CreateRoleRequest | UpdateRoleRequest = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || "",
      permissionIds: selectedPermissions,
    };

    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, data: roleData });
      } else {
        await createRole.mutateAsync(roleData);
      }
      handleClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });

  const handleDelete = async (role: Role) => {
    setDeleteRoleConfirm({ open: true, role });
  };

  const confirmDeleteRole = async () => {
    if (deleteRoleConfirm.role) {
      try {
        await deleteRole.mutateAsync(deleteRoleConfirm.role.id);
        setDeleteRoleConfirm({ open: false, role: null });
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Роли и права доступа"
        description="Управление ролями и разрешениями пользователей"
        actions={
          canManage ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingRole(null)} size="sm" className="sm:size-default">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Создать роль</span>
                  <span className="sm:hidden">Создать</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? "Редактировать роль" : "Создать роль"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Название роли *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingRole?.name || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingRole?.description || ""}
                    rows={3}
                  />
                </div>
                <div className="space-y-4">
                  <Label>Разрешения</Label>
                  <div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {Object.entries(permissionsByResource).map(([resource, perms]) => (
                      <div key={resource} className="space-y-2">
                        <h4 className="font-semibold text-sm capitalize">{resource}</h4>
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {perms.map((perm) => (
                            <div key={perm.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={perm.id}
                                checked={selectedPermissions.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <Label
                                htmlFor={perm.id}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {perm.action}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                    {editingRole ? "Сохранить" : "Создать"}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Пригласить пользователя</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteRoleId) {
                  toast.error("Выберите роль");
                  return;
                }
                try {
                  await inviteUser.mutateAsync({
                    email: inviteEmail,
                    name: inviteName,
                    roleId: inviteRoleId,
                  });
                  setInviteEmail("");
                  setInviteName("");
                  setInviteRoleId("");
                } catch (err) {
                  // handled in hook
                }
              }}
            >
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input
                  required
                  placeholder="Имя пользователя"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  required
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {translateRoleName(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" disabled={inviteUser.isPending}>
                  {inviteUser.isPending ? "Отправляем..." : "Отправить приглашение"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Роли системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Разрешения</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Нет ролей
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{translateRoleName(role.name)}</TableCell>
                    <TableCell>{translateRoleDescription(role.name, role.description || "")}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.slice(0, 3).map((perm) => (
                            <Badge key={perm.id} variant="secondary" className="text-xs">
                              {perm.resource}.{perm.action}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Нет разрешений</span>
                        )}
                        {role.permissions && role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && !role.id.endsWith("_admin") && 
                       !role.id.endsWith("_manager") && 
                       !role.id.endsWith("_teacher") && 
                       !role.id.endsWith("_accountant") && 
                       !role.id.endsWith("_view_only") && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {(!canManage || 
                        role.id.endsWith("_admin") || 
                        role.id.endsWith("_manager") || 
                        role.id.endsWith("_teacher") || 
                        role.id.endsWith("_accountant") || 
                        role.id.endsWith("_view_only")) && (
                        <span className="text-xs text-muted-foreground">Системная роль</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Пользователи компании
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет пользователей</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роли</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role.id} variant="secondary" className="text-xs">
                                {translateRoleName(role.name)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Нет ролей</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isEmailVerified ? "default" : "outline"}>
                          {user.isEmailVerified ? "Подтвержден" : "Не подтвержден"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Role Confirmation Dialog */}
      <ConfirmDialog
        open={deleteRoleConfirm.open}
        onOpenChange={(open) => setDeleteRoleConfirm({ open, role: deleteRoleConfirm.role })}
        title="Удалить роль"
        description={deleteRoleConfirm.role ? `Вы уверены, что хотите удалить роль "${translateRoleName(deleteRoleConfirm.role.name)}"? Это действие нельзя отменить.` : ""}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        onConfirm={confirmDeleteRole}
      />
    </div>
  );
}

