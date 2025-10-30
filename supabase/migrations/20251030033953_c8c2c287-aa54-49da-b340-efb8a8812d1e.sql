-- Fix profiles table RLS policy to prevent contact information exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to view profiles of classmates (students in same classroom)
CREATE POLICY "Users can view classroom member profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members cm1
      JOIN classroom_members cm2 ON cm1.classroom_id = cm2.classroom_id
      WHERE cm1.student_id = auth.uid() AND cm2.student_id = profiles.id
    )
  );

-- Allow teachers to view profiles of their students
CREATE POLICY "Teachers can view student profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      JOIN classroom_members cm ON c.id = cm.classroom_id
      WHERE c.teacher_id = auth.uid() AND cm.student_id = profiles.id
    )
  );