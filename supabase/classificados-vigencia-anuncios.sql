-- Bloqueia anúncios de clientes pendentes, suspensos ou com contrato vencido.
-- Remove políticas antigas da tabela para impedir que uma regra permissiva
-- anterior continue liberando linhas (políticas permissivas são combinadas com OR).
begin;

create or replace function public.classified_client_is_currently_active(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.classified_clients c
        where c.id = p_client_id
          and c.status = 'active'
          and c.expires_at is not null
          and c.expires_at >= (now() at time zone 'America/Sao_Paulo')::date
    )
$$;

-- O catálogo usa esta função, que exige conta ativa e prazo vigente inclusive
-- quando quem navega está autenticado como administrador.
create or replace function public.classified_public_ads(p_category text)
returns setof public.classified_ads
language sql stable security definer set search_path = public
as $$
    select a.*
    from public.classified_ads a
    join public.classified_clients c on c.id = a.client_id
    where a.category = p_category
      and a.status = 'published'
      and c.status = 'active'
      and c.expires_at is not null
      and c.expires_at >= (now() at time zone 'America/Sao_Paulo')::date
    order by a.created_at desc
$$;
revoke all on function public.classified_public_ads(text) from public;
grant execute on function public.classified_public_ads(text) to anon, authenticated;

alter table public.classified_ads enable row level security;

do $$
declare v_policy record;
begin
    for v_policy in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = 'classified_ads'
    loop
        execute format('drop policy if exists %I on public.classified_ads', v_policy.policyname);
    end loop;
end
$$;

create policy classified_ads_read on public.classified_ads for select to anon, authenticated
    using (
        client_id = public.classified_my_client_id()
        or public.classified_is_admin()
        or (status = 'published' and public.classified_client_is_currently_active(client_id))
    );
create policy classified_ads_insert on public.classified_ads for insert to authenticated
    with check (client_id = public.classified_my_client_id() or public.classified_is_admin());
create policy classified_ads_update on public.classified_ads for update to authenticated
    using (client_id = public.classified_my_client_id() or public.classified_is_admin())
    with check (client_id = public.classified_my_client_id() or public.classified_is_admin());
create policy classified_ads_delete on public.classified_ads for delete to authenticated
    using (client_id = public.classified_my_client_id() or public.classified_is_admin());

commit;
