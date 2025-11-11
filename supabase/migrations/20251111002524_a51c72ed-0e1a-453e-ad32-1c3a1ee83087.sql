-- Dropar policies que dependem do enum app_role

-- Equipment policies
DROP POLICY IF EXISTS "Editores e desenvolvedores podem atualizar equipamentos" ON public.equipment;
DROP POLICY IF EXISTS "Editores e desenvolvedores podem deletar equipamentos" ON public.equipment;
DROP POLICY IF EXISTS "Editores e desenvolvedores podem inserir equipamentos" ON public.equipment;

-- Notifications policies  
DROP POLICY IF EXISTS "Editores e desenvolvedores podem ver notificações" ON public.notifications;

-- Profiles policies
DROP POLICY IF EXISTS "Desenvolvedores podem ver todos os perfis" ON public.profiles;

-- Tracking policies
DROP POLICY IF EXISTS "Editores e desenvolvedores podem atualizar rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Editores e desenvolvedores podem deletar rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Editores e desenvolvedores podem inserir rastreamento" ON public.tracking;

-- User roles policies
DROP POLICY IF EXISTS "Desenvolvedores podem gerenciar roles" ON public.user_roles;

-- Dropar a função has_role que depende do enum
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Criar novo enum
CREATE TYPE public.app_role_new AS ENUM ('visualizador', 'programador', 'administrador');

-- Atualizar coluna sent_to_role em notifications
ALTER TABLE public.notifications ALTER COLUMN sent_to_role DROP DEFAULT;
ALTER TABLE public.notifications 
  ALTER COLUMN sent_to_role TYPE app_role_new
  USING (
    CASE sent_to_role::text
      WHEN 'editor' THEN 'programador'::app_role_new
      WHEN 'desenvolvedor' THEN 'administrador'::app_role_new
      ELSE 'programador'::app_role_new
    END
  );

-- Atualizar coluna role em user_roles
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE app_role_new 
  USING (
    CASE role::text
      WHEN 'leitor' THEN 'visualizador'::app_role_new
      WHEN 'editor' THEN 'programador'::app_role_new
      WHEN 'desenvolvedor' THEN 'administrador'::app_role_new
    END
  );

-- Dropar o enum antigo
DROP TYPE public.app_role;

-- Renomear o novo enum
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Restaurar os defaults
ALTER TABLE public.user_roles 
  ALTER COLUMN role SET DEFAULT 'visualizador'::app_role;
ALTER TABLE public.notifications 
  ALTER COLUMN sent_to_role SET DEFAULT 'programador'::app_role;

-- Recriar a função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
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

-- Recriar policies com os novos nomes de roles

-- Equipment policies
CREATE POLICY "Programadores e administradores podem atualizar equipamentos" 
ON public.equipment 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

CREATE POLICY "Programadores e administradores podem deletar equipamentos" 
ON public.equipment 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

CREATE POLICY "Programadores e administradores podem inserir equipamentos" 
ON public.equipment 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

-- Notifications policies
CREATE POLICY "Programadores e administradores podem ver notificações" 
ON public.notifications 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

-- Profiles policies
CREATE POLICY "Administradores podem ver todos os perfis" 
ON public.profiles 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'administrador'::app_role
));

-- Tracking policies
CREATE POLICY "Programadores e administradores podem atualizar rastreamento" 
ON public.tracking 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

CREATE POLICY "Programadores e administradores podem deletar rastreamento" 
ON public.tracking 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

CREATE POLICY "Programadores e administradores podem inserir rastreamento" 
ON public.tracking 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND (user_roles.role = 'programador'::app_role OR user_roles.role = 'administrador'::app_role)
));

-- User roles policies
CREATE POLICY "Administradores podem gerenciar roles" 
ON public.user_roles 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM user_roles user_roles_1 
  WHERE user_roles_1.user_id = auth.uid() 
  AND user_roles_1.role = 'administrador'::app_role
));

-- Atualizar a trigger function
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

-- Dar role de administrador para o usuário especificado
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