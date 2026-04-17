-- Add approval status to profiles
alter table public.profiles
  add column approved boolean not null default false;

-- Admin profiles are auto-approved
-- When partner registers, approved = false (pending)

-- Update the auto-create profile trigger to set approved based on role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'partner'),
    -- Admins are auto-approved, partners need approval
    case when coalesce(new.raw_user_meta_data->>'role', 'partner') = 'admin'
      then true
      else false
    end
  );
  return new;
end;
$$;

-- Update profiles_update policy: admin can update any profile (for approval)
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());

create policy "profiles_update_admin" on public.profiles for update
  using (public.current_user_role() = 'admin');

-- Topics: admin can insert, update, delete
create policy "topics_insert" on public.topics for insert
  with check (public.current_user_role() = 'admin');

create policy "topics_update" on public.topics for update
  using (public.current_user_role() = 'admin');

create policy "topics_delete" on public.topics for delete
  using (public.current_user_role() = 'admin');
