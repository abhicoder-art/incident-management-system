-- Add telegram_chat_id column if it doesn't exist
alter table public.team_members
add column if not exists telegram_chat_id text;
 
-- Update all active team members with Telegram chat ID
UPDATE public.team_members
SET telegram_chat_id = '811347209'
WHERE is_active = true; 