import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Trash2, FileDown, Edit, Trash } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface EquipmentData {
  id: string;
  name: string;
  serial_number: string | null;
  category_id: string | null;
  available_quantity: number;
  description: string | null;
  image_url: string | null;
  categories: { name: string } | null;
}

const Inventory = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [catRes, equipRes] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("equipment").select(`
        *,
        categories:category_id(name)
      `).order("created_at", { ascending: false }),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (equipRes.data) setEquipment(equipRes.data as any);
  };

  const handleSave = async () => {
    if (!name) {
      toast({ title: "Erro", description: "Nome do equipamento é obrigatório", variant: "destructive" });
      return;
    }

    const data = {
      name,
      serial_number: serialNumber || null,
      category_id: selectedCategory || null,
      available_quantity: parseInt(quantity),
      description: description || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("equipment").update(data).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("equipment").insert(data));
    }

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: editingId ? "Equipamento atualizado!" : "Equipamento cadastrado!" });
      handleClear();
      fetchData();
    }
  };

  const handleClear = () => {
    setName("");
    setSerialNumber("");
    setSelectedCategory("");
    setQuantity("0");
    setDescription("");
    setEditingId(null);
  };

  const handleEdit = (equip: EquipmentData) => {
    setName(equip.name);
    setSerialNumber(equip.serial_number || "");
    setSelectedCategory(equip.category_id || "");
    setQuantity(equip.available_quantity.toString());
    setDescription(equip.description || "");
    setEditingId(equip.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;

    const { error } = await supabase.from("equipment").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Equipamento excluído!" });
      fetchData();
    }
  };

  const handleExportCSV = () => {
    const headers = ["Nome", "Nº de Série", "Categoria", "Quantidade Disponível", "Descrição"];
    const rows = filteredEquipment.map(e => [
      e.name,
      e.serial_number || "",
      e.categories?.name || "",
      e.available_quantity,
      e.description || "",
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario.csv";
    a.click();
  };

  const filteredEquipment = equipment.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-center">Inventário de Equipamentos</h1>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nome do Equipamento</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do Equipamento"
            />
          </div>

          <div className="space-y-2">
            <Label>Nº de Série</Label>
            <Input
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="Nº de Série"
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade Disponível</Label>
            <Input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="0"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
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
          {editingId && (
            <Button onClick={() => setEditingId(null)} variant="outline" className="w-full py-6 text-base">
              Cancelar Edição
            </Button>
          )}
          <Button onClick={handleExportCSV} variant="secondary" className="w-full py-6 text-base">
            <FileDown className="mr-2 h-5 w-5" />
            Exportar CSV
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <Input
            placeholder="🔍 Buscar por nome..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Equipment Table */}
        <div className="bg-card rounded-lg overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary text-primary-foreground hover:bg-primary">
                <TableHead className="text-primary-foreground">Nome</TableHead>
                <TableHead className="text-primary-foreground">Nº de Série</TableHead>
                <TableHead className="text-primary-foreground">Categoria</TableHead>
                <TableHead className="text-primary-foreground">Quantidade</TableHead>
                <TableHead className="text-primary-foreground">Descrição</TableHead>
                <TableHead className="text-primary-foreground text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map(equip => (
                <TableRow key={equip.id}>
                  <TableCell className="font-medium">{equip.name}</TableCell>
                  <TableCell>{equip.serial_number || "-"}</TableCell>
                  <TableCell>{equip.categories?.name || "-"}</TableCell>
                  <TableCell>{equip.available_quantity}</TableCell>
                  <TableCell>{equip.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => handleEdit(equip)}
                        size="sm"
                        className="bg-primary hover:bg-primary-dark"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(equip.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default Inventory;
