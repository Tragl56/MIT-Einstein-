# OncoFlow

Plataforma de coordenação da jornada oncológica: **cada etapa do cuidado, conectada.** MVP para o MIT Hacking
Medicine (trilha de Oncologia), só com **dados fictícios**.

- **OncoFlow Pro** (`frontend/apps/pro`, porta 5173): portal web da equipe — médicos, enfermagem, navegação, gestão.
- **OncoFlow Paciente** (`frontend/apps/paciente`, porta 5174): app mobile-first do paciente.
- **API** (`backend/`, porta 8000): FastAPI + PostgreSQL.

As regras do produto e as decisões de arquitetura estão em [CLAUDE.md](CLAUDE.md) e nas skills em
`.claude/skills/oncoflow-*`.

## Rodar localmente

Requisitos: Docker Desktop, Python 3.12+ e Node 20+.

```bash
cp .env.example .env        # preencha POSTGRES_PASSWORD, JWT_SEGREDO e DEMO_SENHA
docker compose up -d db     # Postgres 16 (cria também o banco oncoflow_teste)
```

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt     # no Linux/macOS: .venv/bin/pip
.venv/Scripts/alembic upgrade head
.venv/Scripts/uvicorn app.main:app --port 8000
```

Frontend (em outro terminal):

```bash
cd frontend
npm install
npm run dev:pro        # http://localhost:5173
npm run dev:paciente   # http://localhost:5174
```

Ou tudo em contêineres: `docker compose up --build`.

Com `DEMO_MODE=true`, a API popula o banco na primeira subida e os dois apps mostram uma barra para trocar de
usuário fictício (Dra. Ana, Carla, Enf. Bruno, Diego, Maria) e para restaurar os dados da demo. Fora do modo
demo, as rotas `/api/demo/*` não existem.

## Testes

```bash
cd backend && .venv/Scripts/pytest -q     # usa o banco oncoflow_teste; desce e sobe todas as migrações
cd frontend && npm run typecheck && npm run build
```

## Estrutura

```
backend/app/
  acesso/      autenticação, papéis e contexto (paciente sempre vem do token)
  auditoria/   eventos somente-inserção (trigger no banco bloqueia UPDATE/DELETE/TRUNCATE)
  dominio/     instituições, pacientes, jornada, agenda, tarefas, check-ins, consultas, consentimentos…
  demo/        seed fictício e reset
backend/alembic/   migrações (reversíveis)
frontend/packages/shared/   tokens da marca, cliente HTTP, sessão e barra da demo
fixtures/          transcrições fictícias usadas pelo seed e pelos testes
```
