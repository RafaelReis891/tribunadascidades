const configPurify = {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height', 'class', 'style']
};

async function carregarNoticia() {
    const container = document.getElementById('article-container');
    const id = new URL(location.href).searchParams.get('id');
    if (!id) { container.textContent = 'Notícia não encontrada.'; return; }

    try {
        const { data, error } = await db.from('articles')
            .select('title,category,content,published_at')
            .eq('id', id).eq('status', 'Publicado').maybeSingle();
        if (error) throw error;
        if (!data) { container.textContent = 'Notícia não encontrada ou não publicada.'; return; }

        document.title = `${data.title} | Tribuna das Cidades`;
        const categoria = document.createElement('span');
        categoria.className = 'categoria'; categoria.textContent = data.category || 'Notícia';
        const titulo = document.createElement('h1'); titulo.textContent = data.title || 'Notícia';
        const meta = document.createElement('p');
        meta.className = 'article-meta';
        meta.textContent = `📅 ${new Date(data.published_at).toLocaleDateString('pt-BR')} | ✍️ Tribuna das Cidades`;
        const conteudo = document.createElement('div');
        conteudo.className = 'news-content';
        const htmlSeguro = DOMPurify.sanitize(data.content || '', configPurify);
        const documento = new DOMParser().parseFromString(htmlSeguro, 'text/html');
        documento.querySelectorAll('h1').forEach(elemento => {
            if (elemento.textContent.trim() === (data.title || '').trim()) elemento.remove();
        });
        documento.querySelectorAll('p').forEach(elemento => {
            const texto = elemento.textContent.trim();
            if (texto === data.category || texto.startsWith('Por Tribuna das Cidades |')) elemento.remove();
        });
        conteudo.innerHTML = documento.body.innerHTML;
        container.replaceChildren(categoria, titulo, meta, conteudo);
    } catch (error) {
        console.error('Erro ao carregar notícia:', error);
        container.textContent = 'Erro ao carregar a notícia. Tente novamente.';
    }
}

document.addEventListener('DOMContentLoaded', carregarNoticia);
