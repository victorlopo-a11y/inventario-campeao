create table if not exists public.bins (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  aisle text null,
  side text null,
  shelf text null,
  notes text null,
  created_at timestamptz not null default now()
);

alter table public.equipment
add column if not exists bin_id uuid null;

alter table public.equipment
add constraint equipment_bin_id_fkey
foreign key (bin_id) references public.bins (id)
on delete set null;

alter table public.equipment
drop column if exists storage_location;
