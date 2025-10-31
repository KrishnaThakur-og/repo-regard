-- Create a security definer function to lookup classroom by invitation code
-- This allows students to find classrooms to join without exposing all classroom data
CREATE OR REPLACE FUNCTION public.get_classroom_by_invitation_code(_code text)
RETURNS TABLE (classroom_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id as classroom_id
  FROM public.classrooms
  WHERE invitation_code = UPPER(TRIM(_code))
  LIMIT 1;
$$;