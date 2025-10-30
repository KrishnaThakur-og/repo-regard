import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, BookOpen, CheckCircle, TrendingUp } from "lucide-react";

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"teacher" | "student" | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
  });
  const [classroomStats, setClassroomStats] = useState<any[]>([]);
  const [taskPriorityData, setTaskPriorityData] = useState<any[]>([]);

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
      await loadAnalytics(roles.role, session.user.id);
    }
    
    setLoading(false);
  };

  const loadAnalytics = async (role: string, userId: string) => {
    if (role === "teacher") {
      // Get teacher's classrooms
      const { data: classrooms } = await supabase
        .from("classrooms")
        .select("id, name")
        .eq("teacher_id", userId);

      if (classrooms && classrooms.length > 0) {
        const classroomIds = classrooms.map(c => c.id);

        // Get total students
        const { count: studentCount } = await supabase
          .from("classroom_members")
          .select("*", { count: "exact", head: true })
          .in("classroom_id", classroomIds);

        // Get all tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, priority, classroom_id")
          .in("classroom_id", classroomIds);

        // Get task completions
        const { data: completions } = await supabase
          .from("task_completions")
          .select("task_id, completed")
          .eq("completed", true);

        const totalTasks = tasks?.length || 0;
        const completedTasks = completions?.length || 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        setStats({
          totalStudents: studentCount || 0,
          totalTasks,
          completedTasks,
          completionRate,
        });

        // Classroom-wise stats
        const classroomData = await Promise.all(
          classrooms.map(async (classroom) => {
            const { count: studentCount } = await supabase
              .from("classroom_members")
              .select("*", { count: "exact", head: true })
              .eq("classroom_id", classroom.id);

            const { data: classroomTasks } = await supabase
              .from("tasks")
              .select("id")
              .eq("classroom_id", classroom.id);

            return {
              name: classroom.name,
              students: studentCount || 0,
              tasks: classroomTasks?.length || 0,
            };
          })
        );

        setClassroomStats(classroomData);

        // Task priority distribution
        const priorityCounts = {
          high: 0,
          medium: 0,
          low: 0,
        };

        tasks?.forEach(task => {
          priorityCounts[task.priority as keyof typeof priorityCounts]++;
        });

        setTaskPriorityData([
          { name: "High Priority", value: priorityCounts.high, color: "#EF4444" },
          { name: "Medium Priority", value: priorityCounts.medium, color: "#F59E0B" },
          { name: "Low Priority", value: priorityCounts.low, color: "#10B981" },
        ]);
      }
    } else {
      // Student analytics
      const { data: memberships } = await supabase
        .from("classroom_members")
        .select("classroom_id")
        .eq("student_id", userId);

      if (memberships && memberships.length > 0) {
        const classroomIds = memberships.map(m => m.classroom_id);

        // Get all tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, priority")
          .in("classroom_id", classroomIds);

        // Get student's completions
        const { data: completions } = await supabase
          .from("task_completions")
          .select("task_id, completed")
          .eq("student_id", userId);

        const totalTasks = tasks?.length || 0;
        const completedTasks = completions?.filter(c => c.completed).length || 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        setStats({
          totalStudents: 0,
          totalTasks,
          completedTasks,
          completionRate,
        });

        // Task priority distribution for student
        const priorityCounts = {
          high: 0,
          medium: 0,
          low: 0,
        };

        tasks?.forEach(task => {
          priorityCounts[task.priority as keyof typeof priorityCounts]++;
        });

        setTaskPriorityData([
          { name: "High Priority", value: priorityCounts.high, color: "#EF4444" },
          { name: "Medium Priority", value: priorityCounts.medium, color: "#F59E0B" },
          { name: "Low Priority", value: priorityCounts.low, color: "#10B981" },
        ]);
      }
    }
  };

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
            <h1 className="text-xl font-semibold">Analytics & Performance</h1>
          </header>

          <div className="flex-1 p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {userRole === "teacher" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">Across all classrooms</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {userRole === "teacher" ? "Created" : "Assigned to you"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedTasks}</div>
                  <p className="text-xs text-muted-foreground">Tasks marked as done</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completionRate}%</div>
                  <p className="text-xs text-muted-foreground">Overall progress</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {userRole === "teacher" && classroomStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Classroom Overview</CardTitle>
                    <CardDescription>Students and tasks per classroom</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={classroomStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="students" fill="hsl(var(--primary))" name="Students" />
                        <Bar dataKey="tasks" fill="hsl(var(--accent))" name="Tasks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {taskPriorityData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Task Priority Distribution</CardTitle>
                    <CardDescription>Breakdown of tasks by priority level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={taskPriorityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {taskPriorityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {stats.totalTasks === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No data available yet</p>
                <p>
                  {userRole === "teacher"
                    ? "Create tasks and classrooms to see analytics"
                    : "Join classrooms and complete tasks to track your progress"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Analytics;
