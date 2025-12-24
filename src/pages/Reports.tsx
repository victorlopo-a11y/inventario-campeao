import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Sector {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface MovementData {
  id: string;
  created_at: string;
  status: string;
  quantity: number;
  responsible_person: string | null;
  equipment: { name: string };
  sectors: { name: string } | null;
  locations: { name: string } | null;
}

interface ChartData {
  name: string;
  quantidade: number;
}

interface ResponsibleBySector {
  sector: string;
  responsible: string;
  quantidade: number;
}

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { toast } = useToast();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [movements, setMovements] = useState<MovementData[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  
  const [sectorData, setSectorData] = useState<ChartData[]>([]);
  const [locationData, setLocationData] = useState<ChartData[]>([]);
  const [statusData, setStatusData] = useState<ChartData[]>([]);
  const [topResponsibleBySector, setTopResponsibleBySector] = useState<ResponsibleBySector[]>([]);

  useEffect(() => {
    fetchSectors();
    fetchLocations();
  }, []);

  const fetchSectors = async () => {
    const { data } = await supabase.from("sectors").select("*").order("name");
    if (data) setSectors(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*").order("name");
    if (data) setLocations(data);
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tracking")
        .select(`
          id,
          created_at,
          status,
          quantity,
          responsible_person,
          equipment:equipment_id(name),
          sectors:sector_id(name),
          locations:location_id(name)
        `)
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }
      if (selectedSector !== "all") {
        query = query.eq("sector_id", selectedSector);
      }
      if (selectedLocation !== "all") {
        query = query.eq("location_id", selectedLocation);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setMovements(data);
        calculateChartData(data);
      }
    } catch (error) {
      console.error("Erro ao buscar movimentações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateChartData = (data: MovementData[]) => {
    // Agrupar por setor
    const sectorMap = new Map<string, number>();
    data.forEach((item) => {
      const sectorName = item.sectors?.name || "Sem setor";
      sectorMap.set(sectorName, (sectorMap.get(sectorName) || 0) + item.quantity);
    });
    const sectorChart: ChartData[] = Array.from(sectorMap.entries()).map(([name, quantidade]) => ({
      name,
      quantidade,
    }));
    setSectorData(sectorChart);

    // Agrupar por localização
    const locationMap = new Map<string, number>();
    data.forEach((item) => {
      const locationName = item.locations?.name || "Sem localização";
      locationMap.set(locationName, (locationMap.get(locationName) || 0) + item.quantity);
    });
    const locationChart: ChartData[] = Array.from(locationMap.entries()).map(([name, quantidade]) => ({
      name,
      quantidade,
    }));
    setLocationData(locationChart);

    // Agrupar por status
    const statusMap = new Map<string, number>();
    data.forEach((item) => {
      statusMap.set(item.status, (statusMap.get(item.status) || 0) + item.quantity);
    });
    const statusChart: ChartData[] = Array.from(statusMap.entries()).map(([name, quantidade]) => ({
      name,
      quantidade,
    }));
    setStatusData(statusChart);

    // Responsavel que mais solicitou por setor (considera apenas saida)
    const sectorResponsibleMap = new Map<string, Map<string, number>>();
    data.forEach((item) => {
      if (item.status !== "saida") return;
      const sectorName = item.sectors?.name || "Sem setor";
      const responsibleName = item.responsible_person || "Nao informado";
      if (!sectorResponsibleMap.has(sectorName)) {
        sectorResponsibleMap.set(sectorName, new Map());
      }
      const responsibleMap = sectorResponsibleMap.get(sectorName)!;
      responsibleMap.set(responsibleName, (responsibleMap.get(responsibleName) || 0) + item.quantity);
    });

    const topBySector: ResponsibleBySector[] = Array.from(sectorResponsibleMap.entries())
      .map(([sector, responsibleMap]) => {
        let topResponsible = "Nao informado";
        let topQty = 0;
        responsibleMap.forEach((qty, responsible) => {
          if (qty > topQty) {
            topQty = qty;
            topResponsible = responsible;
          }
        });
        return { sector, responsible: topResponsible, quantidade: topQty };
      })
      .sort((a, b) => b.quantidade - a.quantidade);
    setTopResponsibleBySector(topBySector);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text("Relatório de Movimentações", 14, 20);
    
    // Informações do filtro
    doc.setFontSize(10);
    let yPos = 30;
    doc.text(`Período: ${startDate || "Início"} até ${endDate || "Fim"}`, 14, yPos);
    yPos += 6;
    if (selectedSector !== "all") {
      const sector = sectors.find(s => s.id === selectedSector);
      doc.text(`Setor: ${sector?.name || "Todos"}`, 14, yPos);
      yPos += 6;
    }
    if (selectedLocation !== "all") {
      const location = locations.find(l => l.id === selectedLocation);
      doc.text(`Localização: ${location?.name || "Todas"}`, 14, yPos);
      yPos += 6;
    }
    doc.text(`Total de movimentações: ${movements.length}`, 14, yPos);
    yPos += 10;

    // Tabela de dados
    const tableData = movements.map((item) => [
      format(new Date(item.created_at), "dd/MM/yyyy HH:mm"),
      item.equipment.name,
      item.status,
      item.quantity.toString(),
      item.sectors?.name || "-",
      item.locations?.name || "-",
      item.responsible_person || "-",
    ]);

    autoTable(doc, {
      head: [["Data/Hora", "Equipamento", "Status", "Qtd", "Setor", "Localização", "Responsável"]],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Nova página para gráficos (dados resumidos)
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Resumo por Setor", 14, 20);
    
    let resumeY = 30;
    sectorData.forEach((item, index) => {
      doc.setFontSize(10);
      doc.text(`${item.name}: ${item.quantidade} unidades`, 14, resumeY);
      resumeY += 6;
      if (resumeY > 280) {
        doc.addPage();
        resumeY = 20;
      }
    });

    resumeY += 10;
    doc.setFontSize(14);
    doc.text("Resumo por Localização", 14, resumeY);
    resumeY += 10;
    
    locationData.forEach((item) => {
      doc.setFontSize(10);
      doc.text(`${item.name}: ${item.quantidade} unidades`, 14, resumeY);
      resumeY += 6;
      if (resumeY > 280) {
        doc.addPage();
        resumeY = 20;
      }
    });

    if (topResponsibleBySector.length > 0) {
      resumeY += 10;
      doc.setFontSize(14);
      doc.text("Responsavel que mais solicitou por setor (saida)", 14, resumeY);
      resumeY += 10;
      topResponsibleBySector.forEach((item) => {
        doc.setFontSize(10);
        doc.text(`${item.sector}: ${item.responsible} (${item.quantidade})`, 14, resumeY);
        resumeY += 6;
        if (resumeY > 280) {
          doc.addPage();
          resumeY = 20;
        }
      });
    }

    doc.save(`relatorio-movimentacoes-${format(new Date(), "dd-MM-yyyy")}.pdf`);
    
    toast({
      title: "PDF exportado",
      description: "Relatório exportado com sucesso!",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Relatórios</h1>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sector">Setor</Label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os setores</SelectItem>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Localização</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Todas as localizações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as localizações</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={fetchMovements} disabled={loading}>
                {loading ? "Carregando..." : "Gerar Relatório"}
              </Button>
              {movements.length > 0 && (
                <Button onClick={exportToPDF} variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        {movements.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Movimentações por Setor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectorData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Movimentações por Localização</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={locationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.quantidade}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="quantidade"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsavel que mais solicitou por setor (saida)</CardTitle>
              </CardHeader>
              <CardContent>
                {topResponsibleBySector.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma saida encontrada no periodo selecionado.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Setor</th>
                          <th className="text-left p-2">Responsavel</th>
                          <th className="text-left p-2">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topResponsibleBySector.map((item) => (
                          <tr key={`${item.sector}-${item.responsible}`} className="border-b">
                            <td className="p-2">{item.sector}</td>
                            <td className="p-2">{item.responsible}</td>
                            <td className="p-2">{item.quantidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabela de dados */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento ({movements.length} registros)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data/Hora</th>
                        <th className="text-left p-2">Equipamento</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Quantidade</th>
                        <th className="text-left p-2">Setor</th>
                        <th className="text-left p-2">Localização</th>
                        <th className="text-left p-2">Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-2">{format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}</td>
                          <td className="p-2">{item.equipment.name}</td>
                          <td className="p-2">
                            <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary">
                              {item.status}
                            </span>
                          </td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">{item.sectors?.name || "-"}</td>
                          <td className="p-2">{item.locations?.name || "-"}</td>
                          <td className="p-2">{item.responsible_person || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {movements.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
