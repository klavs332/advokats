-- Add recipient_id to messages for private per-partner conversations
-- When admin sends a message, recipient_id = target partner
-- When partner sends a message, recipient_id = their own id
alter table public.messages
  add column recipient_id uuid references public.profiles(id) on delete cascade;

-- Backfill existing messages if any (set recipient_id = sender_id for partner messages)
update public.messages m
set recipient_id = m.sender_id
where exists (
  select 1 from public.profiles p
  where p.id = m.sender_id and p.role = 'partner'
);

-- Make recipient_id required going forward
alter table public.messages
  alter column recipient_id set not null;

-- Index for filtering messages by recipient
create index on public.messages(recipient_id);

-- Update RLS: partner can only see messages in their private thread
drop policy if exists "messages_select_partner" on public.messages;
create policy "messages_select_partner" on public.messages for select
  using (
    public.current_user_role() = 'partner' and
    recipient_id = auth.uid()
  );

-- Update insert policy: partner can only insert messages with recipient_id = self
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid() and (
      public.current_user_role() = 'admin' or
      (public.current_user_role() = 'partner' and recipient_id = auth.uid())
    )
  );
