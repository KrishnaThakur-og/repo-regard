-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile_number TEXT,
  age INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Create classroom_members table
CREATE TABLE public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, student_id)
);

ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create task_completions table
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, student_id)
);

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for classrooms
CREATE POLICY "Teachers can view their own classrooms"
  ON public.classrooms FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view classrooms they're members of"
  ON public.classrooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members
      WHERE classroom_id = classrooms.id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create classrooms"
  ON public.classrooms FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classrooms"
  ON public.classrooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own classrooms"
  ON public.classrooms FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

-- RLS Policies for classroom_members
CREATE POLICY "Members can view their own memberships"
  ON public.classroom_members FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = classroom_id AND teacher_id = auth.uid()
  ));

CREATE POLICY "Students can join classrooms"
  ON public.classroom_members FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'student') AND auth.uid() = student_id);

CREATE POLICY "Students can leave classrooms"
  ON public.classroom_members FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

-- RLS Policies for tasks
CREATE POLICY "Teachers and students can view tasks in their classrooms"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id AND teacher_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.classroom_members
      WHERE classroom_id = tasks.classroom_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create tasks in their classrooms"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id AND teacher_id = auth.uid()
    ) AND auth.uid() = created_by
  );

CREATE POLICY "Teachers can update tasks in their classrooms"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete tasks in their classrooms"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id AND teacher_id = auth.uid()
    )
  );

-- RLS Policies for task_completions
CREATE POLICY "Students can view their own task completions"
  ON public.task_completions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.classrooms c ON t.classroom_id = c.id
      WHERE t.id = task_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their own task completions"
  ON public.task_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own task completions"
  ON public.task_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, mobile_number, age)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'mobile_number',
    (new.raw_user_meta_data->>'age')::INTEGER
  );
  
  -- Insert role if provided
  IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, (new.raw_user_meta_data->>'role')::app_role);
  END IF;
  
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();