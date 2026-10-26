import asyncio
from backend_h.core.database import Base, engine
import backend_h.models  # noqa: F401


async def init_tables():
    print("Connecting to PostgreSQL and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created successfully:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_tables())
