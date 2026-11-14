const CAMPOS_LISTAGEM = 'id,title,category,published_at';

function criarCardNoticia(noticia) {
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
    const acao = document.createElement('p');
    acao.className = 'news-teaser';
    const linkCompleto = document.createElement('a');
    linkCompleto.className = 'news-read-more';
    linkCompleto.href = link.href;
    linkCompleto.textContent = 'Leia a notícia completa →';
    acao.appendChild(linkCompleto);
    card.append(categoria, titulo, meta, acao);
    return card;
}

async function buscarMaisRecenteDaCategoria(nome) {
    const { data, error } = await db.from('articles')
        .select(CAMPOS_LISTAGEM).eq('status', 'Publicado')
        .ilike('category', `%${nome}%`).order('published_at', { ascending: false }).limit(1);
    if (error) throw error;
    return data?.[0];
}

async function carregarPortal() {
    const container = document.getElementById('news-container');
    try {
        const [adsResult, geralResult, mogi, estiva] = await Promise.all([
            db.from('ads').select('position,image_url,link_url,title').eq('is_active', true),
            db.from('articles').select(CAMPOS_LISTAGEM).eq('status', 'Publicado')
                .ilike('category', '%Geral%').order('published_at', { ascending: false }).limit(2),
            buscarMaisRecenteDaCategoria('Mogi Mirim'),
            buscarMaisRecenteDaCategoria('Estiva Gerbi')
        ]);
        if (geralResult.error) throw geralResult.error;
        if (adsResult.error) console.error('Erro ao carregar publicidades:', adsResult.error);
        renderizarPublicidades(adsResult.data || []);
        container.replaceChildren();
        if (!geralResult.data?.length) {
            container.textContent = 'Nenhuma notícia na categoria Geral no momento.';
        } else {
            geralResult.data.forEach(noticia => container.appendChild(criarCardNoticia(noticia)));
        }
        preencherMiniNoticia('sidebar-mogi-mirim', mogi, 'mogi-mirim');
        preencherMiniNoticia('sidebar-estiva', estiva, 'estiva-gerbi');
    } catch (erro) {
        console.error('Erro ao carregar portal:', erro);
        container.textContent = 'Erro ao carregar as notícias.';
    }
}

function preencherMiniNoticia(idElemento, noticia) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;
    elemento.replaceChildren();
    if (!noticia) { elemento.textContent = 'Nenhuma notícia recente.'; return; }
    const item = document.createElement('div');
    item.className = 'mini-news';
    const titulo = document.createElement('h5');
    const link = document.createElement('a');
    link.href = `noticia.html?id=${encodeURIComponent(noticia.id)}`;
    link.textContent = noticia.title || 'Notícia';
    titulo.appendChild(link);
    const data = document.createElement('span');
    data.className = 'data';
    data.textContent = `📅 ${new Date(noticia.published_at).toLocaleDateString('pt-BR')}`;
    item.append(titulo, data);
    elemento.appendChild(item);
}

function renderizarPublicidades(ads) {
    const posicoes = [
        ['top-banner', 'top_banner', 'Espaço publicitário - Anuncie aqui!'],
        ['footer-banner', 'footer_banner', 'Espaço publicitário - Anuncie aqui!'],
        ['sidebar-ad', 'sidebar', '300x250 - Publicidade']
    ];
    posicoes.forEach(([id, position, fallback]) => {
        const alvo = document.getElementById(id);
        if (!alvo) return;
        const ad = ads.find(item => item.position === position);
        alvo.replaceChildren();
        if (!ad) { alvo.textContent = fallback; return; }
        const link = document.createElement('a');
        link.href = ad.link_url || '#';
        if (ad.link_url && ad.link_url !== '#') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        const imagem = document.createElement('img');
        imagem.src = ad.image_url;
        imagem.alt = ad.title || 'Publicidade';
        imagem.loading = 'lazy';
        link.appendChild(imagem);
        alvo.appendChild(link);
    });
}

document.addEventListener('DOMContentLoaded', carregarPortal);
