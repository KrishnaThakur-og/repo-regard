import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

const About = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-background px-6 py-4 flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">About Us</h1>
          </header>

          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">StudyX</h2>
                <p className="text-muted-foreground">Your Learning Companion</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    StudyX is designed to bridge the gap between teachers and students, making task management
                    and classroom collaboration seamless and efficient. We believe in empowering educators and
                    learners with tools that simplify organization and enhance productivity.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Task management with priority levels</li>
                    <li>• Classroom creation and management</li>
                    <li>• Easy joining with invitation codes</li>
                    <li>• Calendar view for all assignments</li>
                    <li>• Progress tracking for students</li>
                    <li>• Real-time updates and notifications</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Get Started</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Whether you're a teacher looking to organize your classroom or a student wanting to stay
                    on top of assignments, StudyX is here to help. Create an account, join or create a classroom,
                    and start managing your academic life more effectively!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default About;
