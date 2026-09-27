create table public.saved_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('walkthrough', 'comparison')),
  title text not null check (char_length(title) between 1 and 160 and title = btrim(title)),
  data jsonb not null check (octet_length(data::text) <= 262144),
  created_at timestamptz not null default now()
);

create index saved_projects_owner_created_idx on public.saved_projects (owner_id, created_at desc);

alter table public.saved_projects enable row level security;

revoke all on public.saved_projects from public, anon, authenticated;
grant select, delete on public.saved_projects to authenticated;
grant insert (kind, title, data) on public.saved_projects to authenticated;

create policy saved_projects_owner_select on public.saved_projects
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy saved_projects_owner_insert on public.saved_projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy saved_projects_owner_delete on public.saved_projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

create schema if not exists housing_private;
revoke all on schema housing_private from public, anon, authenticated, service_role;
grant usage on schema housing_private to service_role;

create table housing_private.ai_request_reservations (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  reserved_at timestamptz not null
);

create index ai_request_reservations_time_idx on housing_private.ai_request_reservations (reserved_at);
create index ai_request_reservations_owner_time_idx on housing_private.ai_request_reservations (owner_id, reserved_at);

alter table housing_private.ai_request_reservations enable row level security;
revoke all on housing_private.ai_request_reservations from public, anon, authenticated, service_role;

create function housing_private.reserve_ai_request_internal(p_user_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  reservation_time timestamptz;
begin
  if p_user_id is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(270926, 1);
  reservation_time := pg_catalog.clock_timestamp();

  if (select count(*) from housing_private.ai_request_reservations
      where reserved_at > reservation_time - interval '1 minute') >= 3 then
    return false;
  end if;

  if (select count(*) from housing_private.ai_request_reservations
      where owner_id = p_user_id and reserved_at > reservation_time - interval '1 minute') >= 3 then
    return false;
  end if;

  if (select count(*) from housing_private.ai_request_reservations
      where reserved_at > reservation_time - interval '7 days') >= 300 then
    return false;
  end if;

  if (select count(*) from housing_private.ai_request_reservations) >= 1000 then
    return false;
  end if;

  insert into housing_private.ai_request_reservations (owner_id, reserved_at)
  values (p_user_id, reservation_time);
  return true;
end;
$$;

revoke execute on function housing_private.reserve_ai_request_internal(uuid) from public, anon, authenticated, service_role;
grant execute on function housing_private.reserve_ai_request_internal(uuid) to service_role;

create function public.reserve_ai_request(p_user_id uuid)
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select housing_private.reserve_ai_request_internal(p_user_id);
$$;

revoke execute on function public.reserve_ai_request(uuid) from public, anon, authenticated, service_role;
grant execute on function public.reserve_ai_request(uuid) to service_role;
