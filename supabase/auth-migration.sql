-- Run in Supabase SQL Editor after the original schema.sql

-- Add user_id to cards (nullable — device-only users keep working)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cards_user_idx ON cards (user_id);

-- Profiles table: one row per auth user
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles public read') THEN
    CREATE POLICY "profiles public read" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users insert own profile') THEN
    CREATE POLICY "users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users update own profile') THEN
    CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cards' AND policyname='users update own cards') THEN
    CREATE POLICY "users update own cards" ON cards FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id);
  END IF;
END $$;
