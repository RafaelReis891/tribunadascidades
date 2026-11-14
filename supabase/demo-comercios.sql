-- 12 produtos/ofertas demonstrativas para 3 clientes de teste.
-- Primeiro crie os três usuários em classificados-cadastro.html com estes e-mails.
-- O Supabase precisa estar configurado para não exigir confirmação de e-mail.
-- Depois execute este arquivo no SQL Editor.
begin;

do $$
begin
    if (select count(*) from public.classified_clients
        where lower(email) in (
            'mercado.demo@tribunadascidades.test',
            'padaria.demo@tribunadascidades.test',
            'casaecia.demo@tribunadascidades.test'
        )) <> 3 then
        raise exception 'Crie primeiro os três usuários de teste indicados no começo deste arquivo.';
    end if;
end
$$;

-- O SQL Editor não possui a sessão de cada anunciante. A alteração é transacional.
alter table public.classified_ads disable trigger classified_ads_validate;

update public.classified_clients
set business_name = case lower(email)
        when 'mercado.demo@tribunadascidades.test' then 'Mercado Bom Vizinho (DEMO)'
        when 'padaria.demo@tribunadascidades.test' then 'Padaria Pão da Praça (DEMO)'
        when 'casaecia.demo@tribunadascidades.test' then 'Casa & Cia Mogi (DEMO)'
    end,
    status = 'active', expires_at = current_date + 90, updated_at = now()
where lower(email) in (
    'mercado.demo@tribunadascidades.test',
    'padaria.demo@tribunadascidades.test',
    'casaecia.demo@tribunadascidades.test'
);

delete from public.classified_ads
where client_id in (
    select id from public.classified_clients where lower(email) in (
        'mercado.demo@tribunadascidades.test',
        'padaria.demo@tribunadascidades.test',
        'casaecia.demo@tribunadascidades.test'
    )
) and title like '[DEMO COMERCIO]%';

insert into public.classified_client_slots (client_id, category, slots)
select id, 'comercios', 4
from public.classified_clients
where lower(email) in (
    'mercado.demo@tribunadascidades.test',
    'padaria.demo@tribunadascidades.test',
    'casaecia.demo@tribunadascidades.test'
)
on conflict (client_id, category) do update set slots = greatest(public.classified_client_slots.slots, excluded.slots);

with clientes as (
    select id, email, business_name, logo_url from public.classified_clients
    where lower(email) in (
        'mercado.demo@tribunadascidades.test',
        'padaria.demo@tribunadascidades.test',
        'casaecia.demo@tribunadascidades.test'
    )
), produtos (email, product_category, title, description, price, price_amount, original_price, offer_ends_at, image_url) as (
    values
    ('mercado.demo@tribunadascidades.test', 'mercados', 'Cesta de hortifruti da semana', 'DEMONSTRAÇÃO: seleção de frutas e verduras da estação.', 'R$ 49,90', 49.90, 64.90, current_date + 7, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80'),
    ('mercado.demo@tribunadascidades.test', 'alimentos', 'Café especial 500 g', 'DEMONSTRAÇÃO: café torrado e moído. Consulte disponibilidade na loja.', 'R$ 24,90', 24.90, 29.90, current_date + 5, 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80'),
    ('mercado.demo@tribunadascidades.test', 'mercados', 'Azeite extra virgem 500 ml', 'DEMONSTRAÇÃO: oferta válida enquanto durarem os estoques.', 'R$ 32,90', 32.90, 39.90, current_date + 7, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80'),
    ('mercado.demo@tribunadascidades.test', 'alimentos', 'Queijo meia cura — peça', 'DEMONSTRAÇÃO: produto regional. Peso e valor finais podem variar.', 'R$ 39,90', 39.90, null, null, 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80'),

    ('padaria.demo@tribunadascidades.test', 'padarias', 'Combo café da manhã', 'DEMONSTRAÇÃO: café, pão na chapa e suco. Consulte os itens disponíveis.', 'R$ 19,90', 19.90, 25.90, current_date + 6, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=80'),
    ('padaria.demo@tribunadascidades.test', 'padarias', 'Pão de fermentação natural', 'DEMONSTRAÇÃO: pão artesanal produzido pela manhã.', 'R$ 18,00', 18.00, null, null, 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=900&q=80'),
    ('padaria.demo@tribunadascidades.test', 'alimentos', 'Bolo caseiro inteiro', 'DEMONSTRAÇÃO: sabores disponíveis sob consulta.', 'R$ 34,90', 34.90, 39.90, current_date + 4, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'),
    ('padaria.demo@tribunadascidades.test', 'restaurantes', 'Salgados — cento', 'DEMONSTRAÇÃO: encomendas com antecedência. Consulte sabores e prazo.', 'R$ 89,00', 89.00, null, null, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80'),

    ('casaecia.demo@tribunadascidades.test', 'casa', 'Jogo de toalhas 4 peças', 'DEMONSTRAÇÃO: conjunto macio para banho, disponível em várias cores.', 'R$ 79,90', 79.90, 99.90, current_date + 7, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80'),
    ('casaecia.demo@tribunadascidades.test', 'casa', 'Vaso decorativo de cerâmica', 'DEMONSTRAÇÃO: peça decorativa. Consulte tamanhos e cores na loja.', 'R$ 45,00', 45.00, null, null, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=80'),
    ('casaecia.demo@tribunadascidades.test', 'casa', 'Luminária de mesa', 'DEMONSTRAÇÃO: luminária decorativa para quarto ou escritório.', 'R$ 69,90', 69.90, 84.90, current_date + 5, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80'),
    ('casaecia.demo@tribunadascidades.test', 'casa', 'Kit organizador para cozinha', 'DEMONSTRAÇÃO: kit com recipientes para organização doméstica.', 'R$ 39,90', 39.90, null, null, 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80')
)
insert into public.classified_ads (
    client_id, advertiser_name, advertiser_logo_url, category, product_category,
    title, description, price, price_amount, original_price, offer_ends_at,
    location, city, neighborhood, whatsapp, image_url, image_urls, status
)
select
    c.id, c.business_name, c.logo_url, 'comercios', p.product_category,
    '[DEMO COMERCIO] ' || p.title, p.description, p.price, p.price_amount,
    p.original_price, p.offer_ends_at, 'Mogi Mirim', 'Mogi Mirim', 'Centro',
    '', p.image_url, array[p.image_url], 'published'
from produtos p join clientes c on lower(c.email) = lower(p.email)
returning id, advertiser_name, product_category, title, price, offer_ends_at;

alter table public.classified_ads enable trigger classified_ads_validate;
commit;
