-- Criar tabelas para o sistema de rastreamento de periféricos

-- Tabela de categorias
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de localizações
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de setores
CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de equipamentos
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  serial_number TEXT UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  available_quantity INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de rastreamento
CREATE TABLE public.tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('saida', 'manutencao', 'danificado', 'devolucao')),
  entry_type TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  location_id UUID REFERENCES public.locations(id),
  sector_id UUID REFERENCES public.sectors(id),
  responsible_person TEXT,
  delivered_by TEXT,
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usuários autenticados podem ver e manipular todos os dados)
CREATE POLICY "Usuários autenticados podem visualizar categorias" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir categorias" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar categorias" ON public.categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar categorias" ON public.categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem visualizar localizações" ON public.locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir localizações" ON public.locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar localizações" ON public.locations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar localizações" ON public.locations
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem visualizar setores" ON public.sectors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir setores" ON public.sectors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar setores" ON public.sectors
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar setores" ON public.sectors
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem visualizar equipamentos" ON public.equipment
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir equipamentos" ON public.equipment
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar equipamentos" ON public.equipment
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar equipamentos" ON public.equipment
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem visualizar rastreamento" ON public.tracking
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir rastreamento" ON public.tracking
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar rastreamento" ON public.tracking
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar rastreamento" ON public.tracking
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracking_updated_at
  BEFORE UPDATE ON public.tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO public.categories (name) VALUES 
  ('Máquinas'),
  ('Computadores'),
  ('Periféricos'),
  ('Ferramentas');

INSERT INTO public.locations (name) VALUES 
  ('Sala 1'),
  ('Sala 2'),
  ('Depósito'),
  ('Escritório');

INSERT INTO public.sectors (name) VALUES 
  ('TI'),
  ('Produção'),
  ('Administrativo'),
  ('Manutenção');