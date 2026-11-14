const ADMIN_CATEGORIAS = {
    imoveis: 'Imóveis', 'carros-eletricos': 'Carros elétricos',
    'motos-eletricas': 'Motos elétricas', comercios: 'Comércios'
};
const adminLogin = document.getElementById('admin-login-panel');
const adminDashboard = document.getElementById('admin-dashboard');
const adminMessage = document.getElementById('admin-message');
let adminClients = [];

document.getElementById('admin-client-search').addEventListener('input', renderizarClientesAdmin);
document.getElementById('admin-status-filter').addEventListener('change', renderizarClientesAdmin);

function adminNotice(text, type = 'info') { adminMessage.className = `classified-message ${type}`; adminMessage.textContent = text; }
function dataHojeSaoPaulo() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()); }
function estadoAtualCliente(client) {
    return client.status === 'active' && (!client.expires_at || client.expires_at < dataHojeSaoPaulo())
        ? 'expired' : client.status;
}

document.getElementById('admin-login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const { error } = await db.auth.signInWithPassword({
        email: document.getElementById('admin-email').value.trim(),
        password: document.getElementById('admin-password').value
    });
    if (error) { const target = document.getElementById('admin-login-message'); target.className = 'classified-message error'; target.textContent = error.message; return; }
    await abrirPainelAdmin();
});
document.getElementById('admin-logout').addEventListener('click', async () => { await db.auth.signOut(); location.reload(); });

async function abrirPainelAdmin() {
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session) { adminLogin.hidden = false; adminDashboard.hidden = true; return; }
    const { data: perfil, error } = await db.from('classified_profiles')
        .select('role').eq('id', sessionData.session.user.id).maybeSingle();
    if (error || perfil?.role !== 'admin') {
        adminLogin.hidden = false; adminDashboard.hidden = true;
        const target = document.getElementById('admin-login-message');
        target.className = 'classified-message error'; target.textContent = 'Esta conta não tem permissão de administrador.';
        await db.auth.signOut(); return;
    }
    adminLogin.hidden = true; adminDashboard.hidden = false;
    await carregarClientes();
}

async function carregarClientes() {
    const container = document.getElementById('admin-clients-list');
    container.textContent = 'Carregando clientes...';
    const { data: clients, error } = await db.from('classified_clients')
        .select('id,user_id,business_name,email,logo_url,status,expires_at,created_at,classified_client_slots(category,slots)')
        .order('created_at', { ascending: false });
    if (error) { container.textContent = `Erro ao carregar clientes: ${error.message}`; return; }
    adminClients = clients || [];
    const vigentes = adminClients.filter(client => estadoAtualCliente(client) === 'active').length;
    document.getElementById('admin-total-count').textContent = adminClients.length;
    document.getElementById('admin-pending-count').textContent = adminClients.filter(client => client.status === 'pending').length;
    document.getElementById('admin-active-count').textContent = vigentes;
    document.getElementById('admin-expired-count').textContent = adminClients.filter(client => estadoAtualCliente(client) === 'expired').length;
    document.getElementById('admin-suspended-count').textContent = adminClients.filter(client => client.status === 'suspended').length;
    renderizarClientesAdmin();
}

function renderizarClientesAdmin() {
    const container = document.getElementById('admin-clients-list');
    const query = document.getElementById('admin-client-search').value.trim().toLocaleLowerCase('pt-BR');
    const status = document.getElementById('admin-status-filter').value;
    const priority = { pending: 0, expired: 1, active: 2, suspended: 3 };
    const filtered = adminClients.filter(client =>
        (status === 'all' || estadoAtualCliente(client) === status) &&
        (`${client.business_name} ${client.email}`.toLocaleLowerCase('pt-BR').includes(query))
    ).sort((a, b) => priority[estadoAtualCliente(a)] - priority[estadoAtualCliente(b)] || new Date(b.created_at) - new Date(a.created_at));
    document.getElementById('admin-visible-count').textContent = `${filtered.length} de ${adminClients.length} clientes`;
    container.replaceChildren();
    if (!adminClients.length) { container.textContent = 'Ainda não há solicitações de cadastro.'; return; }
    if (!filtered.length) { container.textContent = 'Nenhum cliente corresponde à busca e ao filtro.'; return; }
    filtered.forEach(client => container.appendChild(criarCartaoCliente(client)));
}

function criarCartaoCliente(client) {
    const currentState = estadoAtualCliente(client);
    const card = document.createElement('article'); card.className = `admin-client-card status-${currentState}`;
    const heading = document.createElement('div'); heading.className = 'admin-client-heading';
    if (client.logo_url) { const logo = document.createElement('img'); logo.className = 'admin-client-logo'; logo.src = client.logo_url; logo.alt = `Logo de ${client.business_name}`; heading.appendChild(logo); }
    const name = document.createElement('h3'); name.textContent = client.business_name;
    const email = document.createElement('p'); email.textContent = client.email;
    const badge = document.createElement('span'); badge.className = `admin-status-badge status-${currentState}`;
    badge.textContent = currentState === 'pending' ? 'Aguardando' : currentState === 'expired' ? 'Contrato vencido' : currentState === 'active' ? 'Vigente' : 'Suspenso';
    heading.append(name, email, badge); card.appendChild(heading);
    const fields = document.createElement('div'); fields.className = 'admin-client-fields';
    const businessLabel = document.createElement('label'); businessLabel.textContent = 'Nome do anunciante';
    const businessInput = document.createElement('input'); businessInput.type = 'text'; businessInput.maxLength = 120; businessInput.value = client.business_name;
    businessLabel.appendChild(businessInput); fields.appendChild(businessLabel);
    const statusLabel = document.createElement('label'); statusLabel.textContent = 'Acesso';
    const statusSelect = document.createElement('select');
    [['pending', 'Aguardando liberação'], ['active', 'Liberado'], ['suspended', 'Suspenso']].forEach(([value, label]) => {
        const option = document.createElement('option'); option.value = value; option.textContent = label; statusSelect.appendChild(option);
    });
    statusSelect.value = client.status; statusLabel.appendChild(statusSelect); fields.appendChild(statusLabel);
    const dateLabel = document.createElement('label'); dateLabel.textContent = 'Válido até';
    const dateInput = document.createElement('input'); dateInput.type = 'date'; dateInput.value = client.expires_at || '';
    dateLabel.appendChild(dateInput); fields.appendChild(dateLabel);

    const quotaTitle = document.createElement('h4'); quotaTitle.textContent = 'Vagas contratadas'; card.append(fields, quotaTitle);
    const quotaFields = document.createElement('div'); quotaFields.className = 'admin-quota-fields';
    const quotaInputs = {};
    Object.entries(ADMIN_CATEGORIAS).forEach(([category, label]) => {
        const wrapper = document.createElement('label'); wrapper.textContent = label;
        const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = '1';
        input.value = client.classified_client_slots?.find(slot => slot.category === category)?.slots || 0;
        quotaInputs[category] = input; wrapper.appendChild(input); quotaFields.appendChild(wrapper);
    });
    card.appendChild(quotaFields);
    const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary'; save.textContent = 'Salvar limites e acesso';
    save.addEventListener('click', async () => {
        if (statusSelect.value === 'active' && !dateInput.value) {
            adminNotice('Defina uma data de validade antes de liberar a conta.', 'error');
            return;
        }
        save.disabled = true; adminNotice(`Salvando ${client.business_name}...`, 'info');
        try {
            const { error: accountError } = await db.from('classified_clients').update({
                business_name: businessInput.value.trim(), status: statusSelect.value,
                expires_at: dateInput.value || null, updated_at: new Date().toISOString()
            }).eq('id', client.id);
            if (accountError) throw accountError;
            const quotaRows = Object.entries(quotaInputs).map(([category, input]) => ({
                client_id: client.id, category, slots: Math.max(0, Number.parseInt(input.value || '0', 10))
            }));
            const { error: quotaError } = await db.from('classified_client_slots').upsert(quotaRows, { onConflict: 'client_id,category' });
            if (quotaError) throw quotaError;
            adminNotice('Contrato e vagas atualizados.', 'success');
            await carregarClientes();
        } catch (error) { adminNotice(`Não foi possível salvar: ${error.message}`, 'error'); }
        finally { save.disabled = false; }
    });
    card.appendChild(save);
    return card;
}

document.addEventListener('DOMContentLoaded', abrirPainelAdmin);
