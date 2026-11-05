from __future__ import annotations

import asyncio

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.db import preparar_url_asyncpg
from app.config import obter_config
from app.modelos import Base

target_metadata = Base.metadata


def _url() -> str:
    # Testes passam a URL do banco de teste via -x url=... ou config.attributes
    return context.config.attributes.get("url") or obter_config().database_url


def _executar(conexao: Connection) -> None:
    context.configure(connection=conexao, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def _online() -> None:
    url, usar_pooler_transacional = preparar_url_asyncpg(_url())
    opcoes = {"poolclass": NullPool}
    if usar_pooler_transacional:
        opcoes["connect_args"] = {"statement_cache_size": 0, "ssl": "require"}
    engine = create_async_engine(url, **opcoes)
    async with engine.connect() as conexao:
        await conexao.run_sync(_executar)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(_online())
