import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  action: string;
  table_name: string;
  created_at: string;
  user_email: string;
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const fetchAuditLog = async () => {
    try {
      // Fetch recent equipment changes
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select(`
          id,
          name,
          created_at,
          updated_at,
          created_by,
          updated_by,
          profiles:created_by(email)
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      // Fetch recent tracking changes
      const { data: trackingData } = await supabase
        .from('tracking')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          created_by,
          updated_by,
          profiles:created_by(email),
          equipment:equipment_id(name)
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      // Combine and format entries
      const combined: AuditEntry[] = [
        ...(equipmentData || []).map(e => ({
          id: e.id,
          action: 'Equipamento modificado: ' + e.name,
          table_name: 'equipment',
          created_at: e.updated_at || e.created_at,
          user_email: (e.profiles as any)?.email || 'Sistema'
        })),
        ...(trackingData || []).map(t => ({
          id: t.id,
          action: `Movimentação registrada: ${(t.equipment as any)?.name} - ${t.status}`,
          table_name: 'tracking',
          created_at: t.updated_at || t.created_at,
          user_email: (t.profiles as any)?.email || 'Sistema'
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEntries(combined.slice(0, 20));
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Registro de Atividades (Apenas Administradores)</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="text-xs border-b pb-2">
                <div className="font-medium">{entry.action}</div>
                <div className="text-muted-foreground">
                  Por: {entry.user_email} • {' '}
                  {formatDistanceToNow(new Date(entry.created_at), { 
                    addSuffix: true,
                    locale: ptBR 
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
