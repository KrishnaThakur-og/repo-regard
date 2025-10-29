import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Classroom {
  id: string;
  name: string;
  classrooms: {
    name: string;
  };
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
    const { data } = await supabase
      .from("classroom_members")
      .select(`
        id,
        classroom_id,
        classrooms (
          name
        )
      `)
      .eq("student_id", studentId);

    if (data) {
      setClassrooms(data as any);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Find classroom by invitation code
    const { data: classroom, error: findError } = await supabase
      .from("classrooms")
      .select("id")
      .eq("invitation_code", invitationCode.toUpperCase())
      .single();

    if (findError || !classroom) {
      toast.error("Invalid invitation code");
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("classroom_members")
      .select("id")
      .eq("classroom_id", classroom.id)
      .eq("student_id", session.user.id)
      .single();

    if (existing) {
      toast.error("You're already a member of this classroom");
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
      toast.error("Failed to join classroom");
    } else {
      toast.success("Successfully joined classroom!");
      setInvitationCode("");
      setShowJoinDialog(false);
      await loadClassrooms(session.user.id);
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
                <LogIn className="w-4 h-4 mr-2" />
                Join Classroom
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map((classroom) => (
                <Card key={classroom.id}>
                  <CardHeader>
                    <CardTitle>{classroom.classrooms.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Classroom
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {classrooms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>You haven't joined any classrooms yet. Enter an invitation code to get started!</p>
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
                placeholder="Enter 6-character code"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono uppercase"
                required
              />
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
