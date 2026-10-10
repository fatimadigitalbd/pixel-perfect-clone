create type public.app_role as enum ('admin','staff');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member(auth.uid()) or id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

-- First user becomes admin; later users start with no role until admin approves as staff
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income','expense')),
  amount numeric(12,2) not null check (amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  category text not null,
  description text,
  customer_name text,
  payment_method text not null default 'cash',
  txn_date date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "members read tx" on public.transactions for select to authenticated using (public.is_member(auth.uid()));
create policy "members insert tx" on public.transactions for insert to authenticated with check (public.is_member(auth.uid()) and created_by = auth.uid());
create policy "members update tx" on public.transactions for update to authenticated using (public.is_member(auth.uid()));
create policy "admin delete tx" on public.transactions for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  content text not null default '',
  page_size text not null default 'A4',
  margin_mm int not null default 20,
  created_by uuid,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "members all docs" on public.documents for all to authenticated using (public.is_member(auth.uid())) with check (public.is_member(auth.uid()));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_name text not null,
  phone text,
  service text not null,
  instructions text,
  status text not null default 'received' check (status in ('received','in_progress','ready','delivered','cancelled')),
  files jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "members read orders" on public.orders for select to authenticated using (public.is_member(auth.uid()));
create policy "members update orders" on public.orders for update to authenticated using (public.is_member(auth.uid()));
create policy "admin delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.job_circulars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  category text not null default 'government',
  location text,
  published_on date,
  deadline date,
  eligibility text,
  source_url text not null,
  apply_url text,
  verified boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.job_circulars to authenticated;
grant all on public.job_circulars to service_role;
alter table public.job_circulars enable row level security;
create policy "members read jobs" on public.job_circulars for select to authenticated using (public.is_member(auth.uid()));
create policy "admin write jobs" on public.job_circulars for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update jobs" on public.job_circulars for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete jobs" on public.job_circulars for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admin read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "members insert audit" on public.audit_logs for insert to authenticated with check (public.is_member(auth.uid()) and actor = auth.uid());

-- staff files policies (bucket created separately)
create policy "members read customer files" on storage.objects for select to authenticated
  using (bucket_id = 'customer-files' and public.is_member(auth.uid()));
create policy "admin delete customer files" on storage.objects for delete to authenticated
  using (bucket_id = 'customer-files' and public.has_role(auth.uid(),'admin'));