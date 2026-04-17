-- Admin delete policies for partners, tasks, and task recipients.
-- Existing FKs already cascade: tasks -> task_recipients/messages/proposals,
-- profiles -> task_recipients/messages/proposals (on delete cascade).

-- Profiles: admin can delete any partner profile (not admins, not self).
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE
  USING (
    public.current_user_role() = 'admin'
    AND role = 'partner'
  );

-- Tasks: admin can delete any task.
CREATE POLICY "tasks_delete_admin" ON public.tasks FOR DELETE
  USING (public.current_user_role() = 'admin');

-- Task recipients: admin can delete (needed when editing a task's recipient list).
CREATE POLICY "task_recipients_delete_admin" ON public.task_recipients FOR DELETE
  USING (public.current_user_role() = 'admin');
