const CATEGORIAS_CLIENTE = {
    imoveis: 'Imóveis', 'carros-eletricos': 'Carros Elétricos',
    'motos-eletricas': 'Motos Elétricas', comercios: 'Comércios'
};
const CATEGORIAS_PRODUTO_CLIENTE = {
    alimentos: 'Alimentos e bebidas', mercados: 'Mercados e mercearias',
    restaurantes: 'Restaurantes e lanchonetes', padarias: 'Padarias e cafés',
    moda: 'Moda e acessórios', casa: 'Casa e decoração', eletronicos: 'Eletrônicos',
    beleza: 'Beleza e cuidados', saude: 'Saúde e bem-estar', automotivo: 'Automotivo',
    pets: 'Pets', servicos: 'Serviços', outros: 'Outros'
};
const loginPanel = document.getElementById('client-login');
const dashboard = document.getElementById('client-dashboard');
const adForm = document.getElementById('classified-ad-form');
const adMessage = document.getElementById('ad-form-message');
let clientUser;
let clientAccount;
let clientQuotas = [];
let clientAds = [];
let editingAdId = null;
let editingImageUrls = [];

function clientMessage(element, text, type = 'info') { element.className = `classified-message ${type}`; element.textContent = text; }
function clientCategoryName(slug) { return CATEGORIAS_CLIENTE[slug] || slug; }

document.getElementById('client-login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await db.auth.signInWithPassword({
        email: document.getElementById('client-email').value.trim(),
        password: document.getElementById('client-password').value
    });
    if (error) clientMessage(document.getElementById('login-message'), error.message, 'error');
    else await carregarPainelCliente();
});
document.getElementById('client-logout').addEventListener('click', async () => { await db.auth.signOut(); location.reload(); });
document.getElementById('save-client-logo').addEventListener('click', salvarLogoCliente);
document.getElementById('ad-images').addEventListener('change', renderizarPreviewFotos);
document.getElementById('ad-category').addEventListener('change', atualizarCamposImovel);

function atualizarCamposImovel() {
    const category = document.getElementById('ad-category').value;
    document.getElementById('property-details').hidden = category !== 'imoveis';
    const commerceFields = document.getElementById('commerce-product-details');
    commerceFields.hidden = category !== 'comercios';
    document.getElementById('ad-product-category').required = category === 'comercios';
    document.getElementById('ad-price-label').firstChild.textContent = category === 'comercios' ? 'Preço promocional (R$)' : 'Preço (R$)';
}

async function enviarImagem(file, prefixo) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use imagens PNG, JPEG ou WebP.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Cada imagem deve ter no máximo 8 MB.');
    const extension = file.name.split('.').pop().toLowerCase();
    const path = `classifieds/${clientUser.id}/${prefixo}-${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage.from('classified-images').upload(path, file, { contentType: file.type });
    if (error) throw error;
    return db.storage.from('classified-images').getPublicUrl(path).data.publicUrl;
}

async function salvarLogoCliente() {
    const file = document.getElementById('client-logo-file').files[0];
    const target = document.getElementById('logo-message');
    if (!file) { clientMessage(target, 'Selecione uma imagem para a logo.', 'error'); return; }
    const button = document.getElementById('save-client-logo'); button.disabled = true;
    try {
        const url = await enviarImagem(file, 'logo');
        const { error } = await db.rpc('classified_update_my_logo', { p_logo_url: url });
        if (error) throw error;
        clientAccount.logo_url = url;
        atualizarPreviewLogo();
        document.getElementById('client-logo-file').value = '';
        clientMessage(target, 'Logo atualizada.', 'success');
    } catch (error) { clientMessage(target, error.message, 'error'); }
    finally { button.disabled = false; }
}

function atualizarPreviewLogo() {
    const image = document.getElementById('client-logo-preview');
    image.hidden = !clientAccount?.logo_url;
    if (clientAccount?.logo_url) image.src = clientAccount.logo_url;
}

async function carregarPainelCliente() {
    const { data: sessionData } = await db.auth.getSession();
    clientUser = sessionData.session?.user;
    if (!clientUser) { loginPanel.hidden = false; dashboard.hidden = true; return; }
    loginPanel.hidden = true; dashboard.hidden = false;
    const { data: account, error } = await db.from('classified_clients')
        .select('id,business_name,logo_url,status,expires_at').eq('user_id', clientUser.id).maybeSingle();
    if (error || !account) {
        clientMessage(document.getElementById('client-status-message'), error?.message || 'Conta de anunciante não encontrada.', 'error');
        return;
    }
    clientAccount = account;
    atualizarPreviewLogo();
    document.getElementById('client-account-summary').textContent = `${account.business_name} • ${account.status === 'active' ? 'Conta liberada' : account.status === 'suspended' ? 'Conta suspensa' : 'Aguardando liberação'}${account.expires_at ? ` • válida até ${new Date(`${account.expires_at}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}`;
    const { data: quotas, error: quotaError } = await db.from('classified_client_slots')
        .select('category,slots').eq('client_id', account.id);
    if (quotaError) { clientMessage(document.getElementById('client-status-message'), quotaError.message, 'error'); return; }
    clientQuotas = quotas || [];
    const { data: ads, error: adsError } = await db.from('classified_ads')
        .select('id,category,title,description,price,price_amount,original_price,offer_ends_at,product_category,location,city,neighborhood,property_type,bedrooms,parking_spaces,whatsapp,image_url,image_urls,status,created_at,updated_at')
        .eq('client_id', account.id).order('updated_at', { ascending: false });
    if (adsError) { clientMessage(document.getElementById('client-status-message'), adsError.message, 'error'); return; }
    clientAds = ads || [];
    renderizarPainelCliente();
}

function contaPodePublicar() {
    return clientAccount.status === 'active' && (!clientAccount.expires_at || clientAccount.expires_at >= new Date().toISOString().slice(0, 10));
}

function renderizarPainelCliente() {
    const statusMessage = document.getElementById('client-status-message');
    const podePublicar = contaPodePublicar();
    if (!podePublicar) {
        clientMessage(statusMessage, clientAccount.status === 'pending'
            ? 'Seu cadastro está aguardando aprovação e liberação de vagas pela Tribuna.'
            : clientAccount.status === 'suspended' ? 'Sua conta está suspensa. Fale com a Tribuna.'
            : 'O prazo da sua conta terminou. Fale com a Tribuna para renovar.', 'info');
    } else { statusMessage.textContent = ''; statusMessage.className = 'classified-message'; }

    const quotaBox = document.getElementById('client-quotas'); quotaBox.replaceChildren();
    Object.entries(CATEGORIAS_CLIENTE).forEach(([category, label]) => {
        const quota = clientQuotas.find(item => item.category === category);
        const slots = quota?.slots || 0;
        const used = clientAds.filter(item => item.category === category && item.status === 'published').length;
        const row = document.createElement('p'); row.textContent = `${label}: ${used} de ${slots} vagas publicadas`;
        quotaBox.appendChild(row);
    });

    const select = document.getElementById('ad-category'); select.replaceChildren();
    clientQuotas.filter(item => item.slots > 0).forEach(item => {
        const option = document.createElement('option'); option.value = item.category; option.textContent = clientCategoryName(item.category); select.appendChild(option);
    });
    atualizarCamposImovel();
    adForm.hidden = !podePublicar || clientQuotas.every(item => !item.slots);
    if (podePublicar && clientQuotas.every(item => !item.slots)) clientMessage(statusMessage, 'Sua conta está ativa, mas ainda não há vagas liberadas. Fale com a Tribuna.', 'info');
    renderizarAnunciosCliente();
}

function renderizarAnunciosCliente() {
    const list = document.getElementById('client-ads-list'); list.replaceChildren();
    if (!clientAds.length) { list.textContent = 'Você ainda não cadastrou anúncios.'; return; }
    clientAds.forEach(ad => {
        const item = document.createElement('article'); item.className = 'client-ad-row';
        const info = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = ad.title;
        const productCategory = ad.product_category ? ` • ${CATEGORIAS_PRODUTO_CLIENTE[ad.product_category] || ad.product_category}` : '';
        const offerEnds = ad.offer_ends_at ? ` • oferta até ${new Date(`${ad.offer_ends_at}T12:00:00`).toLocaleDateString('pt-BR')}` : '';
        const detail = document.createElement('p'); detail.textContent = `${clientCategoryName(ad.category)}${productCategory} • ${ad.status === 'published' ? 'Publicado' : 'Rascunho'} • ${(ad.image_urls || (ad.image_url ? [ad.image_url] : [])).length} foto(s)${offerEnds}`;
        info.append(title, detail);
        const actions = document.createElement('div'); actions.className = 'client-ad-actions';
        const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn btn-secondary'; edit.textContent = 'Editar';
        edit.addEventListener('click', () => editarAnuncio(ad));
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-danger'; remove.textContent = 'Excluir';
        remove.addEventListener('click', () => excluirAnuncio(ad));
        actions.append(edit, remove); item.append(info, actions); list.appendChild(item);
    });
}

function editarAnuncio(ad) {
    editingAdId = ad.id;
    document.getElementById('ad-form-title').textContent = 'Editar anúncio';
    document.getElementById('ad-category').value = ad.category;
    atualizarCamposImovel();
    document.getElementById('ad-title').value = ad.title;
    document.getElementById('ad-description').value = ad.description || '';
    document.getElementById('ad-price').value = ad.price_amount ?? '';
    document.getElementById('ad-city').value = ad.city || '';
    document.getElementById('ad-neighborhood').value = ad.neighborhood || '';
    document.getElementById('ad-product-category').value = ad.product_category || '';
    document.getElementById('ad-original-price').value = ad.original_price ?? '';
    document.getElementById('ad-offer-ends').value = ad.offer_ends_at || '';
    document.getElementById('ad-property-type').value = ad.property_type || '';
    document.getElementById('ad-bedrooms').value = ad.bedrooms ?? '';
    document.getElementById('ad-parking').value = ad.parking_spaces ?? '';
    document.getElementById('ad-whatsapp').value = ad.whatsapp || '';
    document.getElementById('ad-status').value = ad.status;
    editingImageUrls = [...(ad.image_urls || (ad.image_url ? [ad.image_url] : []))];
    document.getElementById('ad-images').value = '';
    renderizarPreviewFotos();
    document.getElementById('cancel-edit').hidden = false;
    adForm.hidden = false; adForm.scrollIntoView({ behavior: 'smooth' });
}

function limparFormularioAnuncio() {
    editingAdId = null; editingImageUrls = []; adForm.reset(); renderizarPreviewFotos();
    atualizarCamposImovel();
    document.getElementById('ad-form-title').textContent = 'Novo anúncio';
    document.getElementById('cancel-edit').hidden = true;
    adMessage.textContent = ''; adMessage.className = 'classified-message';
}
document.getElementById('cancel-edit').addEventListener('click', limparFormularioAnuncio);

function renderizarPreviewFotos() {
    const container = document.getElementById('ad-image-preview');
    container.replaceChildren();
    const files = [...document.getElementById('ad-images').files];
    const total = editingImageUrls.length + files.length;
    document.getElementById('ad-images').setCustomValidity(total > 6 ? 'O limite é de 6 fotos por anúncio.' : '');
    editingImageUrls.forEach((url, index) => {
        const wrapper = document.createElement('div'); wrapper.className = 'ad-image-thumb';
        const image = document.createElement('img'); image.src = url; image.alt = `Foto atual ${index + 1}`;
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remover';
        remove.addEventListener('click', () => { editingImageUrls.splice(index, 1); renderizarPreviewFotos(); });
        wrapper.append(image, remove); container.appendChild(wrapper);
    });
    files.forEach((file, index) => {
        const wrapper = document.createElement('div'); wrapper.className = 'ad-image-thumb';
        const image = document.createElement('img'); image.src = URL.createObjectURL(file); image.alt = `Nova foto ${index + 1}`;
        const label = document.createElement('span'); label.textContent = 'Nova foto';
        wrapper.append(image, label); container.appendChild(wrapper);
    });
}

adForm.addEventListener('submit', async event => {
    event.preventDefault();
    const saveButton = adForm.querySelector('button[type="submit"]'); saveButton.disabled = true;
    clientMessage(adMessage, 'Salvando anúncio...', 'info');
    try {
        const category = document.getElementById('ad-category').value;
        const previous = clientAds.find(ad => ad.id === editingAdId);
        const priceInput = document.getElementById('ad-price').value;
        const priceAmount = priceInput === '' ? null : Number(priceInput);
        const priceDisplay = priceAmount === null
            ? (previous?.price_amount == null ? (previous?.price || '') : '')
            : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceAmount);
        const city = document.getElementById('ad-city').value.trim();
        const neighborhood = document.getElementById('ad-neighborhood').value.trim();
        const selectedFiles = [...document.getElementById('ad-images').files];
        if (editingImageUrls.length + selectedFiles.length > 6) throw new Error('O limite é de 6 fotos por anúncio. Remova uma foto ou selecione menos arquivos.');
        const imageUrls = [...editingImageUrls];
        for (const file of selectedFiles) imageUrls.push(await enviarImagem(file, 'foto'));
        const payload = {
            client_id: clientAccount.id, category,
            title: document.getElementById('ad-title').value.trim(),
            description: document.getElementById('ad-description').value.trim(),
            price: priceDisplay, price_amount: priceAmount,
            product_category: category === 'comercios' ? document.getElementById('ad-product-category').value : '',
            original_price: category === 'comercios' && document.getElementById('ad-original-price').value !== '' ? Number(document.getElementById('ad-original-price').value) : null,
            offer_ends_at: category === 'comercios' ? (document.getElementById('ad-offer-ends').value || null) : null,
            location: [neighborhood, city].filter(Boolean).join(' • ') || previous?.location || '',
            city, neighborhood,
            property_type: category === 'imoveis' ? document.getElementById('ad-property-type').value : '',
            bedrooms: category === 'imoveis' && document.getElementById('ad-bedrooms').value !== '' ? Number(document.getElementById('ad-bedrooms').value) : null,
            parking_spaces: category === 'imoveis' && document.getElementById('ad-parking').value !== '' ? Number(document.getElementById('ad-parking').value) : null,
            whatsapp: document.getElementById('ad-whatsapp').value.trim(),
            image_url: imageUrls[0] || '', image_urls: imageUrls, status: document.getElementById('ad-status').value
        };
        const query = editingAdId
            ? db.from('classified_ads').update(payload).eq('id', editingAdId).eq('client_id', clientAccount.id)
            : db.from('classified_ads').insert(payload);
        const { error } = await query;
        if (error) throw error;
        clientMessage(adMessage, 'Anúncio salvo.', 'success');
        await carregarPainelCliente(); limparFormularioAnuncio();
    } catch (error) { clientMessage(adMessage, error.message, 'error'); }
    finally { saveButton.disabled = false; }
});

async function excluirAnuncio(ad) {
    if (!confirm(`Excluir o anúncio “${ad.title}”?`)) return;
    const { error } = await db.from('classified_ads').delete().eq('id', ad.id).eq('client_id', clientAccount.id);
    if (error) { clientMessage(document.getElementById('client-status-message'), error.message, 'error'); return; }
    await carregarPainelCliente();
}

document.addEventListener('DOMContentLoaded', carregarPainelCliente);
