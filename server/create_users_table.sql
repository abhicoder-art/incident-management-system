-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text not null unique,
  full_name text not null,
  role text not null default 'User',
  department text not null,
  is_active boolean not null default true
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Create a policy that allows anyone to read users
create policy "Anyone can read users"
  on public.users for select
  using (true);

-- Create a policy that allows authenticated users to update their own profile
create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Add 10 hypothetical users
insert into public.users (id, email, full_name, role, department)
values
  ('00000000-0000-0000-0000-000000000001', 'john.doe@example.com', 'John Doe', 'Admin', 'IT'),
  ('00000000-0000-0000-0000-000000000002', 'jane.smith@example.com', 'Jane Smith', 'Manager', 'Operations'),
  ('00000000-0000-0000-0000-000000000003', 'mike.johnson@example.com', 'Mike Johnson', 'Engineer', 'Development'),
  ('00000000-0000-0000-0000-000000000004', 'sarah.williams@example.com', 'Sarah Williams', 'Analyst', 'Business'),
  ('00000000-0000-0000-0000-000000000005', 'david.brown@example.com', 'David Brown', 'Engineer', 'Development'),
  ('00000000-0000-0000-0000-000000000006', 'emma.davis@example.com', 'Emma Davis', 'Manager', 'Support'),
  ('00000000-0000-0000-0000-000000000007', 'robert.wilson@example.com', 'Robert Wilson', 'Engineer', 'Development'),
  ('00000000-0000-0000-0000-000000000008', 'lisa.moore@example.com', 'Lisa Moore', 'Analyst', 'Business'),
  ('00000000-0000-0000-0000-000000000009', 'james.taylor@example.com', 'James Taylor', 'Engineer', 'Development'),
  ('00000000-0000-0000-0000-000000000010', 'patricia.anderson@example.com', 'Patricia Anderson', 'Manager', 'Operations'); 