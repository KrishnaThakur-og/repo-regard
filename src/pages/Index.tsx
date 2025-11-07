import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckSquare, Users, Calendar } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 animate-gradient-shift"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)] animate-pulse-slow"></div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="flex justify-center mb-8">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/20 animate-float">
              <GraduationCap className="w-16 h-16 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient-x">
            Welcome to StudyX
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            Streamline your classroom experience with intelligent task management, 
            seamless collaboration, and powerful organization tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-12 py-7 h-auto rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/about")}
              className="text-lg px-12 py-7 h-auto rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            >
              Learn More
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-28">
          <div className="group bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:scale-105 duration-300 border border-primary/20 hover:border-primary/40">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <CheckSquare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Task Management</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Organize assignments with priority levels, due dates, and progress tracking
            </p>
          </div>

          <div className="group bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:scale-105 duration-300 border border-accent/20 hover:border-accent/40">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Classroom Collaboration</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Teachers create classrooms, students join with invitation codes
            </p>
          </div>

          <div className="group bg-card/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all hover:scale-105 duration-300 border border-primary/20 hover:border-accent/40">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">Calendar View</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Visualize all tasks and deadlines in an intuitive calendar interface
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
