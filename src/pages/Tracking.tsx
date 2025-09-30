import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import StatusCard from "@/components/StatusCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, FileDown, QrCode } from "lucide-react";

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
  equipment: { name: string };
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [equipRes, locRes, secRes, trackRes] = await Promise.all([
      supabase.from("equipment").select("*"),
      supabase.from("locations").select("*"),
      supabase.from("sectors").select("*"),
      supabase.from("tracking").select(`
        *,
        equipment:equipment_id(name),
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

  const handleExportCSV = () => {
    const headers = ["Equipamento", "Status", "Quantidade", "Localização", "Setor", "Data"];
    const rows = filteredRecords.map(r => [
      r.equipment.name,
      r.status,
      r.quantity,
      r.locations?.name || "",
      r.sectors?.name || "",
      new Date(r.created_at).toLocaleDateString("pt-BR"),
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rastreamento.csv";
    a.click();
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

        {/* Form */}
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

        {/* Records List */}
        <div className="bg-card rounded-lg p-4 space-y-2">
          {filteredRecords.map(record => (
            <div key={record.id} className="border-b pb-2">
              <div className="font-medium">{record.equipment.name}</div>
              <div className="text-sm text-muted-foreground">
                Status: {record.status} | Qtd: {record.quantity} | {new Date(record.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Tracking;
