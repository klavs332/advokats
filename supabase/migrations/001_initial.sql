-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  role text not null check (role in ('admin', 'partner')),
  topics text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Topics lookup table
create table public.topics (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

-- Seed default topics
insert into public.topics (name) values
  ('Komerctiesības'),
  ('Darba tiesības'),
  ('Nekustamais īpašums'),
  ('Ģimenes tiesības'),
  ('Krimināltiesības'),
  ('Administratīvās tiesības'),
  ('Intelektuālais īpašums'),
  ('Nodokļu tiesības'),
  ('Civiltiesības'),
  ('Starptautiskās tiesības');

-- Tasks table
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  amount numeric(12, 2) not null default 0,
  categories text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('draft', 'sent')) default 'draft',
  created_at timestamptz not null default now()
);

-- Task recipients (junction table)
create table public.task_recipients (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  opened_at timestamptz,
  replied_at timestamptz,
  unique(task_id, partner_id)
);

-- Messages table
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index on public.task_recipients(task_id);
create index on public.task_recipients(partner_id);
create index on public.messages(task_id);
create index on public.messages(created_at);

-- =====================
-- RLS Policies
-- =====================

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.tasks enable row level security;
alter table public.task_recipients enable row level security;
alter table public.messages enable row level security;

-- Helper: get current user's role
create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles: users can read all profiles, update only their own
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- Topics: anyone can read
create policy "topics_select" on public.topics for select using (true);

-- Tasks: admin sees all, partner sees only tasks they're recipient of
create policy "tasks_select_admin" on public.tasks for select
  using (public.current_user_role() = 'admin');

create policy "tasks_select_partner" on public.tasks for select
  using (
    public.current_user_role() = 'partner' and
    exists (
      select 1 from public.task_recipients
      where task_id = tasks.id and partner_id = auth.uid()
    )
  );

create policy "tasks_insert" on public.tasks for insert
  with check (public.current_user_role() = 'admin');

create policy "tasks_update" on public.tasks for update
  using (public.current_user_role() = 'admin');

-- Task recipients: admin sees all, partner sees only their own
create policy "task_recipients_select_admin" on public.task_recipients for select
  using (public.current_user_role() = 'admin');

create policy "task_recipients_select_partner" on public.task_recipients for select
  using (partner_id = auth.uid());

create policy "task_recipients_insert" on public.task_recipients for insert
  with check (public.current_user_role() = 'admin');

create policy "task_recipients_update" on public.task_recipients for update
  using (
    public.current_user_role() = 'admin' or partner_id = auth.uid()
  );

-- Messages: visible to admin always, visible to partner if they're a recipient
create policy "messages_select_admin" on public.messages for select
  using (public.current_user_role() = 'admin');

create policy "messages_select_partner" on public.messages for select
  using (
    public.current_user_role() = 'partner' and
    exists (
      select 1 from public.task_recipients
      where task_id = messages.task_id and partner_id = auth.uid()
    )
  );

create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid() and (
      public.current_user_role() = 'admin' or
      exists (
        select 1 from public.task_recipients
        where task_id = messages.task_id and partner_id = auth.uid()
      )
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'partner')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
