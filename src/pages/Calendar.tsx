import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { TaskCard } from "@/components/TaskCard";
import { format, isSameDay } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  due_date: string;
}

const Calendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [userRole, setUserRole] = useState<"teacher" | "student" | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (roles) {
      setUserRole(roles.role as "teacher" | "student");
      await loadTasks(roles.role, session.user.id);
    }
    
    setLoading(false);
  };

  const loadTasks = async (role: string, userId: string) => {
    if (role === "teacher") {
      const { data: classroomData } = await supabase
        .from("classrooms")
        .select("id")
        .eq("teacher_id", userId);
      
      if (classroomData && classroomData.length > 0) {
        const { data: taskData } = await supabase
          .from("tasks")
          .select("*")
          .in("classroom_id", classroomData.map(c => c.id))
          .order("due_date", { ascending: true });
        
        if (taskData) setTasks(taskData as Task[]);
      }
    } else {
      const { data: memberData } = await supabase
        .from("classroom_members")
        .select("classroom_id")
        .eq("student_id", userId);
      
      if (memberData && memberData.length > 0) {
        const { data: taskData } = await supabase
          .from("tasks")
          .select("*")
          .in("classroom_id", memberData.map(m => m.classroom_id))
          .order("due_date", { ascending: true });
        
        if (taskData) setTasks(taskData as Task[]);
      }
    }
  };

  const tasksForSelectedDate = tasks.filter((task) =>
    selectedDate && isSameDay(new Date(task.due_date), selectedDate)
  );

  const datesWithTasks = tasks.map((task) => new Date(task.due_date));

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar userRole={userRole || undefined} />
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-background px-6 py-4 flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Calendar & Timetable</h1>
          </header>

          <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex justify-center items-start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  hasTask: datesWithTasks,
                }}
                modifiersStyles={{
                  hasTask: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                  },
                }}
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Tasks for {selectedDate ? format(selectedDate, "MMMM dd, yyyy") : "..."}
              </h2>
              
              {tasksForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {tasksForSelectedDate.map((task) => (
                    <TaskCard
                      key={task.id}
                      taskId={task.id}
                      title={task.title}
                      description={task.description || undefined}
                      priority={task.priority}
                      dueDate={new Date(task.due_date)}
                      showCheckbox={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tasks scheduled for this date.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Calendar;
