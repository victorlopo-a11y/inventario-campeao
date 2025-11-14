-- Criar tabela de histórico de equipamentos
CREATE TABLE public.equipment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB, -- Armazena o que foi alterado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas rápidas
CREATE INDEX idx_equipment_history_equipment_id ON public.equipment_history(equipment_id);
CREATE INDEX idx_equipment_history_created_at ON public.equipment_history(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar histórico"
ON public.equipment_history
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Trigger para registrar criação de equipamento
CREATE OR REPLACE FUNCTION public.log_equipment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.equipment_history (equipment_id, action, changed_by, changes)
  VALUES (
    NEW.id,
    'created',
    NEW.created_by,
    jsonb_build_object(
      'name', NEW.name,
      'serial_number', NEW.serial_number,
      'category_id', NEW.category_id,
      'available_quantity', NEW.available_quantity,
      'description', NEW.description
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_creation_log
AFTER INSERT ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.log_equipment_creation();

-- Trigger para registrar atualizações de equipamento
CREATE OR REPLACE FUNCTION public.log_equipment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changes_obj JSONB := '{}'::jsonb;
BEGIN
  -- Detectar mudanças
  IF OLD.name != NEW.name THEN
    changes_obj := changes_obj || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
  END IF;
  
  IF OLD.serial_number IS DISTINCT FROM NEW.serial_number THEN
    changes_obj := changes_obj || jsonb_build_object('serial_number', jsonb_build_object('old', OLD.serial_number, 'new', NEW.serial_number));
  END IF;
  
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    changes_obj := changes_obj || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
  END IF;
  
  IF OLD.available_quantity != NEW.available_quantity THEN
    changes_obj := changes_obj || jsonb_build_object('available_quantity', jsonb_build_object('old', OLD.available_quantity, 'new', NEW.available_quantity));
  END IF;
  
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    changes_obj := changes_obj || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
  END IF;
  
  -- Só registra se houver mudanças
  IF changes_obj != '{}'::jsonb THEN
    INSERT INTO public.equipment_history (equipment_id, action, changed_by, changes)
    VALUES (NEW.id, 'updated', NEW.updated_by, changes_obj);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_update_log
AFTER UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.log_equipment_update();

-- Habilitar Realtime para notificações
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Adicionar política de UPDATE para marcar notificações como lidas
CREATE POLICY "Programadores e administradores podem atualizar notificações"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND (user_roles.role = 'programador' OR user_roles.role = 'administrador')
  )
);