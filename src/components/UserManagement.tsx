import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, UserCog, Eye, Trash2 } from 'lucide-react';

type UserRole = 'visualizador' | 'programador' | 'administrador';

interface Profile {
  id: string;
  email: string;
  user_roles: { role: UserRole }[];
}

export function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, user_roles(role)');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, oldRole: UserRole, newRole: UserRole) => {
    try {
      // Delete old role
      await supabase
        .from('user_roles')
        .delete()
        .match({ user_id: userId, role: oldRole });

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      toast.success('Permissão atualizada com sucesso');
      fetchProfiles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      // Delete from profiles (cascade will delete user_roles)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;

      toast.success('Usuário excluído com sucesso');
      fetchProfiles();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'administrador': return <Shield className="w-4 h-4 text-red-500" />;
      case 'programador': return <UserCog className="w-4 h-4 text-blue-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <div>Carregando usuários...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Permissão Atual</TableHead>
              <TableHead>Nova Permissão</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {profiles.map((profile) => {
              const currentRole = (profile.user_roles[0]?.role || 'visualizador') as UserRole;
              return (
                <TableRow key={profile.id}>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(currentRole)}
                      <span className="capitalize">{currentRole}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={currentRole}
                      onValueChange={(newRole: UserRole) => updateUserRole(profile.id, currentRole, newRole)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                        <SelectItem value="programador">Programador</SelectItem>
                        <SelectItem value="administrador">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser(profile.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
