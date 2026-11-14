-- Execute depois de classificados.sql para habilitar os filtros estruturados de imóveis.
alter table public.classified_ads add column if not exists price_amount numeric(14,2);
alter table public.classified_ads add column if not exists city text not null default '';
alter table public.classified_ads add column if not exists neighborhood text not null default '';
alter table public.classified_ads add column if not exists property_type text not null default '';
alter table public.classified_ads add column if not exists bedrooms smallint;
alter table public.classified_ads add column if not exists parking_spaces smallint;

do $$ begin
    if not exists (select 1 from pg_constraint where conname = 'classified_ads_price_nonnegative') then
        alter table public.classified_ads add constraint classified_ads_price_nonnegative
            check (price_amount is null or price_amount >= 0);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'classified_ads_bedrooms_nonnegative') then
        alter table public.classified_ads add constraint classified_ads_bedrooms_nonnegative
            check (bedrooms is null or bedrooms >= 0);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'classified_ads_parking_nonnegative') then
        alter table public.classified_ads add constraint classified_ads_parking_nonnegative
            check (parking_spaces is null or parking_spaces >= 0);
    end if;
end $$;

create index if not exists classified_ads_real_estate_filters_idx
    on public.classified_ads (category, city, neighborhood, price_amount)
    where status = 'published';
