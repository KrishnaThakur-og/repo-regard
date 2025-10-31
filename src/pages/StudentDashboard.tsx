import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Classroom {
  id: string;
  name: string;
  invitation_code: string;
  teacher_id: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
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

    if (roles?.role !== "student") {
      navigate("/dashboard");
      return;
    }

    setUserRole(roles.role);
    await loadClassrooms(session.user.id);
    setLoading(false);
  };

  const loadClassrooms = async (studentId: string) => {
    const { data: memberData } = await supabase
      .from("classroom_members")
      .select("classroom_id")
      .eq("student_id", studentId);

    if (memberData && memberData.length > 0) {
      const { data: classroomData } = await supabase
        .from("classrooms")
        .select("*")
        .in("id", memberData.map(m => m.classroom_id));
      
      if (classroomData) {
        setClassrooms(classroomData);
      }
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Find classroom by invitation code using secure function
    const { data: classroomResult, error: findError } = await supabase
      .rpc("get_classroom_by_invitation_code", { _code: invitationCode });

    if (findError || !classroomResult || classroomResult.length === 0) {
      toast.error("Invalid invitation code");
      return;
    }

    const classroom = { id: classroomResult[0].classroom_id };

    // Check if already a member
    const { data: existing } = await supabase
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", classroom.id)
      .eq("student_id", session.user.id)
      .maybeSingle();

    if (existing) {
      toast.error("You are already a member of this classroom");
      return;
    }

    // Join classroom
    const { error: joinError } = await supabase
      .from("classroom_members")
      .insert({
        classroom_id: classroom.id,
        student_id: session.user.id,
      });

    if (joinError) {
      console.error("Join error:", joinError);
      toast.error("Failed to join classroom: " + joinError.message);
    } else {
      toast.success("Successfully joined classroom!");
      setInvitationCode("");
      setShowJoinDialog(false);
      await loadClassrooms(session.user.id);
    }
  };

  const handleLeaveClassroom = async (classroomId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("classroom_members")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("student_id", session.user.id);

    if (error) {
      toast.error("Failed to leave classroom");
    } else {
      toast.success("Successfully left classroom");
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
          <header className="border-b bg-background px-6 py-4 flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">My Classrooms</h1>
          </header>

          <div className="flex-1 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Enrolled Classrooms</h2>
              <Button onClick={() => setShowJoinDialog(true)}>
                <Users className="w-4 h-4 mr-2" />
                Join Classroom
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map((classroom) => (
                <Card key={classroom.id} className="hover:shadow-lg transition-shadow border-primary/10">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{classroom.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          Code: {classroom.invitation_code}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLeaveClassroom(classroom.id)}
                        title="Leave classroom"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View tasks and assignments in the Dashboard
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {classrooms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No classrooms yet</p>
                <p>Join a classroom using an invitation code to get started!</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Classroom</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoinClassroom} className="space-y-4">
            <div>
              <Label htmlFor="invitationCode">Invitation Code</Label>
              <Input
                id="invitationCode"
                placeholder="Enter 8-character code"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
                className="font-mono text-lg tracking-wider"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Ask your teacher for the classroom invitation code
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Join</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowJoinDialog(false)}
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

export default StudentDashboard;
