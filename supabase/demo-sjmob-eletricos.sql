-- Dados demonstrativos: 5 carros elétricos e 5 motos elétricas para sjmob@email.com.
-- Execute depois de classificados-motos-eletricas.sql.
-- O script substitui somente anúncios demo anteriores com este mesmo prefixo.

begin;

do $$
begin
    if not exists (
        select 1 from public.classified_clients
        where lower(email) = lower('sjmob@email.com')
          and status = 'active'
          and (expires_at is null or expires_at >= current_date)
    ) then
        raise exception 'Não encontrei uma conta ativa e vigente para sjmob@email.com.';
    end if;
end
$$;

-- A operação administrativa é feita no SQL Editor, sem sessão do anunciante.
alter table public.classified_ads disable trigger classified_ads_validate;

delete from public.classified_ads
where client_id = (
    select id from public.classified_clients where lower(email) = lower('sjmob@email.com')
)
and title like '[DEMO SJMob]%';

-- Atualiza o contato dos anúncios existentes de carros e motos deste anunciante.
update public.classified_ads
set whatsapp = '1999999999'
where client_id = (
    select id from public.classified_clients where lower(email) = lower('sjmob@email.com')
)
and category in ('carros-eletricos', 'motos-eletricas');

-- Garante cinco vagas novas em cada categoria, sem reduzir as vagas que já existirem.
with cliente as (
    select id from public.classified_clients where lower(email) = lower('sjmob@email.com')
), categorias(category) as (
    values ('carros-eletricos'), ('motos-eletricas')
), publicados as (
    select a.category, count(*)::integer as quantidade
    from public.classified_ads a, cliente c
    where a.client_id = c.id and a.status = 'published'
      and a.category in ('carros-eletricos', 'motos-eletricas')
    group by a.category
)
insert into public.classified_client_slots (client_id, category, slots)
select cliente.id, categorias.category, coalesce(publicados.quantidade, 0) + 5
from cliente cross join categorias
left join publicados on publicados.category = categorias.category
on conflict (client_id, category)
do update set slots = greatest(public.classified_client_slots.slots, excluded.slots);

with cliente as (
    select id, business_name, logo_url
    from public.classified_clients where lower(email) = lower('sjmob@email.com')
), anuncios (
    category, title, description, price, price_amount, neighborhood, photos
) as (
    values
    (
        'carros-eletricos', '[DEMO SJMob] BYD Dolphin Mini',
        'ANÚNCIO DEMONSTRATIVO. Preço, disponibilidade e imagem são ilustrativos; confirme com a SJMob.',
        'R$ 120.000,00 (demo)', 120000.00, 'Centro (demo)',
        array['https://images.unsplash.com/photo-1704559920243-ef2b536da968?auto=format&fit=crop&w=1200&q=80']::text[]
    ),
    (
        'carros-eletricos', '[DEMO SJMob] BYD Dolphin',
        'ANÚNCIO DEMONSTRATIVO. Preço, disponibilidade e imagem são ilustrativos; confirme com a SJMob.',
        'R$ 160.000,00 (demo)', 160000.00, 'Bairro de Exemplo 02',
        array['https://images.unsplash.com/photo-1704559920243-ef2b536da968?auto=format&fit=crop&w=1200&q=80']::text[]
    ),
    (
        'carros-eletricos', '[DEMO SJMob] GWM ORA 03',
        'ANÚNCIO DEMONSTRATIVO. Preço, disponibilidade e imagem são ilustrativos; confirme com a SJMob.',
        'R$ 170.000,00 (demo)', 170000.00, 'Bairro de Exemplo 03',
        array['https://images.unsplash.com/photo-1704559920243-ef2b536da968?auto=format&fit=crop&w=1200&q=80']::text[]
    ),
    (
        'carros-eletricos', '[DEMO SJMob] Renault Kwid E-Tech',
        'ANÚNCIO DEMONSTRATIVO. Preço, disponibilidade e imagem são ilustrativos; confirme com a SJMob.',
        'R$ 100.000,00 (demo)', 100000.00, 'Bairro de Exemplo 04',
        array['https://images.unsplash.com/photo-1704559920243-ef2b536da968?auto=format&fit=crop&w=1200&q=80']::text[]
    ),
    (
        'carros-eletricos', '[DEMO SJMob] Volvo EX30',
        'ANÚNCIO DEMONSTRATIVO. Preço, disponibilidade e imagem são ilustrativos; confirme com a SJMob.',
        'R$ 250.000,00 (demo)', 250000.00, 'Bairro de Exemplo 05',
        array['https://images.unsplash.com/photo-1704559920243-ef2b536da968?auto=format&fit=crop&w=1200&q=80']::text[]
    ),
    (
        'motos-eletricas', '[DEMO SJMob] YADEA Keeness',
        'ANÚNCIO DEMONSTRATIVO. Modelo e imagem da linha oficial YADEA. Preço a partir de R$ 28.900; confirme disponibilidade e condições com a SJMob.',
        'A partir de R$ 28.900,00 (fabricante)', 28900.00, 'Centro (demo)',
        array['https://webcms.yadea.com.br/uploads/45_2keeness_c5420623d1.webp']::text[]
    ),
    (
        'motos-eletricas', '[DEMO SJMob] YADEA Owin',
        'ANÚNCIO DEMONSTRATIVO. Modelo e imagem da linha oficial YADEA. Preço a partir de R$ 13.900; confirme disponibilidade e condições com a SJMob.',
        'A partir de R$ 13.900,00 (fabricante)', 13900.00, 'Bairro de Exemplo 02',
        array['https://webcms.yadea.com.br/uploads/WOIN_d8747498ea.webp']::text[]
    ),
    (
        'motos-eletricas', '[DEMO SJMob] YADEA M6-H',
        'ANÚNCIO DEMONSTRATIVO. Modelo e imagem da linha oficial YADEA. Preço a partir de R$ 10.900; confirme disponibilidade e condições com a SJMob.',
        'A partir de R$ 10.900,00 (fabricante)', 10900.00, 'Bairro de Exemplo 03',
        array['https://webcms.yadea.com.br/uploads/45_2m6h_44354ad75a.webp']::text[]
    ),
    (
        'motos-eletricas', '[DEMO SJMob] YADEA GFX6',
        'ANÚNCIO DEMONSTRATIVO. Modelo e imagem da linha oficial YADEA. Preço a partir de R$ 12.900; confirme disponibilidade e condições com a SJMob.',
        'A partir de R$ 12.900,00 (fabricante)', 12900.00, 'Bairro de Exemplo 04',
        array['https://webcms.yadea.com.br/uploads/45_2gfx6_7255b364d4.webp']::text[]
    ),
    (
        'motos-eletricas', '[DEMO SJMob] YADEA GB60',
        'ANÚNCIO DEMONSTRATIVO. Modelo e imagem da linha oficial YADEA. Preço a partir de R$ 7.900; confirme disponibilidade e condições com a SJMob.',
        'A partir de R$ 7.900,00 (fabricante)', 7900.00, 'Bairro de Exemplo 05',
        array['https://webcms.yadea.com.br/uploads/45_2_GB_60_c92a920fb7.webp']::text[]
    )
)
insert into public.classified_ads (
    client_id, advertiser_name, advertiser_logo_url, category,
    title, description, price, price_amount, location, city, neighborhood,
    property_type, bedrooms, parking_spaces, whatsapp,
    image_url, image_urls, status
)
select
    cliente.id, coalesce(nullif(cliente.business_name, ''), 'SJMob'), cliente.logo_url,
    anuncios.category, anuncios.title, anuncios.description, anuncios.price,
    anuncios.price_amount, anuncios.neighborhood || ' • Mogi Mirim', 'Mogi Mirim',
    anuncios.neighborhood, '', null, null, '1999999999', anuncios.photos[1], anuncios.photos, 'published'
from cliente cross join anuncios
returning id, category, title, price, status;

alter table public.classified_ads enable trigger classified_ads_validate;

commit;
