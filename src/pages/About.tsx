import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, CheckSquare, Users, Calendar, Mail, Phone, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 animate-gradient-shift"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
              <GraduationCap className="w-14 h-14 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              About StudyX
            </h1>
            <p className="text-xl text-muted-foreground">Your Complete Learning Management Platform</p>
          </div>

          {/* Mission */}
          <Card className="border-primary/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-lg leading-relaxed">
                StudyX is designed to revolutionize the educational experience by bridging the gap between teachers and students. 
                Our platform makes task management and classroom collaboration seamless, efficient, and enjoyable.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                We believe in empowering educators and learners with intuitive tools that simplify organization, 
                enhance productivity, and foster a collaborative learning environment where everyone can thrive.
              </p>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card className="border-accent/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Smart Task Management</h4>
                    <p className="text-muted-foreground">Priority levels, due dates, and progress tracking for all assignments</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Classroom Collaboration</h4>
                    <p className="text-muted-foreground">Easy classroom creation and joining with secure invitation codes</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Calendar Integration</h4>
                    <p className="text-muted-foreground">Visualize all tasks and deadlines in an intuitive calendar view</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Real-time Analytics</h4>
                    <p className="text-muted-foreground">Track student progress and classroom performance instantly</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="border-primary/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-primary">For Teachers</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Create your account and set up your profile</li>
                    <li>Create classrooms and generate unique invitation codes</li>
                    <li>Add assignments with priority levels and due dates</li>
                    <li>Monitor student progress and completion rates</li>
                    <li>Analyze classroom performance with built-in analytics</li>
                  </ol>
                </div>
                
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-accent">For Students</h4>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Sign up and complete your student profile</li>
                    <li>Join classrooms using invitation codes from teachers</li>
                    <li>View all assignments in an organized dashboard</li>
                    <li>Track your progress and upcoming deadlines</li>
                    <li>Stay organized with the calendar view</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-accent/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl">Get In Touch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-muted-foreground">support@studyx.edu</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="text-muted-foreground">123 Education Street, Learning City, ED 12345</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center pt-8">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-12 py-7 h-auto rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 bg-gradient-to-r from-primary to-accent"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
