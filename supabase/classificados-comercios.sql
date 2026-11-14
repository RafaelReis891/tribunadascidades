-- Campos de produto, oferta semanal e índice para os filtros da vitrine.
begin;

alter table public.classified_ads
    add column if not exists product_category text not null default '',
    add column if not exists original_price numeric(14,2),
    add column if not exists offer_ends_at date;

alter table public.classified_ads
    drop constraint if exists classified_ads_product_category_check;
alter table public.classified_ads
    add constraint classified_ads_product_category_check check (
        product_category in ('', 'alimentos', 'mercados', 'restaurantes', 'padarias', 'moda',
            'casa', 'eletronicos', 'beleza', 'saude', 'automotivo', 'pets', 'servicos', 'outros')
    );

alter table public.classified_ads
    drop constraint if exists classified_ads_original_price_check;
alter table public.classified_ads
    add constraint classified_ads_original_price_check check (original_price is null or original_price >= 0);

create index if not exists classified_ads_commerce_filters_idx
    on public.classified_ads (product_category, city, price_amount, created_at desc)
    where category = 'comercios' and status = 'published';

-- Campos novos precisam permanecer intactos no caso especial de sincronização
-- de nome/logo feito pelo trigger de classified_clients.
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
    if tg_op = 'UPDATE' and auth.uid() is null
       and new.id = old.id and new.client_id = old.client_id
       and new.category = old.category and new.title = old.title
       and new.description = old.description and new.price = old.price
       and new.price_amount is not distinct from old.price_amount
       and new.original_price is not distinct from old.original_price
       and new.offer_ends_at is not distinct from old.offer_ends_at
       and new.product_category = old.product_category
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
        if coalesce(v_slots, 0) < 1 then
            raise exception 'Você não tem vagas liberadas nesta categoria.';
        end if;
        select count(*) into v_used from public.classified_ads a
            where a.client_id = v_client_id and a.category = new.category
              and a.status = 'published' and a.id is distinct from new.id;
        if v_used >= v_slots then
            raise exception 'Todas as vagas contratadas nesta categoria já estão ocupadas.';
        end if;
    end if;

    new.updated_at := now();
    return new;
end;
$$;

commit;
