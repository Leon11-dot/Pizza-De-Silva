create table if not exists public.android_push_devices (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  platform text not null default 'android',
  app text not null default 'pizza-de-silva-admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.android_push_devices enable row level security;
