-- Update RLS policies on tracking table to allow 'visualizador' to manage movements
-- but keep equipment management restricted to programador/administrador

-- Drop existing tracking policies
DROP POLICY IF EXISTS "Programadores e administradores podem inserir rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Programadores e administradores podem atualizar rastreamento" ON public.tracking;
DROP POLICY IF EXISTS "Programadores e administradores podem deletar rastreamento" ON public.tracking;

-- Create new policies that include 'visualizador' for tracking operations
CREATE POLICY "Usuários autenticados podem inserir rastreamento" 
ON public.tracking 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar rastreamento" 
ON public.tracking 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar rastreamento" 
ON public.tracking 
FOR DELETE 
USING (auth.uid() IS NOT NULL);