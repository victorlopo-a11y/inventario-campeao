import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'visualizador' | 'programador' | 'administrador';

export function useUserRole() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const userRoles = data?.map(r => r.role as UserRole) || [];
        setRoles(userRoles);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRoles();
  }, []);

  const hasRole = (role: UserRole) => roles.includes(role);
  const canEdit = hasRole('programador') || hasRole('administrador');
  const isAdmin = hasRole('administrador');

  return { roles, hasRole, canEdit, isAdmin, loading };
}
