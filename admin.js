// ==========================================
// 1. INICIALIZAÇÃO DO EDITOR QUILL (TOOLBAR COMPLETA)
// ==========================================
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],       // Títulos H1, H2, H3
            ['bold', 'italic', 'underline', 'strike'], // Formatação de texto
            [{ 'color': [] }, { 'background': [] }],   // Cor do texto e fundo
            ['blockquote', 'code-block'],              // Citação e código
            [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Listas numeradas e marcadores
            [{ 'indent': '-1'}, { 'indent': '+1' }],   // Recuo
            [{ 'align': [] }],                          // Alinhamento
            ['link', 'image', 'video'],                 // Mídia
            ['clean']                                    // Remover formatação
        ]
    },
    placeholder: 'Digite o conteúdo da sua matéria aqui...'
});

// ==========================================
// 2. PREVIEW DA IMAGEM DE DESTAQUE (THUMBNAIL)
// ==========================================
const thumbnailInput = document.getElementById('thumbnail-input');
const thumbnailPreview = document.getElementById('thumbnail-preview');
let thumbnailUrl = ''; // Armazena a URL da imagem após o upload

thumbnailInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Mostra preview local enquanto faz upload
    const reader = new FileReader();
    reader.onload = (ev) => {
        thumbnailPreview.src = ev.target.result;
        thumbnailPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Faz upload para o Supabase Storage
    const statusMsg = document.getElementById('status-msg');
    statusMsg.className = 'info';
    statusMsg.textContent = '📤 Enviando imagem de destaque...';
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `thumbnails/${Date.now()}.${fileExt}`;
        
        const { error } = await db.storage
            .from('news-images')
            .upload(fileName, file);
            
        if (error) throw error;
        
        const { data } = db.storage.from('news-images').getPublicUrl(fileName);
        thumbnailUrl = data.publicUrl;
        
        statusMsg.className = 'success';
        statusMsg.textContent = '✅ Imagem de destaque pronta!';
    } catch (err) {
        console.error(err);
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Erro ao enviar imagem: ' + err.message;
    }
});

// ==========================================
// 3. UPLOAD DE IMAGENS DENTRO DO TEXTO (via botão do Quill)
// ==========================================
const fileInputInline = document.createElement('input');
fileInputInline.setAttribute('type', 'file');
fileInputInline.setAttribute('accept', 'image/*');
fileInputInline.style.display = 'none';
document.body.appendChild(fileInputInline);

document.querySelector('.ql-image').addEventListener('click', () => fileInputInline.click());

fileInputInline.addEventListener('change', async () => {
    const file = fileInputInline.files[0];
    if (!file) return;
    
    const statusMsg = document.getElementById('status-msg');
    statusMsg.className = 'info';
    statusMsg.textContent = '📤 Inserindo imagem no texto...';
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `inline/${Date.now()}.${fileExt}`;
        
        const { error } = await db.storage.from('news-images').upload(fileName, file);
        if (error) throw error;
        
        const { data } = db.storage.from('news-images').getPublicUrl(fileName);
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', data.publicUrl);
        
        statusMsg.className = 'success';
        statusMsg.textContent = '✅ Imagem inserida!';
        fileInputInline.value = '';
    } catch (err) {
        console.error(err);
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Erro: ' + err.message;
    }
});

// ==========================================
// FUNÇÃO SALVAR (Com DOMPurify configurado para vídeos)
// ==========================================
async function salvarNoticia(status) {
    const title = document.getElementById('title').value.trim();
    const subtitle = document.getElementById('subtitle').value.trim();
    const category = document.getElementById('category').value.trim();
    const btnPublish = document.getElementById('btn-publish');
    const btnDraft = document.getElementById('btn-draft');
    const statusMsg = document.getElementById('status-msg');
    
    if (!title) {
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Por favor, preencha o título.';
        return;
    }
    if (!category) {
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Por favor, defina uma categoria.';
        return;
    }
    
    // CONFIGURAÇÃO DO DOMPURIFY PARA PERMITIR VÍDEOS DO YOUTUBE
    const configPurify = {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height', 'class', 'style']
    };
    
    // Monta o HTML final: Categoria + Subtítulo + Conteúdo do Quill
    const categoriaHtml = `<p><span style="color: #b5121b; font-size: 13px; font-weight: bold; text-transform: uppercase;">${category}</span></p>`;
    const subtituloHtml = subtitle ? `<p><strong>${subtitle}</strong></p>` : '';
    const metaHtml = `<p><span style="color: #777777; font-size: 13px;">Por Tribuna das Cidades | ${new Date().toLocaleDateString('pt-BR')}</span></p>`;
    const thumbnailHtml = thumbnailUrl ? `<p><img src="${thumbnailUrl}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 15px 0;"></p>` : '';
    
    // Conteúdo do editor (limpo por segurança, mas PERMITINDO VÍDEOS)
    const conteudoBruto = quill.root.innerHTML;
    const conteudoLimpo = DOMPurify.sanitize(conteudoBruto, configPurify);
    
    // DEBUG: Mostra no console o que vai ser salvo (para você ver se o iframe está lá)
    console.log('HTML que será salvo:', conteudoLimpo);
    
    // Monta o HTML final como você pediu
    const htmlFinal = categoriaHtml + `<h1>${title}</h1>` + subtituloHtml + metaHtml + thumbnailHtml + conteudoLimpo;
    
    // Desabilita botões durante o salvamento
    btnPublish.disabled = true;
    btnDraft.disabled = true;
    statusMsg.className = 'info';
    statusMsg.textContent = '💾 Salvando notícia no banco de dados...';
    
    try {
        const { error } = await db
            .from('articles')
            .insert([{
                title: title,
                category: category,
                content: htmlFinal,
                status: status,
                published_at: new Date().toISOString()
            }]);
            
        if (error) throw error;
        
        statusMsg.className = 'success';
        statusMsg.textContent = status === 'Publicado' 
            ? '🎉 Notícia publicada com sucesso! Ela já aparece no portal.' 
            : '📝 Rascunho salvo! Você pode continuar editando.';
        
        // Limpa o formulário após 3 segundos se for publicação
        if (status === 'Publicado') {
            setTimeout(() => {
                document.getElementById('title').value = '';
                document.getElementById('subtitle').value = '';
                document.getElementById('category').value = '';
                quill.setContents([]);
                thumbnailPreview.style.display = 'none';
                thumbnailUrl = '';
                statusMsg.className = '';
                statusMsg.textContent = '';
                btnPublish.disabled = false;
                btnDraft.disabled = false;
            }, 3000);
        }
    } catch (err) {
        console.error(err);
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Erro ao salvar: ' + err.message;
    } finally {
        btnPublish.disabled = false;
        btnDraft.disabled = false;
    }
}

// Associa os botões
document.getElementById('btn-publish').addEventListener('click', () => salvarNoticia('Publicado'));
document.getElementById('btn-draft').addEventListener('click', () => salvarNoticia('Rascunho'));