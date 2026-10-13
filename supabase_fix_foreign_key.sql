-- ==============================================================================
-- SUPABASE FIX SCRIPT: Teachers & Foreign Key Constraints
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Fix Foreign Key constraint on teachers table to CASCADE on delete
-- (When a user is deleted from auth.users, their teacher profile and classes will auto-delete cleanly)
ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_id_fkey;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Remove orphaned records from teachers table (records whose auth.user was deleted)
DELETE FROM public.teachers
WHERE id NOT IN (SELECT id FROM auth.users);

-- 3. Ensure all existing users in auth.users have a corresponding record in public.teachers
INSERT INTO public.teachers (id, email, full_name, school_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Teacher User'), 
  'বিদ্যালয়ের নাম', 
  'teacher'
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email;

-- 4. Create trigger to automatically create a teacher profile whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_teacher()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (id, email, full_name, school_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Teacher User'),
    'বিদ্যালয়ের নাম',
    'teacher'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_teacher();

-- Verify current records
SELECT id, email, full_name, role FROM public.teachers;
