-- Create storage buckets for assignments and submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('assignments', 'assignments', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/jpg']),
  ('submissions', 'submissions', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/jpg']);

-- Add document_url column to tasks table for teacher uploads
ALTER TABLE public.tasks
ADD COLUMN document_url TEXT,
ADD COLUMN document_name TEXT;

-- Create task_submissions table for student uploads
CREATE TABLE public.task_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_submissions
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_submissions
CREATE POLICY "Students can view their own submissions"
ON public.task_submissions
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their classroom tasks"
ON public.task_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.classrooms c ON t.classroom_id = c.id
    WHERE t.id = task_submissions.task_id
    AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can insert their own submissions"
ON public.task_submissions
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own submissions before due date"
ON public.task_submissions
FOR UPDATE
USING (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = task_submissions.task_id
    AND due_date >= CURRENT_DATE
  )
);

-- Add unique constraint to prevent multiple submissions per student per task
ALTER TABLE public.task_submissions
ADD CONSTRAINT unique_student_task_submission UNIQUE (task_id, student_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_task_submissions_updated_at
BEFORE UPDATE ON public.task_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for assignments bucket (teacher uploads)
CREATE POLICY "Teachers can upload assignment documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assignments'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);

CREATE POLICY "Teachers can view their own assignment documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view assignment documents from their classrooms"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignments'
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.classroom_members cm ON t.classroom_id = cm.classroom_id
    WHERE cm.student_id = auth.uid()
    AND t.document_url = storage.objects.name
  )
);

CREATE POLICY "Teachers can delete their own assignment documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assignments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for submissions bucket (student uploads)
CREATE POLICY "Students can upload submission documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'student'
  )
);

CREATE POLICY "Students can view their own submission documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can view submission documents from their classroom tasks"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'submissions'
  AND EXISTS (
    SELECT 1 FROM public.task_submissions ts
    JOIN public.tasks t ON ts.task_id = t.id
    JOIN public.classrooms c ON t.classroom_id = c.id
    WHERE c.teacher_id = auth.uid()
    AND ts.document_url = storage.objects.name
  )
);

CREATE POLICY "Students can update their own submission documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can delete their own submission documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);