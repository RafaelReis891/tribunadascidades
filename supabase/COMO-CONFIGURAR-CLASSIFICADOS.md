# Configuração inicial dos classificados

1. No painel do Supabase, abra **SQL Editor** e execute `classificados.sql`.
2. Abra `classificados-cadastro.html` no site e crie sua própria conta de administrador. Confirme o e-mail se o Supabase solicitar.
3. No SQL Editor, encontre o UUID da sua conta:

   ```sql
   select user_id, email from public.classified_clients where email = 'SEU-EMAIL';
   ```

4. Promova essa conta ao papel de administrador, usando o UUID retornado:

   ```sql
   update public.classified_profiles
   set role = 'admin'
   where id = 'UUID-DA-SUA-CONTA';
   ```

5. Acesse `classificados-admin.html` com esse e-mail e senha. Os cadastros dos anunciantes aparecerão como aguardando liberação. Defina as vagas de cada categoria, uma data de validade e mude o acesso para **Liberado**.
6. O anunciante acessa `classificados-cliente.html`. Pode publicar até o limite contratado e editar ou substituir os próprios anúncios. Ao vencer o prazo, os anúncios deixam de aparecer publicamente; ao reduzir vagas, os anúncios excedentes são mantidos como rascunhos.

Os clientes se cadastram em `classificados-cadastro.html`. A conta começa pendente e não pode publicar até ser liberada no painel geral.

## Atualização de logo e fotos

Se o banco já estava configurado, execute `classificados-fotos-logo.sql` no SQL Editor para adicionar a logo do anunciante e a galeria de até seis fotos por anúncio. Em uma instalação nova, use a versão atualizada de `classificados.sql` e não precisa executar a migração separada.

Para habilitar os filtros estruturados de imóveis, execute `classificados-filtros-imoveis.sql` e depois execute novamente a versão atualizada de `classificados-fotos-logo.sql` para atualizar o gatilho dos anúncios. Anúncios antigos continuam aparecendo; edite-os no painel do anunciante para preencher cidade, bairro, tipo e preço numérico e incluí-los nesses filtros.

Para cadastrar motos separadas de carros, execute `classificados-motos-eletricas.sql` no SQL Editor. Depois disso, a categoria Motos Elétricas aparece nos menus e nos limites de vagas dos clientes.

## Vitrine de comércios e ofertas

Se o banco já está configurado, execute `classificados-comercios.sql` no SQL Editor. A vitrine de comércio inclui filtros por produto/categoria, anunciante, cidade e faixa de preço, além de ordenação por preço e ofertas. Os anúncios aceitam preço promocional, preço normal e data final da oferta.

Para carregar os exemplos, desative temporariamente a confirmação de e-mail em **Authentication → Sign In / Providers → Email**. Crie três contas em `classificados-cadastro.html` com estes endereços (use uma senha de demonstração que você possa guardar):

- `mercado.demo@tribunadascidades.test` — Mercado Bom Vizinho (DEMO)
- `padaria.demo@tribunadascidades.test` — Padaria Pão da Praça (DEMO)
- `casaecia.demo@tribunadascidades.test` — Casa & Cia Mogi (DEMO)

Em seguida, execute `demo-comercios.sql` no SQL Editor. Ele ativa essas contas por 90 dias, libera quatro vagas de comércio por cliente e cria 12 produtos demonstrativos. Os produtos e preços são fictícios; as imagens são URLs ilustrativas externas. Para operar com anunciantes reais, substitua os exemplos por dados e fotos autorizados.
