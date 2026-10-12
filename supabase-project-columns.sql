-- Adds the three project columns the app writes to but the table was missing.
-- Without them, any change that touched tasks, history or stakeholders was rejected by the database.
-- Run once: Supabase, SQL Editor, paste, Run. It is safe to run again.

alter table public.pm_projects
  add column if not exists tasks jsonb not null default '[]'::jsonb,
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists stakeholders jsonb not null default '[]'::jsonb;

-- make the API notice the new columns straight away
notify pgrst, 'reload schema';
