-- Adiciona categoria própria para anúncios de motos elétricas.
alter table public.classified_client_slots
    drop constraint if exists classified_client_slots_category_check;
alter table public.classified_client_slots
    add constraint classified_client_slots_category_check
    check (category in ('imoveis', 'carros-eletricos', 'motos-eletricas', 'comercios'));

alter table public.classified_ads
    drop constraint if exists classified_ads_category_check;
alter table public.classified_ads
    add constraint classified_ads_category_check
    check (category in ('imoveis', 'carros-eletricos', 'motos-eletricas', 'comercios'));
