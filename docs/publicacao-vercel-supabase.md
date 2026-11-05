# Publicação dos painéis mobile

## Endereços

- `/profissional.html` e `/` — painel profissional completo da demonstração.
- `/app/` — app completo do paciente no navegador: jornada, agenda, documentos, registros e mensagens.
- `/paciente.html` — redireciona ao app completo.

## Composição

`vercel.json` publica os frontends Pro e paciente e a API Express que ambos compartilham no mesmo domínio. O serviço FastAPI mantém as migrações Alembic e o endpoint de diagnóstico `/api/saude`.

A API completa carrega e salva seu cenário fictício em `oncoflow_demo_snapshot` no Supabase. Cada chamada usa uma transação com bloqueio da linha, e a instância serializa a hidratação do domínio. A resposta só é enviada após o commit; falhas retornam 503, sem recibo de sucesso. Sessões e chaves de idempotência também persistem no cenário. É uma ponte para demonstração, não o modelo relacional clínico definitivo.

O navegador usa cookies somente para chamadas da própria origem, para preservar o acesso temporário ao preview protegido. O Ollama local e o plugin de voz Android não ficam disponíveis automaticamente no navegador pela publicação do frontend.

## Variáveis secretas necessárias no Vercel

Cadastre em Preview e Production, sem colocar os valores no Git:

- `DATABASE_URL`: URL do **Transaction Pooler** do projeto `oncoflow-dev` (porta 6543). O backend normaliza `postgres://`/`postgresql://` para `postgresql+asyncpg://` e exige SSL para o host `*.pooler.supabase.com`.
- `JWT_SEGREDO`: segredo aleatório forte e exclusivo do ambiente.
- `DEMO_MODE`: `true`, pois esta publicação prepara somente o cenário demonstrativo fictício.
- `DEMO_SENHA`: segredo aleatório para as contas fictícias.

O build da API aplica as migrações do Alembic e insere os fixtures somente quando o banco está vazio. O cenário é fictício; não cadastrar dados de pacientes reais nesta instância de demonstração.
