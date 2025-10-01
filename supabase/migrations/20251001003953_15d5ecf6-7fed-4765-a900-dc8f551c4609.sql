-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('leitor', 'editor', 'desenvolvedor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'leitor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Desenvolvedores podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'desenvolvedor'
    )
  );

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Desenvolvedores podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'desenvolvedor'
    )
  );

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup (assign default leitor role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'leitor');
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile and assign role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add audit fields to equipment table
ALTER TABLE public.equipment
  ADD COLUMN created_by UUID REFERENCES public.profiles(id),
  ADD COLUMN updated_by UUID REFERENCES public.profiles(id);

-- Add audit fields to tracking table
ALTER TABLE public.tracking
  ADD COLUMN created_by UUID REFERENCES public.profiles(id),
  ADD COLUMN updated_by UUID REFERENCES public.profiles(id);

-- Add unique constraint to serial_number
ALTER TABLE public.equipment
  ADD CONSTRAINT unique_serial_number UNIQUE (serial_number);

-- Create notifications table for low stock alerts
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sent_to_role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read BOOLEAN DEFAULT false
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS for notifications
CREATE POLICY "Editores e desenvolvedores podem ver notificações"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );

-- Function to create low stock notification
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.available_quantity <= 5 AND (OLD.available_quantity IS NULL OR OLD.available_quantity > 5) THEN
    INSERT INTO public.notifications (equipment_id, message, sent_to_role)
    VALUES (
      NEW.id,
      'Estoque baixo: ' || NEW.name || ' tem apenas ' || NEW.available_quantity || ' unidades disponíveis',
      'editor'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to check low stock
CREATE TRIGGER trigger_check_low_stock
  AFTER INSERT OR UPDATE OF available_quantity ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.check_low_stock();

-- Update RLS policies for equipment based on roles
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar equipamentos" ON public.equipment;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir equipamentos" ON public.equipment;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar equipamentos" ON public.equipment;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar equipamentos" ON public.equipment;

CREATE POLICY "Todos os usuários autenticados podem visualizar equipamentos"
  ON public.equipment FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Editores e desenvolvedores podem inserir equipamentos"
  ON public.equipment FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );

CREATE POLICY "Editores e desenvolvedores podem atualizar equipamentos"
  ON public.equipment FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );

CREATE POLICY "Editores e desenvolvedores podem deletar equipamentos"
  ON public.equipment FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );

-- Update RLS policies for tracking based on roles
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar rastreamento" ON public.tracking;

CREATE POLICY "Todos os usuários autenticados podem visualizar rastreamento"
  ON public.tracking FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Editores e desenvolvedores podem inserir rastreamento"
  ON public.tracking FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );

CREATE POLICY "Editores e desenvolvedores podem atualizar rastreamento"
  ON public.tracking FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );

CREATE POLICY "Editores e desenvolvedores podem deletar rastreamento"
  ON public.tracking FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'editor' OR role = 'desenvolvedor')
    )
  );