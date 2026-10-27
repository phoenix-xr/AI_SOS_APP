import asyncio
from backend_h.core.supabase import supabase_service


async def verify_or_create_admin():
    print("[*] Checking Supabase for admin user...")
    try:
        # Check login with default admin credentials
        res = await supabase_service.login("admin", "admin")
        print(f"[OK] Admin user verified! Logged in as: {res['user']['email']} (username: {res['user']['username']})")
    except Exception:
        print("[*] Admin not found or password differs. Creating admin via Supabase Admin API...")
        try:
            res = await supabase_service.register(
                username="admin",
                email="admin@healthmitra.com",
                password="admin",
                full_name="Administrator",
            )
            print(f"[OK] Admin user created successfully in Supabase: {res['user']['email']}")
        except Exception as e:
            print(f"[x] Error creating admin: {e}")


if __name__ == "__main__":
    asyncio.run(verify_or_create_admin())
