// ==========================================
// CARREGAR LISTA DE PUBLICIDADES
// ==========================================
async function carregarListaAds() {
    const container = document.getElementById('ads-container');
    
    try {
        const { data: ads, error } = await db
            .from('ads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = '';

        if (!ads || ads.length === 0) {
            container.innerHTML = '<p style="color: #6b7280; font-style: italic;">Nenhuma publicidade cadastrada ainda.</p>';
            return;
        }

        const posicoesNomes = {
            'top_banner': 'Banner Superior',
            'sidebar': 'Sidebar 300x250',
            'footer_banner': 'Banner Rodapé'
        };

        ads.forEach(ad => {
            const item = document.createElement('div');
            item.className = 'ad-item';
            item.innerHTML = `
                <img src="${ad.image_url}" alt="${ad.title}">
                <div class="ad-item-info">
                    <h4>${ad.title || 'Sem título'}</h4>
                    <p><strong>Posição:</strong> ${posicoesNomes[ad.position] || ad.position}</p>
                    <p><strong>Status:</strong> ${ad.is_active ? '✅ Ativo' : '❌ Inativo'}</p>
                    <p><strong>Link:</strong> <a href="${ad.link_url}" target="_blank" style="color: #dc2626;">${ad.link_url}</a></p>
                </div>
                <div class="ad-item-actions">
                    <button onclick="toggleAd('${ad.id}', ${!ad.is_active})" class="btn ${ad.is_active ? 'btn-danger' : 'btn-success'}">
                        ${ad.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onclick="excluirAd('${ad.id}')" class="btn btn-danger">🗑️ Excluir</button>
                </div>
            `;
            container.appendChild(item);
        });

    } catch (error) {
        console.error('Erro ao carregar publicidades:', error);
        container.innerHTML = '<p style="color: #ef4444;">Erro ao carregar publicidades.</p>';
    }
}

// ==========================================
// ADICIONAR NOVA PUBLICIDADE
// ==========================================
document.getElementById('btn-add-ad').addEventListener('click', async () => {
    const position = document.getElementById('ad-position').value;
    const title = document.getElementById('ad-title').value.trim();
    const link = document.getElementById('ad-link').value.trim() || '#';
    const fileInput = document.getElementById('ad-image');
    const statusMsg = document.getElementById('status-msg');
    
    if (!fileInput.files[0]) {
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Por favor, selecione uma imagem.';
        return;
    }

    statusMsg.className = 'info';
    statusMsg.textContent = '📤 Enviando imagem...';
    
    try {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `ads/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await db.storage
            .from('news-images')
            .upload(fileName, file);
            
        if (uploadError) throw uploadError;
        
        const { data } = db.storage.from('news-images').getPublicUrl(fileName);
        const imageUrl = data.publicUrl;
        
        const { error: insertError } = await db
            .from('ads')
            .insert([{
                position: position,
                title: title,
                image_url: imageUrl,
                link_url: link,
                is_active: true
            }]);
            
        if (insertError) throw insertError;
        
        statusMsg.className = 'success';
        statusMsg.textContent = '✅ Publicidade adicionada com sucesso!';
        
        // Limpa o formulário
        document.getElementById('ad-title').value = '';
        document.getElementById('ad-link').value = '#';
        fileInput.value = '';
        
        // Recarrega a lista
        await carregarListaAds();
        
        setTimeout(() => {
            statusMsg.className = '';
            statusMsg.textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error(error);
        statusMsg.className = 'error';
        statusMsg.textContent = '❌ Erro: ' + error.message;
    }
});

// ==========================================
// ATIVAR/DESATIVAR PUBLICIDADE
// ==========================================
async function toggleAd(id, newState) {
    try {
        const { error } = await db
            .from('ads')
            .update({ is_active: newState })
            .eq('id', id);
            
        if (error) throw error;
        
        await carregarListaAds();
    } catch (error) {
        console.error(error);
        alert('Erro ao atualizar publicidade: ' + error.message);
    }
}

// ==========================================
// EXCLUIR PUBLICIDADE
// ==========================================
async function excluirAd(id) {
    if (!confirm('Tem certeza que deseja excluir esta publicidade?')) return;
    
    try {
        const { error } = await db
            .from('ads')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        await carregarListaAds();
    } catch (error) {
        console.error(error);
        alert('Erro ao excluir publicidade: ' + error.message);
    }
}

// Carrega a lista ao iniciar
document.addEventListener('DOMContentLoaded', carregarListaAds);