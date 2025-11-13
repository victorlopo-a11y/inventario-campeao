-- Adicionar novos valores ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'visualizador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'programador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrador';

-- Atualizar defaults
ALTER TABLE public.user_roles 
ALTER COLUMN role SET DEFAULT 'visualizador'::app_role;

ALTER TABLE public.notifications 
ALTER COLUMN sent_to_role SET DEFAULT 'programador'::app_role;

-- Atualizar trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visualizador');
  
  RETURN NEW;
END;
$function$;

-- Dar role de administrador para o usuário
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'victorlopo456@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'administrador');
  END IF;
END $$;