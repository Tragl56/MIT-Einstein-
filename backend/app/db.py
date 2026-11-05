"""Engine, sessão por requisição (uma transação) e base declarativa dos modelos."""

from __future__ import annotations

import enum
import uuid
from collections.abc import AsyncIterator
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import DateTime, Enum, MetaData, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.pool import NullPool

# Nomes de constraint estáveis: migrações reproduzíveis entre máquinas
CONVENCAO_NOMES = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=CONVENCAO_NOMES)


class ModeloBase(Base):
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


def enum_pg(classe: type[enum.Enum], nome: str) -> Enum:
    """Enum nativo do Postgres gravando o *valor* (minúsculo), não o nome do membro."""
    return Enum(classe, name=nome, values_callable=lambda c: [m.value for m in c])


def preparar_url_asyncpg(url: str) -> tuple[str, bool]:
    """Normaliza URLs do Supabase Transaction Pooler para o driver asyncpg."""
    partes = urlsplit(url)
    usar_pooler_transacional = bool(partes.hostname and partes.hostname.endswith(".pooler.supabase.com"))
    if not usar_pooler_transacional:
        return url, False
    query = [(chave, valor) for chave, valor in parse_qsl(partes.query) if chave != "sslmode"]
    normalizada = urlunsplit(("postgresql+asyncpg", partes.netloc, partes.path, urlencode(query), partes.fragment))
    return normalizada, True


_engine: AsyncEngine | None = None
_fabrica: async_sessionmaker[AsyncSession] | None = None


def configurar(url: str, pool_nulo: bool = False) -> None:
    global _engine, _fabrica
    # O pooler transacional do Supabase é indicado para funções serverless. Não
    # mantenha conexões entre invocações nem use prepared statements nomeados.
    url, usar_pooler_transacional = preparar_url_asyncpg(url)
    if pool_nulo or usar_pooler_transacional:
        opcoes = {"poolclass": NullPool}
    else:
        opcoes = {"pool_pre_ping": True}
    if usar_pooler_transacional:
        opcoes["connect_args"] = {"statement_cache_size": 0, "ssl": "require"}
    _engine = create_async_engine(url, **opcoes)
    _fabrica = async_sessionmaker(_engine, expire_on_commit=False)


def fabrica_sessao() -> async_sessionmaker[AsyncSession]:
    if _fabrica is None:
        raise RuntimeError("Banco não configurado: chame db.configurar() (feito por create_app).")
    return _fabrica


async def obter_sessao() -> AsyncIterator[AsyncSession]:
    """Uma transação por requisição: commit no fim, rollback se qualquer exceção escapar."""
    async with fabrica_sessao()() as sessao:
        async with sessao.begin():
            yield sessao


async def encerrar() -> None:
    if _engine is not None:
        await _engine.dispose()
