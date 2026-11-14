-- Migração para instalações que já executaram classificados.sql.
-- Também é seguro executar o classificados.sql atualizado em um projeto novo.

alter table public.classified_clients add column if not exists logo_url text not null default '';
alter table public.classified_ads add column if not exists advertiser_logo_url text not null default '';
alter table public.classified_ads add column if not exists image_urls text[] not null default '{}';
alter table public.classified_ads add column if not exists price_amount numeric(14,2);
alter table public.classified_ads add column if not exists city text not null default '';
alter table public.classified_ads add column if not exists neighborhood text not null default '';
alter table public.classified_ads add column if not exists property_type text not null default '';
alter table public.classified_ads add column if not exists bedrooms smallint;
alter table public.classified_ads add column if not exists parking_spaces smallint;

-- A migração roda pelo SQL Editor sem uma sessão de anunciante. Desative o gatilho
-- de autorização somente durante a cópia de dados antigos e reative-o logo depois.
alter table public.classified_ads disable trigger classified_ads_validate;
update public.classified_ads set image_urls = array[image_url]
where cardinality(image_urls) = 0 and image_url <> '';

update public.classified_ads a
set advertiser_name = c.business_name, advertiser_logo_url = c.logo_url
from public.classified_clients c where a.client_id = c.id;
alter table public.classified_ads enable trigger classified_ads_validate;

do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'classified_ads_max_six_photos') then
        alter table public.classified_ads add constraint classified_ads_max_six_photos
            check (cardinality(image_urls) <= 6);
    end if;
end $$;

create or replace function public.classified_validate_ad()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
    v_client public.classified_clients%rowtype;
    v_slots integer;
    v_used integer;
    v_client_id uuid;
    v_needs_slot_check boolean := false;
begin
    -- O SQL Editor não tem auth.uid(). Permita somente a sincronização dos campos
    -- de marca disparada pelo trigger de classified_clients, nunca alterações de conteúdo.
    if tg_op = 'UPDATE' and auth.uid() is null
       and new.id = old.id and new.client_id = old.client_id
       and new.category = old.category and new.title = old.title
       and new.description = old.description and new.price = old.price
       and new.price_amount is not distinct from old.price_amount
       and new.location = old.location and new.whatsapp = old.whatsapp
       and new.city = old.city and new.neighborhood = old.neighborhood
       and new.property_type = old.property_type
       and new.bedrooms is not distinct from old.bedrooms
       and new.parking_spaces is not distinct from old.parking_spaces
       and new.image_url = old.image_url and new.image_urls = old.image_urls
       and new.status = old.status and new.created_at = old.created_at
       and (new.advertiser_name is distinct from old.advertiser_name
            or new.advertiser_logo_url is distinct from old.advertiser_logo_url) then
        new.updated_at := now();
        return new;
    end if;

    if public.classified_is_admin() then
        new.updated_at := now();
        return new;
    end if;

    v_client_id := public.classified_my_client_id();
    if v_client_id is null or new.client_id <> v_client_id then
        raise exception 'Acesso negado para este anunciante.';
    end if;
    if tg_op = 'UPDATE' and old.client_id <> new.client_id then
        raise exception 'Não é permitido transferir um anúncio para outra conta.';
    end if;

    select c.business_name, c.logo_url into new.advertiser_name, new.advertiser_logo_url
    from public.classified_clients c where c.id = v_client_id;
    if tg_op = 'INSERT' then
        v_needs_slot_check := new.status = 'published';
    elsif new.status = 'published' then
        v_needs_slot_check := old.status is distinct from new.status or old.category is distinct from new.category;
    end if;

    if v_needs_slot_check then
        select * into v_client from public.classified_clients where id = v_client_id for update;
        if v_client.status <> 'active' or (v_client.expires_at is not null and v_client.expires_at < current_date) then
            raise exception 'Sua conta ainda não está liberada ou o prazo contratado terminou.';
        end if;
        select s.slots into v_slots from public.classified_client_slots s
            where s.client_id = v_client_id and s.category = new.category;
        if coalesce(v_slots, 0) < 1 then raise exception 'Você não tem vagas liberadas nesta categoria.'; end if;
        select count(*) into v_used from public.classified_ads a
            where a.client_id = v_client_id and a.category = new.category
              and a.status = 'published' and a.id is distinct from new.id;
        if v_used >= v_slots then raise exception 'Todas as vagas contratadas nesta categoria já estão ocupadas.'; end if;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

create or replace function public.classified_sync_advertiser_name()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
    if new.business_name is distinct from old.business_name or new.logo_url is distinct from old.logo_url then
        update public.classified_ads
        set advertiser_name = new.business_name, advertiser_logo_url = new.logo_url
        where client_id = new.id;
    end if;
    return new;
end;
$$;
drop trigger if exists classified_client_name_sync on public.classified_clients;
create trigger classified_client_name_sync after update of business_name, logo_url on public.classified_clients
    for each row execute function public.classified_sync_advertiser_name();

create or replace function public.classified_update_my_logo(p_logo_url text)
returns void language plpgsql security definer set search_path = public
as $$
begin
    if auth.uid() is null then raise exception 'É necessário entrar na conta.'; end if;
    if length(coalesce(p_logo_url, '')) > 2000 then raise exception 'Endereço de logo inválido.'; end if;
    update public.classified_clients set logo_url = coalesce(p_logo_url, '') where user_id = auth.uid();
    if not found then raise exception 'Conta de anunciante não encontrada.'; end if;
end;
$$;
grant execute on function public.classified_update_my_logo(text) to authenticated;
