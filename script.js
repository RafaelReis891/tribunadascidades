// Configuração de segurança do DOMPurify para permitir vídeos do YouTube
const configPurify = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height']
};

async function carregarPortal() {
    const containerPrincipal = document.getElementById('news-container');
    const sidebarMogi = document.getElementById('sidebar-mogi-mirim');
    const sidebarEstiva = document.getElementById('sidebar-estiva');

    try {
        // 1. Busca APENAS notícias da categoria "Geral", ordenadas por data, limitado a 2
        const { data: noticias, error } = await db
            .from('articles')
            .select('*')
            .eq('status', 'Publicado')
            .ilike('category', '%Geral%') // Filtra apenas quem tem "Geral" na categoria
            .order('published_at', { ascending: false })
            .limit(2); // Mostra apenas as 2 mais recentes

        if (error) throw error;

        containerPrincipal.innerHTML = ''; // Limpa o "Carregando..."

        if (!noticias || noticias.length === 0) {
            containerPrincipal.innerHTML = '<p style="padding:20px; background:white; border-radius:6px;">Nenhuma notícia na categoria Geral no momento.</p>';
        } else {
            noticias.forEach(noticia => {
                const dataFormatada = new Date(noticia.published_at).toLocaleDateString('pt-BR');
                
                // Aplica a configuração do DOMPurify que permite iframes (YouTube)
                const conteudoSeguro = DOMPurify.sanitize(noticia.content, configPurify);

                const card = document.createElement('div');
                card.className = 'news-card';
                card.innerHTML = `
                    <span class="categoria">${noticia.category}</span>
                    <h3><a href="#">${noticia.title}</a></h3>
                    <div class="meta">📅 ${dataFormatada} | ✍️ Tribuna das Cidades</div>
                    <div class="news-content">
                        ${conteudoSeguro}
                    </div>
                `;
                containerPrincipal.appendChild(card);
            });
        }

        // 2. Preenche a Sidebar (mantém a lógica de mostrar 1 notícia por cidade)
        // Para a sidebar, precisamos buscar todas as notícias, não só as "Geral"
        const { data: todasNoticias } = await db
            .from('articles')
            .select('*')
            .eq('status', 'Publicado')
            .order('published_at', { ascending: false });

        function preencherSidebar(elementoHTML, nomeExibicao) {
            if (!elementoHTML) return;
            const noticia = todasNoticias?.find(n => n.category.toLowerCase().includes(nomeExibicao.toLowerCase()));
            
            if (noticia) {
                const dataFormatada = new Date(noticia.published_at).toLocaleDateString('pt-BR');
                elementoHTML.innerHTML = `
                    <div class="mini-news">
                        <span class="categoria" style="font-size: 0.7rem; padding: 2px 6px; margin-bottom: 5px; display:inline-block;">${noticia.category}</span>
                        <h5><a href="categoria.html?cidade=${noticia.category.toLowerCase().replace(' ', '-')}">${noticia.title}</a></h5>
                        <span class="data">📅 ${dataFormatada}</span>
                    </div>
                `;
            } else {
                elementoHTML.innerHTML = '<p style="font-size:0.9rem; color:#6b7280; font-style:italic;">Nenhuma notícia recente.</p>';
            }
        }

        preencherSidebar(sidebarMogi, 'Mogi Mirim');
        preencherSidebar(sidebarEstiva, 'Estiva Gerbi');

    } catch (erro) {
        console.error('Erro ao carregar portal:', erro);
        containerPrincipal.innerHTML = '<p style="padding:20px; background:#fee2e2; color:#991b1b; border-radius:6px;">Erro ao carregar as notícias.</p>';
    }
}

document.addEventListener('DOMContentLoaded', carregarPortal);
