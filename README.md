# DegradScan

Aplicação especializada para pesquisa e documentação de produtos de degradação de fármacos, com integração a IA (OpenRouter) e bases científicas (PubChem, Crossref, PubMed). Inclui cache e persistência via Supabase, além de exportação estática para deploy no GitHub Pages.

## Principais Recursos
- Busca por substância e geração de relatório de produtos de degradação (IA via OpenRouter)
- Cache e banco de dados (Supabase) para respostas rápidas e histórico
- Referências bibliográficas com título, autores, periódico/ano e link do PubMed
- Autocomplete de nomes químicos (PubChem Autocomplete)
- Página de propriedades físico-químicas e sinônimos (PubChem PUG REST)
- Autenticação com e-mail e senha (Supabase Auth), páginas de Login/Signup e fluxo protegido
- Export estático e deploy automático pelo GitHub Pages (GitHub Actions)

## Requisitos
- Node.js 20+
- Conta e projeto Supabase
- Chave da OpenRouter (para IA)

## Variáveis de Ambiente
Crie `.env.local` na raiz:

```
NEXT_PUBLIC_SUPABASE_URL="https://<SEU-PROJETO>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<ANON-KEY>"
SUPABASE_URL="https://<SEU-PROJETO>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<SERVICE-ROLE-KEY>"
OPEN_ROUTER_API_KEY="<SUA-CHAVE-OPENROUTER>"
OPEN_ROUTER_MODEL="anthropic/claude-3.5-sonnet"
DEGRADSCAN_FORCE_AI="false"
```

## Scripts
- `npm install` — instala dependências
- `npm run dev` — desenvolvimento em `http://localhost:3000/`
- `npm run build` — build de produção
- `npx next export` — exporta site estático para pasta `out/`

## Fluxo de Uso
1. Acesso inicial direciona para `/login`
2. Cadastro em `/signup` (e-mail + senha) → redireciona para `/login`
3. Login em `/login` → redireciona para `/`
4. Pesquise substâncias (autocomplete PubChem) e gere relatório da IA
5. Abra “Gerar dados físico-químicos” para ver propriedades e sinônimos

## Integrações
- OpenRouter Chat Completions: geração de JSON estruturado para tabela de degradação
- Supabase RPC e tabelas: cache, logs, substâncias, produtos, referências, histórico
- PubChem PUG REST: `Name→CID`, propriedades, sinônimos
- Crossref/PubMed: enriquecimento de referências e link para PubMed

## Deploy no GitHub Pages
- Workflow: `.github/workflows/deploy.yml`
- Build e export automáticos em push para `main`
- Base path: `NEXT_PUBLIC_BASE_PATH=/DegradScanUpdate`
- Conteúdo publicado a partir de `out/`

## Observações
- Não commit de credenciais: `.env*` já ignorado por `.gitignore`
- Para suporte a imagens em Pages, `images.unoptimized: true` em `next.config.js`

