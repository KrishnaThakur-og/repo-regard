-- Security fixes for StudyX application

-- 1. Fix user_roles RLS policy to prevent enumeration attacks
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;

CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Add unique constraint on invitation codes to prevent collisions
ALTER TABLE classrooms 
  ADD CONSTRAINT unique_invitation_code UNIQUE (invitation_code);