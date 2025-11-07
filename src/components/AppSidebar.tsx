import { CheckSquare, Calendar, BarChart3, ClipboardList, User, LogOut, GraduationCap, Info } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  userRole?: "teacher" | "student";
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const teacherItems = [
    { title: "Tasks", url: "/dashboard", icon: CheckSquare },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Assignments", url: "/assignments", icon: ClipboardList },
  ];

  const studentItems = [
    { title: "Tasks", url: "/dashboard", icon: CheckSquare },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "My Classrooms", url: "/student-dashboard", icon: User },
  ];

  const items = userRole === "teacher" ? teacherItems : studentItems;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm" 
      : "hover:bg-sidebar-accent/50 transition-all duration-200";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                StudyX
              </span>
              <p className="text-xs text-muted-foreground capitalize">{userRole || "User"}</p>
            </div>
          )}
        </div>

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider font-semibold">
            {!collapsed && "Main Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/about" className={getNavCls}>
                    <Info className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">About Us</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-2">
          <div className="flex items-center justify-center gap-2">
            {!collapsed && <span className="text-sm text-muted-foreground">Theme</span>}
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Log Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
