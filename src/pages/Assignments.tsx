import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Users, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { z } from "zod";

interface Classroom {
  id: string;
  name: string;
  invitation_code: string;
  created_at: string;
  student_count?: number;
}
const classSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters"),
});

const Assignments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
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

    if (roles?.role !== "teacher") {
      navigate("/dashboard");
      return;
    }

    setUserRole(roles.role);
    await loadClassrooms(session.user.id);
    setLoading(false);
  };

  const loadClassrooms = async (teacherId: string) => {
    const { data: classroomData } = await supabase
      .from("classrooms")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (classroomData) {
      // Get student count for each classroom
      const classroomsWithCounts = await Promise.all(
        classroomData.map(async (classroom) => {
          const { count } = await supabase
            .from("classroom_members")
            .select("*", { count: "exact", head: true })
            .eq("classroom_id", classroom.id);
          
          return { ...classroom, student_count: count || 0 };
        })
      );
      
      setClassrooms(classroomsWithCounts);
    }
  };

  const generateInvitationCode = async () => {
    // Generate cryptographically secure code
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    const code = Array.from(array)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 8)
      .toUpperCase();
    
    // Verify uniqueness
    const { data: existing } = await supabase
      .from('classrooms')
      .select('id')
      .eq('invitation_code', code)
      .maybeSingle();
    
    // Regenerate if collision (unlikely but possible)
    if (existing) {
      return generateInvitationCode();
    }
    
    return code;
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = classSchema.safeParse({ name: newClassName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid classroom name");
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const invitationCode = await generateInvitationCode();

      const { error } = await supabase.from("classrooms").insert({
        teacher_id: session.user.id,
        name: parsed.data.name,
        invitation_code: invitationCode,
      });

      if (error) {
        console.error("Classroom creation error:", error);
        const message = error.message?.includes("row-level security")
          ? "You don't have permission to create classrooms. Ensure your account role is set to 'teacher'."
          : `Failed to create classroom: ${error.message}`;
        toast.error(message);
        return;
      }

      // Optimistically add the new classroom to the UI
      const newClassroom: Classroom = {
        id: crypto.randomUUID(), // Temporary ID until we reload
        name: parsed.data.name,
        invitation_code: invitationCode,
        created_at: new Date().toISOString(),
        student_count: 0,
      };
      
      setClassrooms(prev => [newClassroom, ...prev]);
      
      toast.success("Classroom created successfully!");
      setNewClassName("");
      setShowCreateDialog(false);
      
      // Reload classrooms in the background to get the real data
      await loadClassrooms(session.user.id);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invitation code copied!");
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    const { error } = await supabase
      .from("classrooms")
      .delete()
      .eq("id", classroomId);

    if (error) {
      toast.error("Failed to delete classroom");
    } else {
      toast.success("Classroom deleted successfully");
      setClassrooms(classrooms.filter(c => c.id !== classroomId));
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
          <header className="border-b bg-background px-6 py-4 flex items-center gap-4 bg-gradient-to-r from-primary/5 to-transparent">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Classroom Management</h1>
          </header>

          <div className="flex-1 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Classrooms</h2>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Classroom
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map((classroom) => (
                <Card key={classroom.id} className="hover:shadow-lg transition-shadow border-primary/10 animate-fade-in">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{classroom.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Users className="w-4 h-4" />
                          {classroom.student_count} students
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClassroom(classroom.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>Invitation Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={classroom.invitation_code}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyCode(classroom.invitation_code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {classrooms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No classrooms yet. Create your first classroom to get started!</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Classroom</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClassroom} className="space-y-4">
            <div>
              <Label htmlFor="className">Classroom Name</Label>
              <Input
                id="className"
                placeholder="e.g., Math 101, English Literature"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Assignments;
