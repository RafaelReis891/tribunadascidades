// APAGUE TUDO ANTES E COLE APENAS ISTO:
const DB_URL = 'https://aonlvtjxzzfvehsuobza.supabase.co';
const DB_KEY = 'sb_publishable_bsGrbsSJNA-bcweUIwr8Eg_sCpLaacd';

// Usamos o nome 'db' para evitar 100% dos conflitos de nome
const db = window.supabase.createClient(DB_URL, DB_KEY);