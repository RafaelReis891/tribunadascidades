// Configuração de segurança do DOMPurify para permitir vídeos do YouTube
const configPurify = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height']
};

function getParameterByName(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

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

async function carregarCategoria() {
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
                
                // Aplica a configuração do DOMPurify que permite iframes (YouTube)
                const conteudoSeguro = DOMPurify.sanitize(noticia.content, configPurify);
                const conteudoResumido = conteudoSeguro.substring(0, 250) + '...';

                const card = document.createElement('div');
                card.className = 'news-card';
                card.innerHTML = `
                    <span class="categoria">${noticia.category}</span>
                    <h3><a href="#">${noticia.title}</a></h3>
                    <div class="meta">📅 ${dataFormatada} | ✍️ Tribuna das Cidades</div>
                    <div class="news-content">
                        <p>${conteudoResumido}</p>
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