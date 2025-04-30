-- Add category column to incidents table
alter table public.incidents 
add column category text 
default 'Software' 
check (category in ('Hardware', 'Software', 'Services'));

-- Update existing incidents with default category
update public.incidents 
set category = 'Software' 
where category is null; 