import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TaskCard } from "@/components/TaskCard";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  due_date: string;
  classroom_id: string;
}

interface TaskCompletion {
  task_id: string;
  completed: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<"teacher" | "student" | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // New task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"medium" | "high" | "low">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [classrooms, setClassrooms] = useState<any[]>([]);

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  const checkAuthAndRole = async () => {
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
      await loadUserData(roles.role, session.user.id);
    }
    
    setLoading(false);
  };

  const loadUserData = async (role: string, userId: string) => {
    if (role === "teacher") {
      // Load teacher's classrooms
      const { data: classroomData } = await supabase
        .from("classrooms")
        .select("*")
        .eq("teacher_id", userId);
      
      if (classroomData && classroomData.length > 0) {
        setClassrooms(classroomData);
        setSelectedClassroom(classroomData[0].id);
        
        // Load tasks for all teacher's classrooms
        const { data: taskData } = await supabase
          .from("tasks")
          .select("*")
          .in("classroom_id", classroomData.map(c => c.id))
          .order("due_date", { ascending: true });
        
        if (taskData) setTasks(taskData as Task[]);
      }
    } else {
      // Load student's tasks from their classrooms
      const { data: memberData } = await supabase
        .from("classroom_members")
        .select("classroom_id")
        .eq("student_id", userId);
      
      if (memberData && memberData.length > 0) {
        const classroomIds = memberData.map(m => m.classroom_id);
        
        const { data: taskData } = await supabase
          .from("tasks")
          .select("*")
          .in("classroom_id", classroomIds)
          .order("due_date", { ascending: true });
        
        if (taskData) setTasks(taskData as Task[]);

        // Load task completions
        const { data: completionData } = await supabase
          .from("task_completions")
          .select("task_id, completed")
          .eq("student_id", userId);
        
        if (completionData) setTaskCompletions(completionData);
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClassroom) {
      toast.error("Please select a classroom first");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("tasks").insert({
      classroom_id: selectedClassroom,
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      due_date: taskDueDate,
      created_by: session.user.id,
    });

    if (error) {
      toast.error("Failed to create task");
    } else {
      toast.success("Task created successfully!");
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskDueDate("");
      setShowTaskForm(false);
      checkAuthAndRole(); // Reload tasks
    }
  };

  const handleToggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("task_completions")
      .upsert({
        task_id: taskId,
        student_id: session.user.id,
        completed: !currentStatus,
        completed_at: !currentStatus ? new Date().toISOString() : null,
      });

    if (error) {
      toast.error("Failed to update task");
    } else {
      setTaskCompletions(prev => {
        const existing = prev.find(tc => tc.task_id === taskId);
        if (existing) {
          return prev.map(tc => 
            tc.task_id === taskId ? { ...tc, completed: !currentStatus } : tc
          );
        }
        return [...prev, { task_id: taskId, completed: !currentStatus }];
      });
      toast.success(!currentStatus ? "Task marked as complete!" : "Task marked as incomplete");
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search the Task..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {userRole === "teacher" && (
              <div className="bg-card rounded-lg p-6 space-y-4">
                {!showTaskForm ? (
                  <Button onClick={() => setShowTaskForm(true)} className="w-full sm:w-auto">
                    Add Task
                  </Button>
                ) : (
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Add New Task</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowTaskForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div>
                      <Input
                        placeholder="Task Title"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Textarea
                        placeholder="Task Description..."
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Task Priority:</Label>
                      <RadioGroup
                        value={taskPriority}
                        onValueChange={(value: "high" | "medium" | "low") => setTaskPriority(value)}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="high" />
                          <Label htmlFor="high">High</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <Label htmlFor="medium">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="low" />
                          <Label htmlFor="low">Low</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Input
                        type="date"
                        placeholder="DD-MM-YYYY"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full sm:w-auto">
                      Add Task
                    </Button>
                  </form>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => {
                const completion = taskCompletions.find(tc => tc.task_id === task.id);
                return (
                  <TaskCard
                    key={task.id}
                    title={task.title}
                    description={task.description || undefined}
                    priority={task.priority}
                    dueDate={new Date(task.due_date)}
                    completed={completion?.completed}
                    onToggleComplete={
                      userRole === "student"
                        ? () => handleToggleTaskCompletion(task.id, completion?.completed || false)
                        : undefined
                    }
                    showCheckbox={userRole === "student"}
                  />
                );
              })}
            </div>

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks found. {userRole === "teacher" ? "Create your first task!" : "Join a classroom to see tasks."}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
