-- Atualiza nomes antigos de localizacao e insere nova lista padronizada
-- Mapeia as 4 entradas existentes para as primeiras do novo grupo MB
UPDATE public.locations SET name = 'MB01' WHERE name ILIKE 'sala 1';
UPDATE public.locations SET name = 'MB02' WHERE name ILIKE 'sala 2';
UPDATE public.locations SET name = 'MB03' WHERE name ILIKE 'dep%';
UPDATE public.locations SET name = 'MB04' WHERE name ILIKE 'escrit%';

-- Insere demais locais (evita duplicar caso ja exista)
INSERT INTO public.locations (name) VALUES
  ('MB05'), ('MB06'), ('MB07'), ('MB08'), ('MB09'), ('MB10'), ('MB11'), ('MB12'),
  ('PC01'), ('PC02'), ('PC03'), ('PC04'),
  ('LOG01'), ('LOG02'), ('LOG03'), ('LOG04'), ('LOG05'), ('LOG06'), ('LOG07'), ('LOG08'),
  ('RD'), ('RD01'), ('RD02'),
  ('ZB01'), ('ZB02'), ('ZB03'), ('ZB04'),
  ('SA01'), ('SA02'), ('SA03'), ('SA04'),
  ('PD'), ('PD01'), ('PD02'),
  ('EL01'), ('EL02')
ON CONFLICT (name) DO NOTHING;
