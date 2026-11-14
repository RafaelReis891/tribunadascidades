const TAMANHO_PAGINA = 10;
const CAMPOS_LISTAGEM = 'id,title,category,published_at';
const mapaCategorias = {
    'mogi-mirim': 'Mogi Mirim', 'mogi-guacu': 'Mogi Guaçu',
    'estiva-gerbi': 'Estiva Gerbi', itapira: 'Itapira',
    politica: 'Política', policial: 'Policial', saude: 'Saúde',
    esportes: 'Esportes', geral: 'Geral'
};

function montarCard(noticia) {
    const card = document.createElement('article');
    card.className = 'news-card';
    const categoria = document.createElement('span');
    categoria.className = 'categoria';
    categoria.textContent = noticia.category || 'Notícia';
    const titulo = document.createElement('h3');
    const link = document.createElement('a');
    link.href = `noticia.html?id=${encodeURIComponent(noticia.id)}`;
    link.textContent = noticia.title || 'Notícia sem título';
    titulo.appendChild(link);
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `📅 ${new Date(noticia.published_at).toLocaleDateString('pt-BR')} | ✍️ Tribuna das Cidades`;
    const chamada = document.createElement('p');
    chamada.className = 'news-teaser';
    const linkCompleto = document.createElement('a');
    linkCompleto.className = 'news-read-more';
    linkCompleto.href = link.href;
    linkCompleto.textContent = 'Leia a notícia completa →';
    chamada.appendChild(linkCompleto);
    card.append(categoria, titulo, meta, chamada);
    return card;
}

async function buscarMaisRecente(nome) {
    const { data, error } = await db.from('articles').select(CAMPOS_LISTAGEM)
        .eq('status', 'Publicado').ilike('category', `%${nome}%`)
        .order('published_at', { ascending: false }).limit(1);
    if (error) throw error;
    return data?.[0];
}

async function carregarPublicidades() {
    const { data, error } = await db.from('ads')
        .select('position,image_url,link_url,title').eq('is_active', true);
    if (error) throw error;
    const slots = [
        ['top-banner', 'top_banner', 'Espaço publicitário - Anuncie aqui!'],
        ['footer-banner', 'footer_banner', 'Espaço publicitário - Anuncie aqui!'],
        ['sidebar-ad', 'sidebar', '300x250 - Publicidade']
    ];
    slots.forEach(([id, position, fallback]) => {
        const alvo = document.getElementById(id);
        if (!alvo) return;
        const ad = data?.find(item => item.position === position);
        alvo.replaceChildren();
        if (!ad) { alvo.textContent = fallback; return; }
        const link = document.createElement('a');
        link.href = ad.link_url || '#';
        if (ad.link_url && ad.link_url !== '#') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        const img = document.createElement('img');
        img.src = ad.image_url; img.alt = ad.title || 'Publicidade'; img.loading = 'lazy';
        link.appendChild(img); alvo.appendChild(link);
    });
}

function preencherMini(id, noticia) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.replaceChildren();
    if (!noticia) { alvo.textContent = 'Nenhuma notícia recente.'; return; }
    const box = document.createElement('div'); box.className = 'mini-news';
    const titulo = document.createElement('h5');
    const link = document.createElement('a');
    link.href = `noticia.html?id=${encodeURIComponent(noticia.id)}`;
    link.textContent = noticia.title || 'Notícia'; titulo.appendChild(link);
    const data = document.createElement('span'); data.className = 'data';
    data.textContent = `📅 ${new Date(noticia.published_at).toLocaleDateString('pt-BR')}`;
    box.append(titulo, data); alvo.appendChild(box);
}

async function carregarCategoria() {
    const slug = new URL(location.href).searchParams.get('cidade');
    const nome = mapaCategorias[slug];
    const titulo = document.getElementById('categoria-titulo');
    const container = document.getElementById('news-container');
    if (!nome) {
        titulo.textContent = 'Categoria não encontrada';
        container.textContent = 'A categoria que você procurou não existe.';
        return;
    }
    titulo.textContent = nome;
    document.title = `${nome} | Tribuna das Cidades`;
    let inicio = 0;
    let carregando = false;
    let botaoMais;

    async function carregarLote() {
        if (carregando) return;
        carregando = true;
        if (botaoMais) { botaoMais.disabled = true; botaoMais.textContent = 'Carregando...'; }
        try {
            const fim = inicio + TAMANHO_PAGINA - 1;
            const { data, error } = await db.from('articles').select(CAMPOS_LISTAGEM)
                .eq('status', 'Publicado').ilike('category', `%${nome}%`)
                .order('published_at', { ascending: false }).range(inicio, fim);
            if (error) throw error;
            if (inicio === 0) container.replaceChildren();
            if (!data?.length && inicio === 0) container.textContent = `Nenhuma notícia publicada em ${nome} ainda.`;
            data?.forEach(item => container.insertBefore(montarCard(item), botaoMais));
            inicio += data?.length || 0;
            if (data?.length === TAMANHO_PAGINA) {
                if (!botaoMais) {
                    botaoMais = document.createElement('button');
                    botaoMais.className = 'load-more';
                    botaoMais.addEventListener('click', carregarLote);
                    container.appendChild(botaoMais);
                }
                botaoMais.disabled = false; botaoMais.textContent = 'Carregar mais notícias';
            } else if (botaoMais) { botaoMais.remove(); botaoMais = null; }
        } catch (error) {
            console.error('Erro ao carregar notícias:', error);
            if (inicio === 0) container.textContent = 'Erro ao carregar as notícias.';
            else if (botaoMais) { botaoMais.disabled = false; botaoMais.textContent = 'Tentar novamente'; }
        } finally { carregando = false; }
    }

    try {
        await Promise.all([
            carregarPublicidades(),
            carregarLote(),
            buscarMaisRecente('Mogi Mirim').then(n => preencherMini('sidebar-mogi-mirim', n)),
            buscarMaisRecente('Estiva Gerbi').then(n => preencherMini('sidebar-estiva', n))
        ]);
    } catch (error) { console.error('Erro ao carregar a página:', error); }
}

document.addEventListener('DOMContentLoaded', carregarCategoria);
