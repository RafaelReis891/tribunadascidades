const message = document.getElementById('auth-message');
function showAuthMessage(text, type = 'info') { message.className = `classified-message ${type}`; message.textContent = text; }

document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) { showAuthMessage(`Não foi possível entrar: ${error.message}`, 'error'); return; }
    location.href = 'classificados-cliente.html';
});

document.getElementById('signup-form').addEventListener('submit', async event => {
    event.preventDefault();
    const businessName = document.getElementById('signup-business').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const { data, error } = await db.auth.signUp({
        email, password, options: { data: { business_name: businessName } }
    });
    if (error) { showAuthMessage(`Não foi possível criar a conta: ${error.message}`, 'error'); return; }
    showAuthMessage(data.session
        ? 'Cadastro recebido. A conta ficará aguardando a liberação de vagas e prazo pela Tribuna.'
        : 'Cadastro recebido. Confirme seu e-mail; depois a Tribuna libera suas vagas e o prazo contratado.', 'success');
});
