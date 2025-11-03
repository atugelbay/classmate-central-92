import { useState } from "react";
import * as React from "react";
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useRolePermissions,
} from "@/hooks/useData";
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Shield, Check } from "lucide-react";
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

export default function Roles() {
  const { hasPermission } = useAuth();
  const { data: roles = [], isLoading } = useRoles();
  const { data: permissions = [] } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

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

  const handleDelete = async (role: Role) => {
    if (!confirm(`Вы уверены, что хотите удалить роль "${role.name}"?`)) {
      return;
    }
    try {
      await deleteRole.mutateAsync(role.id);
    } catch (error) {
      // Error handled by mutation
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Роли и права доступа</h1>
          <p className="text-muted-foreground">
            Управление ролями и разрешениями пользователей
          </p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRole(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать роль
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
        )}
      </div>

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
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || "-"}</TableCell>
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
    </div>
  );
}

