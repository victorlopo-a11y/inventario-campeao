-- Create setup checklists for line setup confirmation
CREATE TABLE public.setup_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id),
  leader_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  items JSONB NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.setup_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem visualizar checklists de setup"
  ON public.setup_checklists FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados podem inserir checklists de setup"
  ON public.setup_checklists FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
