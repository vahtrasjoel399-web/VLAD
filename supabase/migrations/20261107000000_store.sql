-- SMOLIN.FX store: orders, personal download links, download log, product files.
-- Only the site's server touches these tables (service role key). Row level
-- security is on with no policies, so the public anon key can read nothing.

create table public.product_files (
  product_id text primary key,          -- Sanity product _id
  path text not null,                   -- object path in the private "products" bucket
  file_name text not null,              -- original file name, used for the download name
  size bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,        -- short code shown to the buyer, e.g. SF-7K3QXP
  stripe_session_id text unique,        -- null for free products
  stripe_payment_intent text,
  product_id text not null,
  product_title text not null,
  email text not null,
  amount_total integer not null default 0,  -- cents
  currency text not null default 'eur',
  locale text not null default 'en',
  consent_at timestamptz,               -- when the buyer ticked the license box
  license_version text,
  status text not null default 'paid' check (status in ('paid', 'free', 'refunded')),
  flagged boolean not null default false,
  flag_reason text,
  link_gen integer not null default 1,  -- bumping it kills every older link
  link_issued_at timestamptz not null default now(),
  link_revoked boolean not null default false,
  downloads_used integer not null default 0,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index orders_created_at on public.orders (created_at desc);
create index orders_payment_intent on public.orders (stripe_payment_intent);
create index orders_email on public.orders (lower(email));

create table public.download_log (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  at timestamptz not null default now(),
  ip text,
  country text,
  user_agent text,
  outcome text not null  -- ok | expired | limit | revoked | stale | blocked
);
create index download_log_order on public.download_log (order_id, at desc);

alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.download_log enable row level security;
revoke all on public.product_files, public.orders, public.download_log from anon, authenticated;

-- One download attempt, decided atomically (the order row is locked, so two
-- parallel clicks cannot both take the last download).
-- Blocks the link and flags the order when successful downloads come from
-- p_max_countries+ countries or p_max_ips+ IP addresses.
create or replace function public.claim_download(
  p_order_id uuid,
  p_gen integer,
  p_ip text,
  p_country text,
  p_user_agent text,
  p_max_downloads integer default 5,
  p_ttl_hours integer default 48,
  p_max_countries integer default 2,
  p_max_ips integer default 3
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  v_outcome text;
  v_countries integer;
  v_ips integer;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return 'missing';
  end if;

  if p_gen <> o.link_gen then
    v_outcome := 'stale';
  elsif o.link_revoked or o.status = 'refunded' then
    v_outcome := 'revoked';
  elsif now() > o.link_issued_at + make_interval(hours => p_ttl_hours) then
    v_outcome := 'expired';
  elsif o.downloads_used >= p_max_downloads then
    v_outcome := 'limit';
  else
    select count(distinct country) filter (where country is not null),
           count(distinct ip) filter (where ip is not null)
      into v_countries, v_ips
      from (
        select country, ip from public.download_log
         where order_id = o.id and outcome = 'ok'
           and at >= o.link_issued_at
        union all
        select p_country, p_ip
      ) s;
    if v_countries >= p_max_countries or v_ips >= p_max_ips then
      v_outcome := 'blocked';
      update public.orders
         set link_revoked = true,
             flagged = true,
             flag_reason = format('Opened from %s countries / %s IPs', v_countries, v_ips)
       where id = o.id;
    else
      v_outcome := 'ok';
      update public.orders set downloads_used = downloads_used + 1 where id = o.id;
    end if;
  end if;

  insert into public.download_log (order_id, ip, country, user_agent, outcome)
  values (o.id, p_ip, p_country, left(p_user_agent, 300), v_outcome);
  return v_outcome;
end;
$$;
revoke all on function public.claim_download from public, anon, authenticated;
grant execute on function public.claim_download to service_role;

-- Private bucket for the product files. No public URL exists for anything in it.
insert into storage.buckets (id, name, public)
values ('products', 'products', false)
on conflict (id) do nothing;
