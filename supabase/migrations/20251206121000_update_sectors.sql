-- Remove setor Administrativo e adiciona Producao/OPPO
DELETE FROM public.sectors WHERE name ILIKE 'administrativo';

INSERT INTO public.sectors (name) VALUES ('Producao/OPPO')
ON CONFLICT (name) DO NOTHING;
