-- Remover políticas antigas que causam recursão
DROP POLICY IF EXISTS "Administradores podem gerenciar roles" ON public.user_roles;

-- Criar novas políticas usando a função has_role para evitar recursão
CREATE POLICY "Administradores podem inserir roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Administradores podem atualizar roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Administradores podem deletar roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrador'));