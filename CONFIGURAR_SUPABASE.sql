-- Execute uma vez no SQL Editor do projeto Supabase já usado pelo app.
-- Não apaga tabelas existentes. Cada conta acessa apenas seus próprios dados.
begin;
create table if not exists public.natugestao_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.natugestao_state enable row level security;
revoke all on public.natugestao_state from anon, authenticated;
grant select, insert, update on public.natugestao_state to authenticated;
drop policy if exists natugestao_owner on public.natugestao_state;
create policy natugestao_owner on public.natugestao_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.natugestao_save(p_data jsonb, p_expected_revision bigint)
returns table(revision bigint)
language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_revision bigint;
begin
  if v_uid is null then raise exception 'Autenticação necessária' using errcode = '28000'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'Dados inválidos' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.natugestao_state(user_id, data, revision)
    values (v_uid, p_data, 1) on conflict (user_id) do nothing
    returning natugestao_state.revision into v_revision;
  else
    update public.natugestao_state s
    set data = p_data, revision = s.revision + 1, updated_at = now()
    where s.user_id = v_uid and s.revision = p_expected_revision
    returning s.revision into v_revision;
  end if;
  if v_revision is null then raise exception 'Conflito de revisão' using errcode = '40001'; end if;
  return query select v_revision;
end;
$$;
revoke all on function public.natugestao_save(jsonb, bigint) from public, anon;
grant execute on function public.natugestao_save(jsonb, bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
