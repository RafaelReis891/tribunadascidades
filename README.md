# Tribuna das Cidades

Site estático em HTML, CSS e JavaScript, com Supabase para notícias, publicidade e classificados.

## Estrutura

```text
/
├── index.html, categoria.html, noticia.html   Páginas do portal
├── admin.html                                 Editor de notícias
├── ads.html                                   Gestão de publicidade
├── classificados*.html                        Vitrine e painéis de classificados
├── assets/
│   ├── css/site.css                           Estilos do portal e das páginas públicas
│   ├── css/admin.css                          Estilos isolados dos painéis administrativos
│   ├── js/                                    Aplicação, páginas e configuração do Supabase
│   └── images/                                Logos e imagens locais
├── supabase/                                  Esquema, migrações e dados de demonstração
└── tools/                                     Páginas auxiliares de diagnóstico
```

As páginas HTML permanecem na raiz para manter os endereços existentes. Os arquivos de interface agora ficam agrupados em `assets/`; atualize essa pasta junto com as páginas quando publicar uma versão.

## Páginas principais

- `index.html`: início e notícias recentes.
- `categoria.html`: listagem de notícias por categoria.
- `noticia.html`: leitura de uma notícia.
- `admin.html`: editor para criar notícias.
- `ads.html`: administração de espaços publicitários.
- `classificados.html?categoria=...`: vitrine pública de anúncios.
- `classificados-admin.html`: gestão de anunciantes, contratos e vagas.
- `classificados-cliente.html`: painel de cada anunciante.
- `classificados-cadastro.html`: entrada e solicitação de acesso.

## Supabase

O cliente público do Supabase está configurado em `assets/js/config.js`. Scripts SQL, migrações e instruções ficam em `supabase/`; aplique as migrações correspondentes no SQL Editor antes de usar os recursos que adicionam.

## Publicação

Não há etapa de build: publique os arquivos mantendo a estrutura relativa das pastas. A página `tools/teste-admin.html` é um utilitário manual e não faz parte do fluxo normal do portal.
