import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Clock, User, FileEdit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface EquipmentHistoryDialogProps {
  equipmentId: string | null;
  equipmentName: string;
  open?: boolean;
  onClose?: () => void;
}

interface HistoryRecord {
  id: string;
  action: string;
  changes: any;
  created_at: string;
  changed_by: string | null;
  profiles?: { email: string } | null;
}

export function EquipmentHistoryDialog({ equipmentId, equipmentName, open: externalOpen, onClose }: EquipmentHistoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Se externalOpen é fornecido, usar ele; caso contrário, usar internalOpen
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = onClose ? (value: boolean) => { if (!value) onClose(); } : setInternalOpen;
  
  const isControlled = externalOpen !== undefined;

  // Buscar histórico de mudanças
  const { data: changeHistory, isLoading: loadingChanges } = useQuery({
    queryKey: ["equipment-change-history", equipmentId],
    queryFn: async () => {
      if (!equipmentId) return [];
      
      const { data, error } = await supabase
        .from("equipment_history")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false});

      if (error) throw error;

      // Buscar emails dos usuários
      const enrichedData = await Promise.all(
        (data || []).map(async (record) => {
          if (record.changed_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", record.changed_by)
              .single();
            
            return {
              ...record,
              profiles: profile
            };
          }
          return { ...record, profiles: null };
        })
      );

      return enrichedData as HistoryRecord[];
    },
    enabled: isOpen && !!equipmentId,
  });

  // Buscar histórico de rastreamento
  const { data: trackingHistory, isLoading: loadingTracking } = useQuery({
    queryKey: ["equipment-tracking-history", equipmentId],
    queryFn: async () => {
      if (!equipmentId) return [];
      
      const { data, error } = await supabase
        .from("tracking")
        .select(`
          *,
          equipment:equipment_id(name),
          location:location_id(name),
          sector:sector_id(name)
        `)
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!equipmentId,
  });

  const renderChangeValue = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if ('old' in value && 'new' in value) {
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-destructive line-through">Anterior: {String(value.old || '-')}</span>
            </div>
            <div className="text-sm">
              <span className="text-green-600 font-medium">Novo: {String(value.new || '-')}</span>
            </div>
          </div>
        );
      }
      return String(value);
    }
    return String(value || '-');
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <Badge variant="default">Criado</Badge>;
      case 'updated':
        return <Badge variant="secondary">Atualizado</Badge>;
      case 'deleted':
        return <Badge variant="destructive">Excluído</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      name: 'Nome',
      serial_number: 'Nº de Série',
      category_id: 'Categoria',
      available_quantity: 'Quantidade Disponível',
      description: 'Descrição'
    };
    return fieldNames[field] || field;
  };

  const isLoading = loadingChanges || loadingTracking;

  // Componente Dialog interno
  const dialogContent = (
    <DialogContent className="max-w-4xl max-h-[85vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico Completo: {equipmentName}
        </DialogTitle>
      </DialogHeader>
      
      <ScrollArea className="h-[65vh] pr-4">
        {isLoading ? (
          <div className="text-center py-8">Carregando histórico...</div>
        ) : (
          <div className="space-y-6">
            {/* Histórico de Mudanças */}
            {changeHistory && changeHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileEdit className="h-5 w-5" />
                  Histórico de Alterações
                </h3>
                <div className="space-y-3">
                  {changeHistory.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        {getActionBadge(record.action)}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(record.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      
                      {record.profiles?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Por:</span>
                          <span className="font-medium">{record.profiles.email}</span>
                        </div>
                      )}

                      {record.changes && Object.keys(record.changes).length > 0 && (
                        <div className="space-y-2 bg-muted/50 p-3 rounded">
                          {Object.entries(record.changes).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                              <div className="font-medium text-sm">{formatFieldName(key)}:</div>
                              {renderChangeValue(key, value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {changeHistory && changeHistory.length > 0 && trackingHistory && trackingHistory.length > 0 && (
              <Separator />
            )}

            {/* Histórico de Rastreamento */}
            {trackingHistory && trackingHistory.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Movimentações
                </h3>
                <div className="space-y-3">
                  {trackingHistory.map((record: any) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          record.status === "Em operação" ? "default" :
                          record.status === "Em manutenção" ? "secondary" :
                          record.status === "Disponível" ? "outline" : "destructive"
                        }>
                          {record.status}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(record.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Localização:</span>{" "}
                          {record.location?.name || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Setor:</span>{" "}
                          {record.sector?.name || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Quantidade:</span>{" "}
                          {record.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span>{" "}
                          {record.entry_type || "-"}
                        </div>
                      </div>
                      {record.responsible_person && (
                        <div className="text-sm">
                          <span className="font-medium">Responsável:</span>{" "}
                          {record.responsible_person}
                        </div>
                      )}
                      {record.notes && (
                        <div className="text-sm bg-muted p-2 rounded">
                          <span className="font-medium">Observações:</span>{" "}
                          {record.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!changeHistory?.length && !trackingHistory?.length && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum histórico encontrado
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </DialogContent>
  );

  // Se for controlado, não usar DialogTrigger
  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Se não for controlado, usar DialogTrigger
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Histórico Completo
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
