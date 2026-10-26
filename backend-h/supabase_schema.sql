-- ==============================================================================
-- HealthMitra Supabase Database Schema & Admin User Setup
-- Direct Link: https://supabase.com/dashboard/project/ntdjwxibywpyfsdoufcy/sql/new
-- ==============================================================================

-- 1. Create public.users table if not exists
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow individual update') THEN
    CREATE POLICY "Allow individual update" ON public.users FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow individual insert') THEN
    CREATE POLICY "Allow individual insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. Trigger for auto-syncing new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, email, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Clean up and insert GoTrue-compliant admin user
DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Delete old incomplete records
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@healthmitra.com');
  DELETE FROM public.users WHERE email = 'admin@healthmitra.com';
  DELETE FROM auth.users WHERE email = 'admin@healthmitra.com';

  -- Insert into auth.users (all text token columns set to '' instead of NULL)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    email_change,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_super_admin
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@healthmitra.com',
    crypt('admin', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"admin","full_name":"Administrator","role":"admin"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false
  );

  -- Insert into auth.identities (DO NOT include 'email' column as it is GENERATED ALWAYS in Supabase)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    admin_id,
    jsonb_build_object('sub', admin_id::text, 'email', 'admin@healthmitra.com'),
    'email',
    admin_id::text,
    now(),
    now(),
    now()
  );

  -- Insert into public.users profile
  INSERT INTO public.users (id, username, email, full_name, role)
  VALUES (
    admin_id,
    'admin',
    'admin@healthmitra.com',
    'Administrator',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    role = EXCLUDED.role;
END $$;
