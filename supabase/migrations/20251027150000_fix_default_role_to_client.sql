/*
  # Fix Default Role for New User Registrations

  ## Problem
  New users registering via the public registration page are automatically assigned the 'subcontractor' role,
  but they should be assigned the 'CLIENT' role by default.

  ## Solution
  1. Update the handle_new_profile trigger function to set role = 'CLIENT' by default
  2. Allow admin-created users to specify a different role via metadata
  3. Preserve existing behavior for admin-created accounts

  ## Logic
  - If `raw_user_meta_data->>'role'` exists → use it (admin creation)
  - Otherwise → default to 'CLIENT' (public registration)

  ## Security
  - No RLS changes
  - Only affects new user creation
*/

-- Drop and recreate the function with role assignment
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, phone, role)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      -- If role is provided in metadata (admin creation), use it
      -- Otherwise, default to 'CLIENT' for public registrations
      COALESCE(new.raw_user_meta_data->>'role', 'CLIENT')
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Never break user registration
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile();

COMMENT ON FUNCTION handle_new_profile() IS 'Creates profile with role=CLIENT by default for public registrations, or uses metadata role for admin-created users';
