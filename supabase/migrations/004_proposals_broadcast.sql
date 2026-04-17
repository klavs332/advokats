-- 1. Broadcast chat: remove recipient_id
ALTER TABLE public.messages DROP COLUMN IF EXISTS recipient_id;

-- Drop old per-partner policies
DROP POLICY IF EXISTS "messages_select_partner" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

-- New broadcast policies
CREATE POLICY "messages_select_partner" ON public.messages FOR SELECT
  USING (
    public.current_user_role() = 'partner' AND
    EXISTS (
      SELECT 1 FROM public.task_recipients
      WHERE task_id = messages.task_id AND partner_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND (
      public.current_user_role() = 'admin' OR
      EXISTS (
        SELECT 1 FROM public.task_recipients
        WHERE task_id = messages.task_id AND partner_id = auth.uid()
      )
    )
  );

-- 2. Proposals table
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, partner_id)
);

CREATE INDEX ON public.proposals(task_id);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_admin" ON public.proposals FOR SELECT
  USING (public.current_user_role() = 'admin');

CREATE POLICY "proposals_select_partner" ON public.proposals FOR SELECT
  USING (partner_id = auth.uid());

CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT
  WITH CHECK (
    partner_id = auth.uid() AND
    public.current_user_role() = 'partner' AND
    EXISTS (
      SELECT 1 FROM public.task_recipients
      WHERE task_id = proposals.task_id AND partner_id = auth.uid()
    )
  );

CREATE POLICY "proposals_update_admin" ON public.proposals FOR UPDATE
  USING (public.current_user_role() = 'admin');

ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;

-- 3. Tasks: assigned_to + 'assigned' status
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('draft', 'sent', 'assigned'));

-- 4. Partner profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating numeric(3,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability text CHECK (availability IN ('available', 'busy', 'unavailable')) DEFAULT 'available';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);
