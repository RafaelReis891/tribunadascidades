-- Execute este arquivo no SQL Editor do Supabase antes de publicar os painéis.
-- Clientes podem se cadastrar; o painel geral libera conta, vagas por categoria e validade.

create table if not exists public.classified_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    role text not null default 'client' check (role in ('admin', 'client')),
    business_name text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.classified_clients (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    business_name text not null,
    logo_url text not null default '',
    email text not null,
    status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
    expires_at date,
    check (status <> 'active' or expires_at is not null),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.classified_client_slots (
    client_id uuid not null references public.classified_clients(id) on delete cascade,
    category text not null check (category in ('imoveis', 'carros-eletricos', 'motos-eletricas', 'comercios')),
    slots integer not null default 0 check (slots >= 0),
    primary key (client_id, category)
);

create table if not exists public.classified_ads (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.classified_clients(id) on delete cascade,
    advertiser_name text not null default '',
    advertiser_logo_url text not null default '',
    category text not null check (category in ('imoveis', 'carros-eletricos', 'motos-eletricas', 'comercios')),
    title text not null,
    description text not null default '',
    price text not null default '',
    price_amount numeric(14,2) check (price_amount is null or price_amount >= 0),
    original_price numeric(14,2) check (original_price is null or original_price >= 0),
    offer_ends_at date,
    product_category text not null default '',
    location text not null default '',
    city text not null default '',
    neighborhood text not null default '',
    property_type text not null default '',
    bedrooms smallint check (bedrooms is null or bedrooms >= 0),
    parking_spaces smallint check (parking_spaces is null or parking_spaces >= 0),
    whatsapp text not null default '',
    image_url text not null default '',
    image_urls text[] not null default '{}',
    status text not null default 'draft' check (status in ('draft', 'published')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.classified_ads add column if not exists advertiser_name text not null default '';
alter table public.classified_clients add column if not exists logo_url text not null default '';
alter table public.classified_ads add column if not exists advertiser_logo_url text not null default '';
alter table public.classified_ads add column if not exists image_urls text[] not null default '{}';
alter table public.classified_ads add column if not exists price_amount numeric(14,2);
alter table public.classified_ads add column if not exists original_price numeric(14,2);
alter table public.classified_ads add column if not exists offer_ends_at date;
alter table public.classified_ads add column if not exists product_category text not null default '';
do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'classified_ads_product_category_check') then
        alter table public.classified_ads add constraint classified_ads_product_category_check check (
            product_category in ('', 'alimentos', 'mercados', 'restaurantes', 'padarias', 'moda',
                'casa', 'eletronicos', 'beleza', 'saude', 'automotivo', 'pets', 'servicos', 'outros')
        );
    end if;
end $$;
alter table public.classified_ads add column if not exists city text not null default '';
alter table public.classified_ads add column if not exists neighborhood text not null default '';
alter table public.classified_ads add column if not exists property_type text not null default '';
alter table public.classified_ads add column if not exists bedrooms smallint;
alter table public.classified_ads add column if not exists parking_spaces smallint;
update public.classified_ads set image_urls = array[image_url]
where cardinality(image_urls) = 0 and image_url <> '';
update public.classified_ads a
set advertiser_name = c.business_name, advertiser_logo_url = c.logo_url
from public.classified_clients c
where a.client_id = c.id;
do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'classified_ads_max_six_photos') then
        alter table public.classified_ads add constraint classified_ads_max_six_photos
            check (cardinality(image_urls) <= 6);
    end if;
end $$;

create index if not exists classified_ads_category_status_idx
    on public.classified_ads (category, status, created_at desc);
create index if not exists classified_ads_real_estate_filters_idx
    on public.classified_ads (category, city, neighborhood, price_amount)
    where status = 'published';
create index if not exists classified_ads_client_category_idx
    on public.classified_ads (client_id, category, status);
create index if not exists classified_ads_commerce_filters_idx
    on public.classified_ads (product_category, city, price_amount, created_at desc)
    where category = 'comercios' and status = 'published';

create or replace function public.classified_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
    select 1 from public.classified_profiles p
    where p.id = auth.uid() and p.role = 'admin'
) $$;

create or replace function public.classified_my_client_id()
returns uuid language sql stable security definer set search_path = public
as $$ select c.id from public.classified_clients c where c.user_id = auth.uid() $$;

create or replace function public.classified_client_is_currently_active(p_client_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
    select 1 from public.classified_clients c
    where c.id = p_client_id and c.status = 'active'
      and c.expires_at is not null
      and c.expires_at >= (now() at time zone 'America/Sao_Paulo')::date
) $$;

-- Consulta própria do catálogo: não herda a exceção de leitura total do admin.
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

create or replace function public.classified_signup_bootstrap()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
    v_name text;
begin
    v_name := coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), split_part(new.email, '@', 1));
    insert into public.classified_profiles (id, role, business_name)
    values (new.id, 'client', v_name)
    on conflict (id) do nothing;
    insert into public.classified_clients (user_id, business_name, email, status)
    values (new.id, v_name, new.email, 'pending')
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists classified_auth_user_created on auth.users;
create trigger classified_auth_user_created
    after insert on auth.users
    for each row execute function public.classified_signup_bootstrap();

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

drop trigger if exists classified_ads_validate on public.classified_ads;
create trigger classified_ads_validate
    before insert or update on public.classified_ads
    for each row execute function public.classified_validate_ad();

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

create or replace function public.classified_enforce_slot_reduction()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
    with excess_ads as (
        select id, row_number() over (order by created_at asc, id asc) as slot_number
        from public.classified_ads
        where client_id = new.client_id and category = new.category and status = 'published'
    )
    update public.classified_ads a set status = 'draft'
    from excess_ads x where a.id = x.id and x.slot_number > new.slots;
    return new;
end;
$$;
drop trigger if exists classified_slots_enforce_limit on public.classified_client_slots;
create trigger classified_slots_enforce_limit after insert or update of slots on public.classified_client_slots
    for each row execute function public.classified_enforce_slot_reduction();

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

alter table public.classified_profiles enable row level security;
alter table public.classified_clients enable row level security;
alter table public.classified_client_slots enable row level security;
alter table public.classified_ads enable row level security;

drop policy if exists classified_profiles_read on public.classified_profiles;
create policy classified_profiles_read on public.classified_profiles for select to authenticated
    using (id = auth.uid() or public.classified_is_admin());

drop policy if exists classified_clients_read on public.classified_clients;
create policy classified_clients_read on public.classified_clients for select to authenticated
    using (user_id = auth.uid() or public.classified_is_admin());
drop policy if exists classified_clients_public_active on public.classified_clients;
drop policy if exists classified_clients_admin_all on public.classified_clients;
create policy classified_clients_admin_all on public.classified_clients for all to authenticated
    using (public.classified_is_admin()) with check (public.classified_is_admin());

drop policy if exists classified_slots_read on public.classified_client_slots;
create policy classified_slots_read on public.classified_client_slots for select to authenticated
    using (client_id = public.classified_my_client_id() or public.classified_is_admin());
drop policy if exists classified_slots_admin_all on public.classified_client_slots;
create policy classified_slots_admin_all on public.classified_client_slots for all to authenticated
    using (public.classified_is_admin()) with check (public.classified_is_admin());

-- Remova políticas antigas da tabela: permissive policies são combinadas com OR
-- e uma política pública antiga poderia ignorar o vencimento da conta.
do $$
declare v_policy record;
begin
    for v_policy in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = 'classified_ads'
    loop
        execute format('drop policy if exists %I on public.classified_ads', v_policy.policyname);
    end loop;
end $$;
create policy classified_ads_read on public.classified_ads for select to anon, authenticated
    using (
        client_id = public.classified_my_client_id()
        or public.classified_is_admin()
        or (
            status = 'published' and public.classified_client_is_currently_active(client_id)
        )
    );
create policy classified_ads_insert on public.classified_ads for insert to authenticated
    with check (client_id = public.classified_my_client_id() or public.classified_is_admin());
create policy classified_ads_update on public.classified_ads for update to authenticated
    using (client_id = public.classified_my_client_id() or public.classified_is_admin())
    with check (client_id = public.classified_my_client_id() or public.classified_is_admin());
create policy classified_ads_delete on public.classified_ads for delete to authenticated
    using (client_id = public.classified_my_client_id() or public.classified_is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.classified_ads to anon, authenticated;
grant insert, update, delete on public.classified_ads to authenticated;
grant select on public.classified_profiles, public.classified_clients, public.classified_client_slots to authenticated;
grant insert, update, delete on public.classified_clients, public.classified_client_slots to authenticated;

-- Para ativar o painel geral: crie sua conta em classificados-cadastro.html, confirme o e-mail,
-- localize seu UUID em public.classified_clients e execute uma vez:
-- update public.classified_profiles set role = 'admin' where id = 'UUID-DO-SEU-USUARIO';
-- O painel só libera clientes depois de você mudar status para active, definir expires_at e vagas.

-- Imagens ficam em bucket separado. O bucket é público para leitura dos anúncios publicados,
-- mas cada cliente só pode enviar arquivos para a pasta associada ao próprio usuário.
insert into storage.buckets (id, name, public)
values ('classified-images', 'classified-images', true)
on conflict (id) do nothing;

drop policy if exists classified_images_upload_own on storage.objects;
create policy classified_images_upload_own on storage.objects for insert to authenticated
    with check (
        bucket_id = 'classified-images'
        and (storage.foldername(name))[1] = 'classifieds'
        and (storage.foldername(name))[2] = auth.uid()::text
    );
drop policy if exists classified_images_update_own on storage.objects;
create policy classified_images_update_own on storage.objects for update to authenticated
    using (
        bucket_id = 'classified-images'
        and (storage.foldername(name))[1] = 'classifieds'
        and (storage.foldername(name))[2] = auth.uid()::text
    ) with check (
        bucket_id = 'classified-images'
        and (storage.foldername(name))[1] = 'classifieds'
        and (storage.foldername(name))[2] = auth.uid()::text
    );
drop policy if exists classified_images_delete_own on storage.objects;
create policy classified_images_delete_own on storage.objects for delete to authenticated
    using (
        bucket_id = 'classified-images'
        and (storage.foldername(name))[1] = 'classifieds'
        and (storage.foldername(name))[2] = auth.uid()::text
    );
