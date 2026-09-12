
create extension if not exists pg_net;

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_push_subscriptions enable row level security;

create or replace function public.pds_notify_new_order_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'new' then
    perform net.http_post(
      url := 'https://rsxviwsmymlrwgphydae.supabase.co/functions/v1/send-admin-order-push',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'secret','xLQ2aKXZiPKi0REvxtve0VPaBmye-PZb-DQZWb6Uhqw',
        'order_id',new.id,
        'order_number',new.order_number,
        'total',new.total,
        'customer',new.customer
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pds_admin_push_new_order on public.orders;
create trigger trg_pds_admin_push_new_order
after insert on public.orders
for each row execute function public.pds_notify_new_order_push();
