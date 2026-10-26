import asyncio
from sqlalchemy import select
from backend_h.core.database import AsyncSessionLocal, engine
from backend_h.models.user import User
from backend_h.core.security import get_password_hash


async def create_or_update_admin():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.username == "admin")
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()
        hashed = get_password_hash("admin")

        if user:
            user.hashed_password = hashed
            user.is_active = True
            print("[OK] User 'admin' already existed. Password updated to 'admin'.")
        else:
            new_user = User(
                username="admin",
                email="admin@healthmitra.com",
                hashed_password=hashed,
                full_name="Administrator",
                is_active=True,
            )
            session.add(new_user)
            print("[OK] User 'admin' created successfully with password 'admin'.")

        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_or_update_admin())
