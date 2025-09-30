import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface HistoryRecord {
  id: string;
  status: string;
  quantity: number;
  created_at: string;
  locations: { name: string } | null;
  sectors: { name: string } | null;
  responsible_person: string | null;
}

interface EquipmentHistoryDialogProps {
  equipmentId: string | null;
  equipmentName: string;
  open: boolean;
  onClose: () => void;
}

const EquipmentHistoryDialog = ({ equipmentId, equipmentName, open, onClose }: EquipmentHistoryDialogProps) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (equipmentId && open) {
      fetchHistory();
    }
  }, [equipmentId, open]);

  const fetchHistory = async () => {
    if (!equipmentId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("tracking")
      .select(`
        id,
        status,
        quantity,
        created_at,
        responsible_person,
        locations:location_id(name),
        sectors:sector_id(name)
      `)
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data as any);
    }
    setLoading(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      saida: "Saída",
      manutencao: "Em manutenção",
      danificado: "Danificado",
      devolucao: "Devolução",
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Histórico de Movimentações - {equipmentName}</DialogTitle>
            <Button variant="destructive" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Fechar
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum histórico encontrado para este equipamento
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="border border-border p-3 text-left">Data/Hora</th>
                  <th className="border border-border p-3 text-left">Status</th>
                  <th className="border border-border p-3 text-left">Quantidade</th>
                  <th className="border border-border p-3 text-left">Localização</th>
                  <th className="border border-border p-3 text-left">Setor</th>
                  <th className="border border-border p-3 text-left">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/50">
                    <td className="border border-border p-3">{formatDate(record.created_at)}</td>
                    <td className="border border-border p-3">{getStatusLabel(record.status)}</td>
                    <td className="border border-border p-3">{record.quantity}</td>
                    <td className="border border-border p-3">{record.locations?.name || "-"}</td>
                    <td className="border border-border p-3">{record.sectors?.name || "-"}</td>
                    <td className="border border-border p-3">{record.responsible_person || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentHistoryDialog;
