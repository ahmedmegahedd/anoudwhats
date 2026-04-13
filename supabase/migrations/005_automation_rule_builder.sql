-- Part 5: Automation Rule Builder
-- Add trigger_config and last_run_at columns to automation_rules.

alter table automation_rules
  add column if not exists trigger_config jsonb default '{}',
  add column if not exists last_run_at    timestamptz;
