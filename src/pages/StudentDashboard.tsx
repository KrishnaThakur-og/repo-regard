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
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-accent/5">
        <AppSidebar userRole={userRole || undefined} />
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-sm px-6 py-5 flex items-center gap-4 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                My Classrooms
              </h1>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold">Enrolled Classrooms</h2>
                <p className="text-muted-foreground mt-1">Manage and view your classroom memberships</p>
              </div>
              <Button 
                onClick={() => setShowJoinDialog(true)}
                size="lg"
                className="rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Classroom
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.map((classroom) => (
                <Card 
                  key={classroom.id} 
                  className="group hover:shadow-2xl transition-all duration-300 hover:scale-105 border-primary/20 bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-bl-full -mr-16 -mt-16"></div>
                  <CardHeader className="relative">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                          {classroom.name}
                        </CardTitle>
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-mono font-semibold">
                          <span className="text-xs">Code:</span>
                          {classroom.invitation_code}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLeaveClassroom(classroom.id)}
                        title="Leave classroom"
                        className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      View tasks and assignments in the Dashboard
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {classrooms.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Users className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-foreground">No classrooms yet</h3>
                <p className="text-lg">Join a classroom using an invitation code to get started!</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Join Classroom
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoinClassroom} className="space-y-6">
            <div>
              <Label htmlFor="invitationCode" className="text-base font-semibold">
                Invitation Code
              </Label>
              <Input
                id="invitationCode"
                placeholder="Enter 8-character code"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
                className="font-mono text-xl tracking-wider mt-2 h-14 rounded-xl border-primary/20 focus:border-primary/40"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Ask your teacher for the classroom invitation code
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                type="submit" 
                size="lg"
                className="flex-1 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Join Now
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowJoinDialog(false)}
                className="rounded-xl"
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
