// Configuração de segurança do DOMPurify para permitir vídeos do YouTube
const configPurify = {
    ADD_TAGS: ['iframe', 'div'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height', 'class', 'style'],
    ADD_URI_SAFE_ATTR: ['src']
};

// Função para pegar parâmetros da URL
function getParameterByName(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

// Mapeia os slugs da URL para os nomes reais das categorias
const mapaCategorias = {
    'mogi-mirim': 'Mogi Mirim',
    'mogi-guacu': 'Mogi Guaçu',
    'estiva-gerbi': 'Estiva Gerbi',
    'itapira': 'Itapira',
    'politica': 'Política',
    'policial': 'Policial',
    'saude': 'Saúde',
    'esportes': 'Esportes',
    'geral': 'Geral'
};

// ==========================================
// ✅ NOVA FUNÇÃO: CARREGAR PUBLICIDADES
// ==========================================
async function carregarPublicidades() {
    try {
        const { data: ads, error } = await db
            .from('ads')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        if (!ads) return;

        // Banner Superior
        const topBanner = document.getElementById('top-banner');
        const adTop = ads.find(a => a.position === 'top_banner');
        if (adTop && topBanner) {
            topBanner.innerHTML = `
                <a href="${adTop.link_url}" target="_blank" title="${adTop.title || 'Publicidade'}">
                    <img src="${adTop.image_url}" alt="${adTop.title || 'Banner'}">
                </a>
            `;
        } else if (topBanner) {
            topBanner.innerHTML = '<p style="color: #64748b;">Espaço publicitário - Anuncie aqui!</p>';
        }

        // Banner Rodapé
        const footerBanner = document.getElementById('footer-banner');
        const adFooter = ads.find(a => a.position === 'footer_banner');
        if (adFooter && footerBanner) {
            footerBanner.innerHTML = `
                <a href="${adFooter.link_url}" target="_blank" title="${adFooter.title || 'Publicidade'}">
                    <img src="${adFooter.image_url}" alt="${adFooter.title || 'Banner'}">
                </a>
            `;
        } else if (footerBanner) {
            footerBanner.innerHTML = '<p style="color: #64748b;">Espaço publicitário - Anuncie aqui!</p>';
        }

        // Publicidade Sidebar
        const sidebarAd = document.getElementById('sidebar-ad');
        const adSidebar = ads.find(a => a.position === 'sidebar');
        if (adSidebar && sidebarAd) {
            sidebarAd.innerHTML = `
                <a href="${adSidebar.link_url}" target="_blank" title="${adSidebar.title || 'Publicidade'}">
                    <img src="${adSidebar.image_url}" alt="${adSidebar.title || 'Banner'}">
                </a>
            `;
        } else if (sidebarAd) {
            sidebarAd.innerHTML = '<p>300x250<br>Publicidade</p>';
        }

    } catch (error) {
        console.error('Erro ao carregar publicidades:', error);
    }
}

// ==========================================
// CARREGAR CONTEÚDO DA CATEGORIA
// ==========================================
async function carregarCategoria() {
    // ✅ CHAMA OS BANNERS PRIMEIRO
    await carregarPublicidades();
    
    const cidadeSlug = getParameterByName('cidade');
    const tituloPagina = document.getElementById('categoria-titulo');
    const container = document.getElementById('news-container');
    const sidebarMogi = document.getElementById('sidebar-mogi-mirim');
    const sidebarEstiva = document.getElementById('sidebar-estiva');

    if (!cidadeSlug || !mapaCategorias[cidadeSlug]) {
        tituloPagina.textContent = 'Categoria não encontrada';
        container.innerHTML = '<p style="padding:20px; background:white; border-radius:6px;">A categoria que você procurou não existe.</p>';
        return;
    }

    const nomeCategoria = mapaCategorias[cidadeSlug];
    tituloPagina.textContent = nomeCategoria;
    document.title = `${nomeCategoria} | Tribuna das Cidades`;

    try {
        const { data: todasNoticias, error } = await db
            .from('articles')
            .select('*')
            .eq('status', 'Publicado')
            .order('published_at', { ascending: false });

        if (error) throw error;

        const noticiasFiltradas = todasNoticias.filter(n => 
            n.category.toLowerCase().includes(nomeCategoria.toLowerCase())
        );

        container.innerHTML = '';

        if (!noticiasFiltradas || noticiasFiltradas.length === 0) {
            container.innerHTML = `<p style="padding:20px; background:white; border-radius:6px;">Nenhuma notícia publicada em ${nomeCategoria} ainda.</p>`;
        } else {
            noticiasFiltradas.forEach(noticia => {
                const dataFormatada = new Date(noticia.published_at).toLocaleDateString('pt-BR');
                const conteudoCompleto = DOMPurify.sanitize(noticia.content, configPurify);

                const card = document.createElement('div');
                card.className = 'news-card';
                card.innerHTML = `
                    <span class="categoria">${noticia.category}</span>
                    <h3><a href="#">${noticia.title}</a></h3>
                    <div class="meta">📅 ${dataFormatada} | ✍️ Tribuna das Cidades</div>
                    <div class="news-content">
                        ${conteudoCompleto}
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // Preenche a Sidebar
        function preencherSidebar(elementoHTML, slugCategoria, nomeExibicao) {
            const noticia = todasNoticias.find(n => n.category.toLowerCase().includes(nomeExibicao.toLowerCase()));
            if (noticia && elementoHTML) {
                const dataFormatada = new Date(noticia.published_at).toLocaleDateString('pt-BR');
                elementoHTML.innerHTML = `
                    <div class="mini-news">
                        <span class="categoria" style="font-size: 0.7rem; padding: 2px 6px; margin-bottom: 5px; display:inline-block;">${noticia.category}</span>
                        <h5><a href="categoria.html?cidade=${slugCategoria}">${noticia.title}</a></h5>
                        <span class="data">📅 ${dataFormatada}</span>
                    </div>
                `;
            } else if (elementoHTML) {
                elementoHTML.innerHTML = '<p style="font-size:0.9rem; color:#6b7280; font-style:italic;">Nenhuma notícia recente.</p>';
            }
        }

        preencherSidebar(sidebarMogi, 'mogi-mirim', 'Mogi Mirim');
        preencherSidebar(sidebarEstiva, 'estiva-gerbi', 'Estiva Gerbi');

    } catch (erro) {
        console.error('Erro ao carregar categoria:', erro);
        container.innerHTML = '<p style="padding:20px; background:#fee2e2; color:#991b1b; border-radius:6px;">Erro ao carregar as notícias.</p>';
    }
}

document.addEventListener('DOMContentLoaded', carregarCategoria);