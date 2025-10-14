/*
  # Fix handle_new_profile function

  1. Changes
    - Update the handle_new_profile trigger function to use `user_id` instead of `id`
    - The profiles table uses `user_id` as its primary key, not `id`
  
  2. Security
    - No security changes, only fixing the column reference
*/

-- Drop and recreate the function with correct column name
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, phone)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- ne jamais casser l'inscription
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
