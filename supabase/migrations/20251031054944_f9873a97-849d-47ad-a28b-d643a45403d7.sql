-- Fix infinite recursion in classrooms RLS policies
-- Drop the problematic student policy that causes recursion
DROP POLICY IF EXISTS "Students can view classrooms they're members of" ON public.classrooms;

-- Recreate a simpler student policy that doesn't cause recursion
-- Students can view classrooms where they are members (using a simpler check)
CREATE POLICY "Students can view their classrooms"
ON public.classrooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.classroom_members 
    WHERE classroom_members.classroom_id = classrooms.id 
    AND classroom_members.student_id = auth.uid()
  )
);

-- Fix the classroom_members policy to avoid recursion
-- Drop and recreate the policy without the circular reference
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.classroom_members;

CREATE POLICY "Members can view their own memberships"
ON public.classroom_members
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid() 
  OR 
  classroom_id IN (
    SELECT id FROM public.classrooms WHERE teacher_id = auth.uid()
  )
);