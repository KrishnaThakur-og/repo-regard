-- Avoid RLS recursion by using a SECURITY DEFINER helper
create or replace function public.is_teacher_of_classroom(_classroom_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classrooms
    where id = _classroom_id and teacher_id = _user_id
  );
$$;

-- Recreate classroom_members SELECT policy to use the helper (no direct SELECT on classrooms)
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.classroom_members;

CREATE POLICY "Members can view their own memberships"
ON public.classroom_members
FOR SELECT
TO authenticated
USING (
  classroom_members.student_id = auth.uid()
  OR public.is_teacher_of_classroom(classroom_members.classroom_id, auth.uid())
);