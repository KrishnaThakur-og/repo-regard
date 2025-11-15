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
  document_url?: string | null;
  document_name?: string | null;
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
  const [taskDocument, setTaskDocument] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

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

    setUploadingDocument(true);
    let documentUrl = null;
    let documentName = null;

    // Upload document if provided
    if (taskDocument) {
      const fileExt = taskDocument.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(fileName, taskDocument);

      if (uploadError) {
        toast.error("Failed to upload document");
        setUploadingDocument(false);
        return;
      }

      documentUrl = fileName;
      documentName = taskDocument.name;
    }

    const { error } = await supabase.from("tasks").insert({
      classroom_id: selectedClassroom,
      title: taskTitle,
      description: taskDescription,
      priority: taskPriority,
      due_date: taskDueDate,
      created_by: session.user.id,
      document_url: documentUrl,
      document_name: documentName,
    });

    setUploadingDocument(false);

    if (error) {
      toast.error("Failed to create task");
    } else {
      toast.success("Task created successfully!");
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskDueDate("");
      setTaskDocument(null);
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
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <AppSidebar userRole={userRole || undefined} />
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-sm px-6 py-5 flex items-center gap-4 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {userRole === "teacher" ? "Teacher Dashboard" : "Student Dashboard"}
              </h2>
            </div>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-10 h-11 rounded-xl border-primary/20 focus:border-primary/40 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {userRole === "teacher" && (
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 space-y-4 shadow-xl border border-primary/20">
                {!showTaskForm ? (
                  <Button 
                    onClick={() => setShowTaskForm(true)} 
                    size="lg"
                    className="w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    Add New Task
                  </Button>
                ) : (
                  <form onSubmit={handleAddTask} className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Add New Task
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowTaskForm(false)}
                        className="rounded-lg"
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
                      <Label>Select Classroom:</Label>
                      <select
                        value={selectedClassroom}
                        onChange={(e) => setSelectedClassroom(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select a classroom</option>
                        {classrooms.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Due Date:</Label>
                      <Input
                        type="date"
                        placeholder="DD-MM-YYYY"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <Label>Attach Document (Optional):</Label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                        onChange={(e) => setTaskDocument(e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      {taskDocument && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Selected: {taskDocument.name}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={uploadingDocument}
                      className="w-full sm:w-auto rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      {uploadingDocument ? "Uploading..." : "Create Task"}
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
                    taskId={task.id}
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
                    documentUrl={task.document_url}
                    documentName={task.document_name}
                    isStudent={userRole === "student"}
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
