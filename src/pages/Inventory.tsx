import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { LowStockNotifications } from "@/components/LowStockNotifications";
import { AuditLog } from "@/components/AuditLog";
import { UserManagement } from "@/components/UserManagement";
import { EquipmentHistoryDialog } from "@/components/EquipmentHistoryDialog";
import { Save, Trash2, FileDown, Edit, Trash, AlertTriangle, Upload, Loader2 } from "lucide-react";

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
  const { canEdit, isAdmin, loading: roleLoading } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Você precisa estar logado para fazer upload", variant: "destructive" });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await supabase.functions.invoke('upload-image', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { url } = response.data;
      setImageUrl(url);
      toast({ title: "Sucesso", description: "Imagem enviada com sucesso!" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Erro", description: error.message || "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast({ title: "Erro", description: "Você não tem permissão para editar", variant: "destructive" });
      return;
    }

    if (!name) {
      toast({ title: "Erro", description: "Nome do equipamento é obrigatório", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const data = {
      name,
      serial_number: serialNumber || null,
      category_id: selectedCategory || null,
      available_quantity: parseInt(quantity),
      description: description || null,
      image_url: imageUrl,
      ...(editingId ? { updated_by: user?.id } : { created_by: user?.id }),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("equipment").update(data).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("equipment").insert(data));
    }

    if (error) {
      if (error.code === '23505') {
        toast({ title: "Erro", description: "Este número de série já está cadastrado", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
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
    setImageUrl(null);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEdit = (equip: EquipmentData) => {
    if (!canEdit) {
      toast({ title: "Erro", description: "Você não tem permissão para editar", variant: "destructive" });
      return;
    }
    setName(equip.name);
    setSerialNumber(equip.serial_number || "");
    setSelectedCategory(equip.category_id || "");
    setQuantity(equip.available_quantity.toString());
    setDescription(equip.description || "");
    setImageUrl(equip.image_url);
    setEditingId(equip.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      toast({ title: "Erro", description: "Você não tem permissão para excluir", variant: "destructive" });
      return;
    }

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

  const lowStockItems = equipment.filter(e => e.available_quantity <= 5);

  if (roleLoading) {
    return <Layout><div>Carregando...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-center">Inventário de Equipamentos</h1>

        {/* Low Stock Alert for Programmers/Administrators */}
        {canEdit && lowStockItems.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Alerta de Estoque Baixo:</strong> {lowStockItems.length} item(ns) com 5 ou menos unidades
            </AlertDescription>
          </Alert>
        )}

        {/* Low Stock Notifications */}
        {canEdit && <LowStockNotifications />}

        {/* User Management (Administrators Only) */}
        {isAdmin && <UserManagement />}

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Nome do Equipamento</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do Equipamento"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Nº de Série</Label>
            <Input
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="Nº de Série"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!canEdit}>
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
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-4">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* File Upload */}
        {canEdit && (
          <div className="space-y-2">
            <Label>Imagem do Equipamento</Label>
            <div className="flex items-center gap-4">
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando...</span>
                </div>
              )}
            </div>
            {imageUrl && (
              <div className="mt-2 flex items-center gap-4">
                <img src={imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded border" />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setImageUrl(null)}
                >
                  Remover
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={handleSave} className="w-full py-6 text-base" disabled={!canEdit || uploading}>
            <Save className="mr-2 h-5 w-5" />
            Salvar
          </Button>
          <Button onClick={handleClear} variant="secondary" className="w-full py-6 text-base" disabled={!canEdit}>
            <Trash2 className="mr-2 h-5 w-5" />
            Limpar
          </Button>
          <Button onClick={handleExportCSV} variant="secondary" className="w-full py-6 text-base">
            <FileDown className="mr-2 h-5 w-5" />
            Exportar CSV
          </Button>
          <Button variant="secondary" className="w-full py-6 text-base" onClick={handleExportCSV}>
            <FileDown className="mr-2 h-5 w-5" />
            Exportar PDF
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="🔍 Buscar por nome..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {/* Category Filter */}
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

        {/* Equipment Table */}
        <div className="bg-card rounded-lg overflow-hidden border">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#2c5282] hover:bg-[#2c5282]">
                <TableHead className="text-white border border-[#4a5568]">Imagem</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Nome</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Nº de Série</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Categoria</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Quantidade Disponível</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Descrição</TableHead>
                <TableHead className="text-white border border-[#4a5568] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map(equip => (
                <TableRow key={equip.id}>
                  <TableCell className="border">
                    {equip.image_url ? (
                      <img src={equip.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
                        -
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="border font-medium">{equip.name}</TableCell>
                  <TableCell className="border">{equip.serial_number || "-"}</TableCell>
                  <TableCell className="border">{equip.categories?.name || "-"}</TableCell>
                  <TableCell className="border">
                    <div className="flex items-center gap-2">
                      {equip.available_quantity}
                      {equip.available_quantity <= 5 && (
                        <Badge variant="destructive" className="text-xs">Baixo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="border">{equip.description || "-"}</TableCell>
                  <TableCell className="border">
                    <div className="flex flex-col gap-2">
                      <EquipmentHistoryDialog 
                        equipmentId={equip.id}
                        equipmentName={equip.name}
                      />
                      <Button
                        onClick={() => handleEdit(equip)}
                        size="sm"
                        className="w-full"
                        disabled={!canEdit}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(equip.id)}
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        disabled={!canEdit}
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

        {/* Audit Log (Administrators Only) */}
        {isAdmin && <AuditLog />}
      </div>
    </Layout>
  );
};

export default Inventory;
