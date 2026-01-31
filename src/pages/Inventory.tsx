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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { LowStockNotifications } from "@/components/LowStockNotifications";
import { AuditLog } from "@/components/AuditLog";
import { UserManagement } from "@/components/UserManagement";
import { EquipmentHistoryDialog } from "@/components/EquipmentHistoryDialog";
import { QRCodeCanvas } from "qrcode.react";
import { Save, Trash2, FileDown, Edit, Trash, AlertTriangle, Upload, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Bin {
  id: string;
  code: string;
  aisle: string | null;
  side: string | null;
  shelf: string | null;
  notes: string | null;
}

interface EquipmentData {
  id: string;
  name: string;
  serial_number: string | null;
  category_id: string | null;
  bin_id: string | null;
  available_quantity: number;
  description: string | null;
  image_url: string | null;
  bins: Bin | null;
  categories: { name: string } | null;
}

const Inventory = () => {
  const { toast } = useToast();
  const { canEdit, isAdmin, loading: roleLoading } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBinId, setSelectedBinId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState("");
  const [qrLabel, setQrLabel] = useState("");
  const [binDialogOpen, setBinDialogOpen] = useState(false);
  const [binCode, setBinCode] = useState("");
  const [binAisle, setBinAisle] = useState("");
  const [binSide, setBinSide] = useState("");
  const [binShelf, setBinShelf] = useState("");
  const [binNotes, setBinNotes] = useState("");
  const [savingBin, setSavingBin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const formatBinLabel = (bin: Bin | null) => {
    if (!bin) return "-";
    const parts = [
      bin.code,
      bin.aisle ? `Rua ${bin.aisle}` : "",
      bin.side ? `Lado ${bin.side}` : "",
      bin.shelf ? `Prateleira ${bin.shelf}` : "",
    ].filter(Boolean);
    return parts.join(" - ");
  };

  const buildQrPayload = (equip: EquipmentData) => {
    const categoryName = categories.find(c => c.id === equip.category_id)?.name || "";
    const binLabel = formatBinLabel(equip.bins);
    const payload = {
      id: equip.id,
      name: equip.name,
      serial_number: equip.serial_number || equip.id,
      category_id: equip.category_id,
      category_name: categoryName,
      bin_id: equip.bin_id,
      bin_label: binLabel,
      available_quantity: equip.available_quantity,
      description: equip.description,
      image_url: equip.image_url,
    };
    return JSON.stringify(payload);
  };

  const openQrDialog = (equip: EquipmentData) => {
    setQrPayload(buildQrPayload(equip));
    setQrLabel(equip.name || "equipamento");
    setQrDialogOpen(true);
  };

  const handleDownloadQr = () => {
    const canvas = document.getElementById("equipment-qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${qrLabel || "equipamento"}.png`;
    a.click();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ));
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredEquipment.map(item => item.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : visibleIds);
  };

  const handlePrintLabels = () => {
    if (selectedIds.length === 0) {
      toast({ title: "Aviso", description: "Selecione pelo menos um equipamento." });
      return;
    }
    window.print();
  };

  const fetchData = async () => {
    const [catRes, binRes, equipRes] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("bins").select("*").order("code"),
      supabase.from("equipment").select(`
        *,
        categories:category_id(name),
        bins:bin_id(code, aisle, side, shelf, notes)
      `).order("created_at", { ascending: false }),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (binRes.data) setBins(binRes.data);
    if (equipRes.data) setEquipment(equipRes.data as any);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageName(file.name);
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

  const resetBinForm = () => {
    setBinCode("");
    setBinAisle("");
    setBinSide("");
    setBinShelf("");
    setBinNotes("");
  };

  const handleCreateBin = async () => {
    if (!canEdit) {
      toast({ title: "Erro", description: "Você não tem permissão para cadastrar bin", variant: "destructive" });
      return;
    }

    if (!binCode.trim()) {
      toast({ title: "Erro", description: "Informe o código do bin", variant: "destructive" });
      return;
    }

    setSavingBin(true);
    const payload = {
      code: binCode.trim(),
      aisle: binAisle.trim() || null,
      side: binSide.trim() || null,
      shelf: binShelf.trim() || null,
      notes: binNotes.trim() || null,
    };

    const { data, error } = await supabase
      .from("bins")
      .insert(payload)
      .select("*")
      .single();

    setSavingBin(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Erro", description: "Este código de bin já está cadastrado", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
      return;
    }

    if (data) {
      setSelectedBinId(data.id);
    }
    resetBinForm();
    setBinDialogOpen(false);
    fetchData();
    toast({ title: "Sucesso", description: "Bin cadastrado!" });
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

    if (!selectedBinId) {
      toast({ title: "Erro", description: "Selecione um bin para o equipamento", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const data = {
      name,
      serial_number: serialNumber || null,
      category_id: selectedCategory || null,
      bin_id: selectedBinId || null,
      available_quantity: parseInt(quantity),
      description: description || null,
      image_url: imageUrl,
      ...(editingId ? { updated_by: user?.id } : { created_by: user?.id }),
    };

    let error;
    let savedRow: EquipmentData | null = null;
    if (editingId) {
      ({ data: savedRow, error } = await supabase
        .from("equipment")
        .update(data)
        .eq("id", editingId)
        .select("*")
        .single());
    } else {
      ({ data: savedRow, error } = await supabase
        .from("equipment")
        .insert(data)
        .select("*")
        .single());
    }

    if (error) {
      if (error.code === '23505') {
        toast({ title: "Erro", description: "Este número de série já está cadastrado", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Sucesso", description: editingId ? "Equipamento atualizado!" : "Equipamento cadastrado!" });
      if (savedRow) {
        openQrDialog(savedRow);
      }
      handleClear();
      fetchData();
    }
  };

  const handleClear = () => {
    setName("");
    setSerialNumber("");
    setSelectedCategory("");
    setSelectedBinId("");
    setQuantity("0");
    setDescription("");
    setImageUrl(null);
    setSelectedImageName("");
    setSelectedIds([]);
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
    setSelectedBinId(equip.bin_id || "");
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
    const headers = ["Nome", "Nº de Série", "Categoria", "Bin/Localização", "Quantidade Disponível", "Descrição"];
    const rows = filteredEquipment.map(e => [
      e.name,
      e.serial_number || "",
      e.categories?.name || "",
      formatBinLabel(e.bins),
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
      <div className="space-y-6 print-hidden">
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

          <div className="space-y-2 md:col-span-2">
            <Label>Bin</Label>
            <Select value={selectedBinId} onValueChange={setSelectedBinId} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um bin" />
              </SelectTrigger>
              <SelectContent>
                {bins.map(bin => (
                  <SelectItem key={bin.id} value={bin.id}>
                    {formatBinLabel(bin)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2 flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setBinDialogOpen(true)}
              disabled={!canEdit}
            >
              Cadastrar bin
            </Button>
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
            <div className="flex flex-wrap items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Selecionar imagem
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedImageName || "Nenhum arquivo selecionado"}
              </span>
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
                  onClick={() => {
                    setImageUrl(null);
                    setSelectedImageName("");
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
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
          <Button onClick={handlePrintLabels} variant="secondary" className="w-full py-6 text-base">
            Imprimir etiquetas
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
              <TableHead className="text-white border border-[#4a5568] text-center">
                <input
                  type="checkbox"
                  checked={filteredEquipment.length > 0 && filteredEquipment.every(item => selectedIds.includes(item.id))}
                  onChange={toggleSelectAll}
                />
              </TableHead>
                <TableHead className="text-white border border-[#4a5568]">Imagem</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Nome</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Nº de Série</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Categoria</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Quantidade Disponível</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Bin/Localização</TableHead>
                <TableHead className="text-white border border-[#4a5568]">Descrição</TableHead>
                <TableHead className="text-white border border-[#4a5568] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map(equip => (
                <TableRow key={equip.id}>
                <TableCell className="border text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(equip.id)}
                    onChange={() => toggleSelect(equip.id)}
                  />
                </TableCell>
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
                  <TableCell className="border">{formatBinLabel(equip.bins)}</TableCell>
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
                        onClick={() => openQrDialog(equip)}
                        size="sm"
                        variant="secondary"
                        className="w-full"
                      >
                        QR
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

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR do equipamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrPayload ? (
              <QRCodeCanvas value={qrPayload} size={220} includeMargin id="equipment-qr-canvas" />
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados para gerar QR.</p>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Use este QR para leitura no rastreamento.
            </p>
            <Button variant="secondary" className="w-full" onClick={handleDownloadQr}>
              Baixar QR
            </Button>
            <Button className="w-full" onClick={() => setQrDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={binDialogOpen}
        onOpenChange={(open) => {
          setBinDialogOpen(open);
          if (!open) resetBinForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo bin</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={binCode}
                onChange={e => setBinCode(e.target.value)}
                placeholder="Ex: BIN09"
              />
            </div>
            <div className="space-y-2">
              <Label>Rua</Label>
              <Input
                value={binAisle}
                onChange={e => setBinAisle(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Lado</Label>
              <Input
                value={binSide}
                onChange={e => setBinSide(e.target.value)}
                placeholder="Ex: direito"
              />
            </div>
            <div className="space-y-2">
              <Label>Prateleira</Label>
              <Input
                value={binShelf}
                onChange={e => setBinShelf(e.target.value)}
                placeholder="Ex: A"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observação (opcional)</Label>
              <Input
                value={binNotes}
                onChange={e => setBinNotes(e.target.value)}
                placeholder="Ex: Materiais pequenos"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="w-full" onClick={() => setBinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="w-full" onClick={handleCreateBin} disabled={savingBin}>
              {savingBin ? "Salvando..." : "Salvar bin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @media screen {
          #print-area {
            display: none;
          }
        }
        @media print {
          body {
            margin: 0;
          }
          .print-hidden,
          .print-hide {
            display: none !important;
          }
          #print-area {
            display: block;
            position: static;
            width: 100%;
          }
          .print-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .print-label {
            width: 260px;
            border: 1px solid #111;
            padding: 8px;
            display: flex;
            gap: 10px;
            align-items: center;
          }
          .print-text {
            font-size: 12px;
          }
        }
      `}</style>

      <div id="print-area">
        <div className="print-grid">
          {equipment
            .filter(item => selectedIds.includes(item.id))
            .map(item => (
              <div key={item.id} className="print-label">
                <QRCodeCanvas value={buildQrPayload(item)} size={96} />
                <div className="print-text">
                  <div><strong>{item.name}</strong></div>
                  <div>Serie: {item.serial_number || "-"}</div>
                  <div>Local: {formatBinLabel(item.bins)}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </Layout>
  );
};

export default Inventory;



