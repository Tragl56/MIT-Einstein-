# Publicação dos painéis mobile

## Endereços

- `/profissional` — painel da equipe clínica, com tabela rolável em telas estreitas.
- `/paciente` — jornada do paciente, com layout pensado para celular.
- `/` — escolha entre os dois painéis.

## Composição

`vercel.json` publica o frontend Vite e o backend FastAPI como serviços no mesmo projeto e domínio. As chamadas `/api/*` seguem para o backend; as demais rotas seguem para o frontend.

## Variáveis secretas necessárias no Vercel

Cadastre em Preview e Production, sem colocar os valores no Git:

- `DATABASE_URL`: URL do **Transaction Pooler** do projeto `oncoflow-dev` (porta 6543). O backend normaliza `postgres://`/`postgresql://` para `postgresql+asyncpg://` e exige SSL para o host `*.pooler.supabase.com`.
- `JWT_SEGREDO`: segredo aleatório forte e exclusivo do ambiente.
- `DEMO_MODE`: `true`, pois esta publicação prepara somente o cenário demonstrativo fictício.
- `DEMO_SENHA`: segredo aleatório para as contas fictícias.

O build da API aplica as migrações do Alembic e insere os fixtures somente quando o banco está vazio. O cenário é fictício; não cadastrar dados de pacientes reais nesta instância de demonstração.
