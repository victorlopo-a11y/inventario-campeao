import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import StatusCard from "@/components/StatusCard";
import StatusDistributionChart from "@/components/StatusDistributionChart";
import { EquipmentHistoryDialog } from "@/components/EquipmentHistoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, FileDown, QrCode, Edit, History, Undo2 } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  serial_number: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface Sector {
  id: string;
  name: string;
}

interface TrackingRecord {
  id: string;
  equipment_id: string;
  status: string;
  quantity: number;
  entry_type: string | null;
  location_id: string | null;
  sector_id: string | null;
  responsible_person: string | null;
  delivered_by: string | null;
  received_by: string | null;
  created_at: string;
  equipment: { name: string; serial_number: string | null; image_url: string | null };
  locations: { name: string } | null;
  sectors: { name: string } | null;
}

const Tracking = () => {
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState("saida");
  const [quantity, setQuantity] = useState("1");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [responsible, setResponsible] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedHistoryEquipment, setSelectedHistoryEquipment] = useState<{ id: string; name: string } | null>(null);

  // Edit state
  const [editingRecord, setEditingRecord] = useState<TrackingRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editResponsible, setEditResponsible] = useState("");
  const [editDeliveredBy, setEditDeliveredBy] = useState("");
  const [editReceivedBy, setEditReceivedBy] = useState("");

  // Dar Baixa state
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);
  const [baixaRecord, setBaixaRecord] = useState<TrackingRecord | null>(null);
  const [baixaCondition, setBaixaCondition] = useState("bom");
  const [baixaResponsible, setBaixaResponsible] = useState("");
  const [baixaNotes, setBaixaNotes] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    fetchData();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setCurrentUserEmail(user.email);
    }
  };

  const fetchData = async () => {
    const [equipRes, locRes, secRes, trackRes] = await Promise.all([
      supabase.from("equipment").select("*"),
      supabase.from("locations").select("*"),
      supabase.from("sectors").select("*"),
      supabase.from("tracking").select(`
        *,
        equipment:equipment_id(name, serial_number, image_url),
        locations:location_id(name),
        sectors:sector_id(name)
      `).order("created_at", { ascending: false }),
    ]);

    if (equipRes.data) setEquipment(equipRes.data);
    if (locRes.data) setLocations(locRes.data);
    if (secRes.data) setSectors(secRes.data);
    if (trackRes.data) setTrackingRecords(trackRes.data as any);
  };

  const handleSave = async () => {
    if (!selectedEquipment) {
      toast({ title: "Erro", description: "Selecione um equipamento", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("tracking").insert({
      equipment_id: selectedEquipment,
      status,
      quantity: parseInt(quantity),
      location_id: selectedLocation || null,
      sector_id: selectedSector || null,
      responsible_person: responsible || null,
      delivered_by: deliveredBy || null,
      received_by: receivedBy || null,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Rastreamento salvo!" });
      handleClear();
      fetchData();
    }
  };

  const handleClear = () => {
    setSelectedEquipment("");
    setSerialNumber("");
    setStatus("saida");
    setQuantity("1");
    setSelectedLocation("");
    setSelectedSector("");
    setResponsible("");
    setDeliveredBy("");
    setReceivedBy("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tracking").delete().eq("id", id);
    
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Registro excluído!" });
      fetchData();
    }
  };

  const handleShowHistory = (equipmentId: string, equipmentName: string) => {
    setSelectedHistoryEquipment({ id: equipmentId, name: equipmentName });
    setHistoryDialogOpen(true);
  };

  // Edit functions
  const handleEdit = (record: TrackingRecord) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditQuantity(record.quantity.toString());
    setEditLocation(record.location_id || "");
    setEditSector(record.sector_id || "");
    setEditResponsible(record.responsible_person || "");
    setEditDeliveredBy(record.delivered_by || "");
    setEditReceivedBy(record.received_by || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const { error } = await supabase.from("tracking").update({
      status: editStatus,
      quantity: parseInt(editQuantity),
      location_id: editLocation || null,
      sector_id: editSector || null,
      responsible_person: editResponsible || null,
      delivered_by: editDeliveredBy || null,
      received_by: editReceivedBy || null,
    }).eq("id", editingRecord.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Registro atualizado!" });
      setEditDialogOpen(false);
      setEditingRecord(null);
      fetchData();
    }
  };

  // Dar Baixa functions
  const handleOpenBaixa = (record: TrackingRecord) => {
    setBaixaRecord(record);
    setBaixaCondition("bom");
    setBaixaResponsible(currentUserEmail);
    setBaixaNotes("");
    setBaixaDialogOpen(true);
  };

  const handleConfirmBaixa = async () => {
    if (!baixaRecord) return;

    const now = new Date();
    const formattedDate = now.toLocaleString("pt-BR");

    // Create a new tracking record for the return
    const { error: trackingError } = await supabase.from("tracking").insert({
      equipment_id: baixaRecord.equipment_id,
      status: baixaCondition === "bom" ? "devolucao" : "danificado",
      quantity: baixaRecord.quantity,
      location_id: null,
      sector_id: null,
      responsible_person: baixaResponsible,
      delivered_by: baixaResponsible,
      received_by: "Sala de Setup",
      notes: `Baixa realizada em ${formattedDate}. Condição: ${baixaCondition === "bom" ? "Bom estado" : "Danificado"}. ${baixaNotes ? `Observações: ${baixaNotes}` : ""}`,
    });

    if (trackingError) {
      toast({ title: "Erro", description: trackingError.message, variant: "destructive" });
      return;
    }

    // Update equipment quantity in inventory if in good condition
    if (baixaCondition === "bom") {
      const { data: equipData } = await supabase
        .from("equipment")
        .select("available_quantity")
        .eq("id", baixaRecord.equipment_id)
        .single();

      if (equipData) {
        const newQuantity = equipData.available_quantity + baixaRecord.quantity;
        await supabase
          .from("equipment")
          .update({ available_quantity: newQuantity })
          .eq("id", baixaRecord.equipment_id);
      }
    }

    toast({ 
      title: "Sucesso", 
      description: `Baixa realizada! Equipamento ${baixaCondition === "bom" ? "devolvido ao inventário" : "marcado como danificado"}.` 
    });
    setBaixaDialogOpen(false);
    setBaixaRecord(null);
    fetchData();
  };

  const handleExportCSV = () => {
    const headers = ["Data/Hora", "Equipamento", "Nº Série", "Status", "Quantidade", "Localização", "Setor", "Responsável", "Quem Entregou", "Quem Recebeu"];
    const rows = filteredRecords.map(r => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      r.equipment.name,
      r.equipment.serial_number || "",
      r.status,
      r.quantity,
      r.locations?.name || "",
      r.sectors?.name || "",
      r.responsible_person || "",
      r.delivered_by || "",
      r.received_by || "",
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rastreamento.csv";
    a.click();
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

  const statusCounts = {
    saida: trackingRecords.filter(r => r.status === "saida").length,
    manutencao: trackingRecords.filter(r => r.status === "manutencao").length,
    danificado: trackingRecords.filter(r => r.status === "danificado").length,
    devolucao: trackingRecords.filter(r => r.status === "devolucao").length,
  };

  const filteredRecords = trackingRecords.filter(record => {
    const matchesSearch = record.equipment.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-center">Rastreamento de Periféricos - Setup</h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <StatusCard label="Saída" count={statusCounts.saida} variant="default" />
          <StatusCard label="Em manutenção" count={statusCounts.manutencao} variant="warning" />
          <StatusCard label="Danificado" count={statusCounts.danificado} variant="danger" />
          <StatusCard label="Devolução" count={statusCounts.devolucao} variant="success" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Equipamento</Label>
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um equipamento" />
              </SelectTrigger>
              <SelectContent>
                {equipment.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nº de Série</Label>
            <div className="flex gap-2">
              <Input
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="Nº de Série"
              />
              <Button variant="outline" size="icon">
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="manutencao">Em Manutenção</SelectItem>
                <SelectItem value="danificado">Danificado</SelectItem>
                <SelectItem value="devolucao">Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma localização" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Setor</Label>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input
              value={responsible}
              onChange={e => setResponsible(e.target.value)}
              placeholder="Responsável"
            />
          </div>

          <div className="space-y-2">
            <Label>Quem Entregou</Label>
            <Input
              value={deliveredBy}
              onChange={e => setDeliveredBy(e.target.value)}
              placeholder="Quem Entregou"
            />
          </div>

          <div className="space-y-2">
            <Label>Quem Recebeu</Label>
            <Input
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
              placeholder="Quem Recebeu"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={handleSave} className="w-full py-6 text-base">
            <Save className="mr-2 h-5 w-5" />
            Salvar
          </Button>
          <Button onClick={handleClear} variant="secondary" className="w-full py-6 text-base">
            <Trash2 className="mr-2 h-5 w-5" />
            Limpar
          </Button>
          <Button onClick={handleExportCSV} variant="secondary" className="w-full py-6 text-base">
            <FileDown className="mr-2 h-5 w-5" />
            Exportar CSV
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <Input
            placeholder="🔍 Buscar geral..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="manutencao">Em Manutenção</SelectItem>
              <SelectItem value="danificado">Danificado</SelectItem>
              <SelectItem value="devolucao">Devolução</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Records Table */}
        <div className="bg-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#2c5282] text-white">
                  <th className="border border-[#4a5568] p-3 text-left">Imagem</th>
                  <th className="border border-[#4a5568] p-3 text-left">Data/Hora</th>
                  <th className="border border-[#4a5568] p-3 text-left">Nome</th>
                  <th className="border border-[#4a5568] p-3 text-left">Nº de Série</th>
                  <th className="border border-[#4a5568] p-3 text-left">Status</th>
                  <th className="border border-[#4a5568] p-3 text-left">Quantidade</th>
                  <th className="border border-[#4a5568] p-3 text-left">Localização</th>
                  <th className="border border-[#4a5568] p-3 text-left">Setor</th>
                  <th className="border border-[#4a5568] p-3 text-left">Responsável</th>
                  <th className="border border-[#4a5568] p-3 text-left">Quem Entregou</th>
                  <th className="border border-[#4a5568] p-3 text-left">Quem Recebeu</th>
                  <th className="border border-[#4a5568] p-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50">
                      <td className="border border-border p-3">
                        {record.equipment.image_url ? (
                          <img src={record.equipment.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
                            -
                          </div>
                        )}
                      </td>
                      <td className="border border-border p-3 whitespace-nowrap">{formatDate(record.created_at)}</td>
                      <td className="border border-border p-3">{record.equipment.name}</td>
                      <td className="border border-border p-3">{record.equipment.serial_number || "-"}</td>
                      <td className="border border-border p-3">
                        <span className={`inline-block px-2 py-1 rounded text-sm ${
                          record.status === "saida" ? "bg-blue-500 text-white" :
                          record.status === "manutencao" ? "bg-amber-600 text-white" :
                          record.status === "danificado" ? "bg-red-500 text-white" :
                          "bg-yellow-500 text-white"
                        }`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="border border-border p-3">{record.quantity}</td>
                      <td className="border border-border p-3">{record.locations?.name || "-"}</td>
                      <td className="border border-border p-3">{record.sectors?.name || "-"}</td>
                      <td className="border border-border p-3">{record.responsible_person || "-"}</td>
                      <td className="border border-border p-3">{record.delivered_by || "-"}</td>
                      <td className="border border-border p-3">{record.received_by || "-"}</td>
                      <td className="border border-border p-3">
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="w-full"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="w-full"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                          {(record.status === "saida" || record.status === "manutencao") && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full bg-green-600 hover:bg-green-700 text-white border-green-600"
                              onClick={() => handleOpenBaixa(record)}
                            >
                              <Undo2 className="h-3 w-3 mr-1" />
                              Dar Baixa
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="w-full"
                            onClick={() => handleShowHistory(record.equipment_id, record.equipment.name)}
                          >
                            <History className="h-3 w-3 mr-1" />
                            Histórico
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Distribution Chart */}
        <StatusDistributionChart 
          saida={statusCounts.saida} 
          manutencao={statusCounts.manutencao} 
          danificado={statusCounts.danificado} 
          devolucao={statusCounts.devolucao} 
        />
      </div>

      {/* Equipment History Dialog */}
      {selectedHistoryEquipment && (
        <EquipmentHistoryDialog
          equipmentId={selectedHistoryEquipment.id}
          equipmentName={selectedHistoryEquipment.name}
          open={historyDialogOpen}
          onClose={() => {
            setHistoryDialogOpen(false);
            setSelectedHistoryEquipment(null);
          }}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="danificado">Danificado</SelectItem>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={editQuantity}
                onChange={e => setEditQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Select value={editLocation} onValueChange={setEditLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma localização" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={editSector} onValueChange={setEditSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                value={editResponsible}
                onChange={e => setEditResponsible(e.target.value)}
                placeholder="Responsável"
              />
            </div>
            <div className="space-y-2">
              <Label>Quem Entregou</Label>
              <Input
                value={editDeliveredBy}
                onChange={e => setEditDeliveredBy(e.target.value)}
                placeholder="Quem Entregou"
              />
            </div>
            <div className="space-y-2">
              <Label>Quem Recebeu</Label>
              <Input
                value={editReceivedBy}
                onChange={e => setEditReceivedBy(e.target.value)}
                placeholder="Quem Recebeu"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dar Baixa Dialog */}
      <Dialog open={baixaDialogOpen} onOpenChange={setBaixaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar Baixa no Equipamento</DialogTitle>
          </DialogHeader>
          {baixaRecord && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{baixaRecord.equipment.name}</p>
                <p className="text-sm text-muted-foreground">
                  Nº Série: {baixaRecord.equipment.serial_number || "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Quantidade: {baixaRecord.quantity}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Responsável pela Baixa</Label>
                <Input
                  value={baixaResponsible}
                  onChange={e => setBaixaResponsible(e.target.value)}
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2">
                <Label>Condição do Equipamento</Label>
                <Select value={baixaCondition} onValueChange={setBaixaCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bom">Bom Estado</SelectItem>
                    <SelectItem value="danificado">Danificado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input
                  value={baixaNotes}
                  onChange={e => setBaixaNotes(e.target.value)}
                  placeholder="Observações adicionais"
                />
              </div>

              <div className="bg-muted/50 p-3 rounded text-sm">
                <p><strong>Data/Hora:</strong> {new Date().toLocaleString("pt-BR")}</p>
                <p><strong>Usuário:</strong> {currentUserEmail}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmBaixa} className="bg-green-600 hover:bg-green-700">
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Tracking;
