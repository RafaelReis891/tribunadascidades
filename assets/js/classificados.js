const CATEGORIAS_CLASSIFICADOS = {
    imoveis: 'Imóveis',
    'carros-eletricos': 'Carros Elétricos',
    'motos-eletricas': 'Motos Elétricas',
    comercios: 'Comércios'
};
const CATEGORIAS_COMERCIO = {
    alimentos: 'Alimentos e bebidas', mercados: 'Mercados e mercearias',
    restaurantes: 'Restaurantes e lanchonetes', padarias: 'Padarias e cafés',
    moda: 'Moda e acessórios', casa: 'Casa e decoração',
    eletronicos: 'Eletrônicos', beleza: 'Beleza e cuidados',
    saude: 'Saúde e bem-estar', automotivo: 'Automotivo',
    pets: 'Pets', servicos: 'Serviços', outros: 'Outros'
};

function montarAnuncio(anuncio) {
    const card = document.createElement('article');
    card.className = 'classified-card';
    card.dataset.clientId = anuncio.client_id;
    card.dataset.city = anuncio.city || '';
    card.dataset.neighborhood = anuncio.neighborhood || '';
    card.dataset.propertyType = anuncio.property_type || '';
    card.dataset.bedrooms = anuncio.bedrooms ?? '';
    card.dataset.parking = anuncio.parking_spaces ?? '';
    card.dataset.price = obterPrecoNumerico(anuncio) ?? '';
    card.dataset.productCategory = anuncio.product_category || '';
    card.dataset.search = `${anuncio.title || ''} ${anuncio.description || ''} ${anuncio.advertiser_name || ''}`.toLocaleLowerCase('pt-BR');
    card.dataset.offerEnds = anuncio.offer_ends_at || '';
    card.dataset.created = new Date(anuncio.created_at).getTime() || 0;
    const fotos = anuncio.image_urls?.length ? anuncio.image_urls : (anuncio.image_url ? [anuncio.image_url] : []);
    if (fotos.length) {
        const gallery = document.createElement('div'); gallery.className = 'classified-gallery';
        const hero = document.createElement('img'); hero.className = 'classified-hero'; hero.src = fotos[0]; hero.alt = anuncio.title; hero.loading = 'lazy';
        gallery.appendChild(hero);
        if (fotos.length > 1) {
            const thumbs = document.createElement('div'); thumbs.className = 'classified-thumbnails';
            fotos.forEach((url, index) => {
                const thumb = document.createElement('button'); thumb.type = 'button'; thumb.setAttribute('aria-label', `Ver foto ${index + 1}`);
                const image = document.createElement('img'); image.src = url; image.alt = ''; image.loading = 'lazy';
                thumb.appendChild(image);
                thumb.addEventListener('click', () => { hero.src = url; hero.alt = `${anuncio.title} — foto ${index + 1}`; });
                thumbs.appendChild(thumb);
            });
            gallery.appendChild(thumbs);
        }
        card.appendChild(gallery);
    }
    const corpo = document.createElement('div'); corpo.className = 'classified-card-body';
    const titulo = document.createElement('h3'); titulo.textContent = anuncio.title;
    corpo.appendChild(titulo);
    if (anuncio.category === 'comercios' && anuncio.product_category) {
        const tag = document.createElement('span'); tag.className = 'commerce-product-tag'; tag.textContent = CATEGORIAS_COMERCIO[anuncio.product_category] || anuncio.product_category; corpo.appendChild(tag);
    }
    if (anuncio.offer_ends_at && anuncio.offer_ends_at >= new Date().toISOString().slice(0, 10)) {
        const offer = document.createElement('span'); offer.className = 'commerce-offer-tag'; offer.textContent = 'Oferta especial'; corpo.appendChild(offer);
    }
    const ofertaExpirada = anuncio.category === 'comercios' && anuncio.offer_ends_at && anuncio.offer_ends_at < new Date().toISOString().slice(0, 10);
    const precoExibido = ofertaExpirada && anuncio.original_price
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(anuncio.original_price)
        : anuncio.price;
    if (precoExibido) { const preco = document.createElement('p'); preco.className = 'classified-price'; preco.textContent = precoExibido; corpo.appendChild(preco); }
    if (!ofertaExpirada && anuncio.category === 'comercios' && anuncio.original_price && Number(anuncio.original_price) > Number(anuncio.price_amount || 0)) {
        const oldPrice = document.createElement('p'); oldPrice.className = 'commerce-original-price';
        oldPrice.textContent = `De ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(anuncio.original_price)}`;
        corpo.insertBefore(oldPrice, corpo.querySelector('.classified-price'));
    }
    const localTexto = [anuncio.neighborhood, anuncio.city].filter(Boolean).join(' • ') || anuncio.location;
    if (localTexto) { const local = document.createElement('p'); local.className = 'classified-location'; local.textContent = localTexto; corpo.appendChild(local); }
    const detalhes = [anuncio.property_type, anuncio.bedrooms ? `${anuncio.bedrooms} quarto(s)` : '', anuncio.parking_spaces ? `${anuncio.parking_spaces} vaga(s)` : ''].filter(Boolean).join(' • ');
    if (detalhes) { const facts = document.createElement('p'); facts.className = 'classified-facts'; facts.textContent = detalhes; corpo.appendChild(facts); }
    const descricao = document.createElement('p'); descricao.className = 'classified-description'; descricao.textContent = anuncio.description; corpo.appendChild(descricao);
    const anunciante = document.createElement('div'); anunciante.className = 'classified-advertiser';
    if (anuncio.advertiser_logo_url) { const logo = document.createElement('img'); logo.src = anuncio.advertiser_logo_url; logo.alt = ''; logo.loading = 'lazy'; anunciante.appendChild(logo); }
    const brand = document.createElement('span'); brand.textContent = anuncio.advertiser_name || 'Anunciante'; anunciante.appendChild(brand); corpo.appendChild(anunciante);
    if (anuncio.whatsapp) {
        const telefone = anuncio.whatsapp.replace(/\D/g, '');
        if (telefone) {
            const contato = document.createElement('a'); contato.className = 'classified-contact';
            contato.href = `https://wa.me/${telefone}`; contato.target = '_blank'; contato.rel = 'noopener noreferrer';
            contato.textContent = 'Conversar pelo WhatsApp'; corpo.appendChild(contato);
        }
    }
    card.appendChild(corpo);
    return card;
}

function obterPrecoNumerico(anuncio) {
    if (anuncio.category === 'comercios' && anuncio.offer_ends_at && anuncio.offer_ends_at < new Date().toISOString().slice(0, 10) && anuncio.original_price != null) {
        return Number(anuncio.original_price);
    }
    if (anuncio.price_amount !== null && anuncio.price_amount !== undefined) return Number(anuncio.price_amount);
    if (!anuncio.price) return null;
    let texto = anuncio.price.replace(/[^0-9,.-]/g, '');
    if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) texto = texto.replace(/\./g, '');
    const valor = Number(texto);
    return Number.isFinite(valor) ? valor : null;
}

function preencherFiltro(select, values, allLabel) {
    select.replaceChildren();
    const all = document.createElement('option'); all.value = 'all'; all.textContent = allLabel; select.appendChild(all);
    [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.appendChild(option); });
}

async function carregarClassificados() {
    const slug = new URL(location.href).searchParams.get('categoria');
    const nome = CATEGORIAS_CLASSIFICADOS[slug];
    const titulo = document.getElementById('classifieds-title');
    const container = document.getElementById('classifieds-container');
    const filterControl = document.querySelector('.classifieds-controls');
    const advertiserFilter = document.getElementById('advertiser-filter');
    const propertyFilters = document.getElementById('real-estate-filters');
    const commerceFilters = document.getElementById('commerce-filters');
    const commerceChips = document.getElementById('commerce-category-chips');
    if (!nome) { titulo.textContent = 'Categoria não encontrada'; container.textContent = 'Escolha uma categoria no menu.'; return; }
    titulo.textContent = nome;
    document.title = `${nome} | Classificados - Tribuna das Cidades`;
    propertyFilters.hidden = slug !== 'imoveis';
    commerceFilters.hidden = slug !== 'comercios';
    commerceChips.hidden = slug !== 'comercios';
    document.getElementById('classifieds-container').classList.toggle('commerce-grid', slug === 'comercios');
    const { data, error } = await db.rpc('classified_public_ads', { p_category: slug })
        .order('created_at', { ascending: false }).limit(1000);
    container.replaceChildren();
    if (error) { console.error(error); container.textContent = 'Não foi possível carregar os anúncios.'; filterControl.hidden = true; return; }
    if (!data?.length) { container.textContent = 'Ainda não há anúncios publicados nesta categoria.'; filterControl.hidden = true; return; }
    const cards = data.map(ad => ({ ad, element: montarAnuncio(ad), price: obterPrecoNumerico(ad) }));
    const advertisers = new Map();
    data.forEach(item => advertisers.set(item.client_id, item.advertiser_name || 'Anunciante'));
    advertiserFilter.replaceChildren();
    const allAdvertisers = document.createElement('option'); allAdvertisers.value = 'all'; allAdvertisers.textContent = 'Todos os anunciantes'; advertiserFilter.appendChild(allAdvertisers);
    [...advertisers.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).forEach(([id, name]) => {
        const option = document.createElement('option'); option.value = id; option.textContent = name; advertiserFilter.appendChild(option);
    });
    filterControl.hidden = advertisers.size < 2 && slug !== 'imoveis' && slug !== 'comercios';
    preencherFiltro(document.getElementById('city-filter'), data.map(ad => ad.city), 'Todas');
    preencherFiltro(document.getElementById('property-type-filter'), data.map(ad => ad.property_type), 'Todos');
    const commerceCategoryFilter = document.getElementById('commerce-category-filter');
    const commerceCityFilter = document.getElementById('commerce-city-filter');
    const commerceNeighborhoodFilter = document.getElementById('commerce-neighborhood-filter');
    preencherFiltro(commerceCityFilter, data.map(ad => ad.city), 'Todas as cidades');
    function refreshCommerceNeighborhoods() {
        const current = commerceNeighborhoodFilter.value;
        const selectedCity = commerceCityFilter.value;
        preencherFiltro(commerceNeighborhoodFilter, data
            .filter(ad => selectedCity === 'all' || ad.city === selectedCity)
            .map(ad => ad.neighborhood), 'Todos os bairros');
        if ([...commerceNeighborhoodFilter.options].some(option => option.value === current)) commerceNeighborhoodFilter.value = current;
    }
    refreshCommerceNeighborhoods();
    preencherFiltro(commerceCategoryFilter, data.map(ad => CATEGORIAS_COMERCIO[ad.product_category] || ad.product_category), 'Todas as categorias');
    const commerceCategoryValues = [...new Set(data.map(ad => ad.product_category).filter(Boolean))];
    commerceChips.replaceChildren();
    const allChip = document.createElement('button'); allChip.type = 'button'; allChip.className = 'active'; allChip.textContent = 'Tudo'; allChip.dataset.category = 'all'; commerceChips.appendChild(allChip);
    commerceCategoryValues.sort((a, b) => (CATEGORIAS_COMERCIO[a] || a).localeCompare(CATEGORIAS_COMERCIO[b] || b, 'pt-BR')).forEach(category => {
        const chip = document.createElement('button'); chip.type = 'button'; chip.dataset.category = CATEGORIAS_COMERCIO[category] || category; chip.textContent = CATEGORIAS_COMERCIO[category] || category; commerceChips.appendChild(chip);
    });

    const cityFilter = document.getElementById('city-filter');
    const neighborhoodFilter = document.getElementById('neighborhood-filter');
    function refreshNeighborhoods() {
        const current = neighborhoodFilter.value;
        const city = cityFilter.value;
        const neighborhoods = data.filter(ad => city === 'all' || ad.city === city).map(ad => ad.neighborhood);
        preencherFiltro(neighborhoodFilter, neighborhoods, 'Todos');
        if ([...neighborhoodFilter.options].some(option => option.value === current)) neighborhoodFilter.value = current;
    }
    refreshNeighborhoods();

    const filters = [advertiserFilter, cityFilter, neighborhoodFilter,
        document.getElementById('property-type-filter'), document.getElementById('bedrooms-filter'),
        document.getElementById('parking-filter'), document.getElementById('sort-filter'),
        document.getElementById('price-min-filter'), document.getElementById('price-max-filter')];
    function applyFilters() {
        const min = document.getElementById('price-min-filter').value === '' ? null : Number(document.getElementById('price-min-filter').value);
        const max = document.getElementById('price-max-filter').value === '' ? null : Number(document.getElementById('price-max-filter').value);
        const bedroomMin = document.getElementById('bedrooms-filter').value === 'all' ? null : Number(document.getElementById('bedrooms-filter').value);
        const parkingMin = document.getElementById('parking-filter').value === 'all' ? null : Number(document.getElementById('parking-filter').value);
        const commerceMin = document.getElementById('commerce-price-min').value === '' ? null : Number(document.getElementById('commerce-price-min').value);
        const commerceMax = document.getElementById('commerce-price-max').value === '' ? null : Number(document.getElementById('commerce-price-max').value);
        const commerceSearch = document.getElementById('commerce-search').value.trim().toLocaleLowerCase('pt-BR');
        const filtered = cards.filter(({ ad, price }) =>
            (advertiserFilter.value === 'all' || ad.client_id === advertiserFilter.value) &&
            (cityFilter.value === 'all' || ad.city === cityFilter.value) &&
            (neighborhoodFilter.value === 'all' || ad.neighborhood === neighborhoodFilter.value) &&
            (document.getElementById('property-type-filter').value === 'all' || ad.property_type === document.getElementById('property-type-filter').value) &&
            (bedroomMin === null || Number(ad.bedrooms || 0) >= bedroomMin) &&
            (parkingMin === null || Number(ad.parking_spaces || 0) >= parkingMin) &&
            (min === null || (price !== null && price >= min)) &&
            (max === null || (price !== null && price <= max)) &&
            (slug !== 'comercios' || (
                (commerceCategoryFilter.value === 'all' || (CATEGORIAS_COMERCIO[ad.product_category] || ad.product_category) === commerceCategoryFilter.value) &&
                (commerceCityFilter.value === 'all' || ad.city === commerceCityFilter.value) &&
                (commerceNeighborhoodFilter.value === 'all' || ad.neighborhood === commerceNeighborhoodFilter.value) &&
                (!commerceSearch || `${ad.title || ''} ${ad.description || ''} ${ad.advertiser_name || ''}`.toLocaleLowerCase('pt-BR').includes(commerceSearch)) &&
                (commerceMin === null || (price !== null && price >= commerceMin)) &&
                (commerceMax === null || (price !== null && price <= commerceMax))
            ))
        );
        const sort = document.getElementById('sort-filter').value;
        const commerceSort = document.getElementById('commerce-sort').value;
        filtered.sort((a, b) => slug === 'comercios' && commerceSort === 'offer'
            ? Number(Boolean(b.ad.offer_ends_at && b.ad.offer_ends_at >= new Date().toISOString().slice(0, 10))) - Number(Boolean(a.ad.offer_ends_at && a.ad.offer_ends_at >= new Date().toISOString().slice(0, 10))) || new Date(b.ad.created_at) - new Date(a.ad.created_at)
            : slug === 'comercios' && commerceSort === 'price-asc' ? ((a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE))
            : slug === 'comercios' && commerceSort === 'price-desc' ? ((b.price ?? -1) - (a.price ?? -1))
            : sort === 'price-asc'
            ? ((a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE))
            : sort === 'price-desc' ? ((b.price ?? -1) - (a.price ?? -1))
            : new Date(b.ad.created_at) - new Date(a.ad.created_at));
        container.replaceChildren();
        if (!filtered.length) { container.textContent = 'Nenhum anúncio corresponde aos filtros selecionados.'; }
        else filtered.forEach(item => container.appendChild(item.element));
        document.getElementById('classified-results-count').textContent = `${filtered.length} anúncio(s)`;
    }
    cityFilter.addEventListener('change', () => { refreshNeighborhoods(); applyFilters(); });
    filters.forEach(filter => filter.addEventListener('input', applyFilters));
    filters.forEach(filter => filter.addEventListener('change', applyFilters));
    commerceCityFilter.addEventListener('change', () => { refreshCommerceNeighborhoods(); applyFilters(); });
    [commerceCategoryFilter, commerceCityFilter, commerceNeighborhoodFilter, document.getElementById('commerce-search'),
        document.getElementById('commerce-price-min'), document.getElementById('commerce-price-max'), document.getElementById('commerce-sort')]
        .forEach(filter => { filter.addEventListener('input', applyFilters); filter.addEventListener('change', applyFilters); });
    commerceChips.addEventListener('click', event => {
        const button = event.target.closest('button[data-category]'); if (!button) return;
        commerceCategoryFilter.value = button.dataset.category;
        commerceChips.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
        applyFilters();
    });
    applyFilters();
}

document.addEventListener('DOMContentLoaded', carregarClassificados);
