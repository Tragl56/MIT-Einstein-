"""Cria os dados fictícios no banco antes de liberar a demonstração."""

from __future__ import annotations

import asyncio

from sqlalchemy import func, select

from app import db
from app.config import obter_config
from app.demo.seed import semear
from app.dominio.instituicoes.models import Instituicao


async def main() -> None:
    config = obter_config()
    db.configurar(config.database_url, pool_nulo=True)
    try:
        async with db.fabrica_sessao()() as sessao, sessao.begin():
            if not await sessao.scalar(select(func.count()).select_from(Instituicao)):
                await semear(sessao)
    finally:
        await db.encerrar()


if __name__ == "__main__":
    asyncio.run(main())
