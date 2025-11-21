import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  task_id: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    checkDueDatesAndOverdue();
    subscribeToNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const checkDueDatesAndOverdue = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "student") return;

    // Get tasks from user's classrooms
    const { data: tasks } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        classroom_id,
        classroom_members!inner(student_id)
      `)
      .eq("classroom_members.student_id", user.id);

    if (!tasks) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const task of tasks) {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      // Check if notification already exists for this task
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("task_id", task.id)
        .in("type", ["due_soon", "overdue"])
        .single();

      if (existingNotif) continue;

      // Due tomorrow
      if (dueDate.getTime() === tomorrow.getTime()) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "due_soon",
          title: "Task Due Tomorrow",
          message: `"${task.title}" is due tomorrow!`,
          task_id: task.id,
        });
      }

      // Overdue
      if (dueDate < today) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "overdue",
          title: "Task Overdue",
          message: `"${task.title}" is overdue!`,
          task_id: task.id,
        });
      }
    }

    fetchNotifications();
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          toast.info((payload.new as Notification).title, {
            description: (payload.new as Notification).message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.task_id) {
      navigate("/assignments");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h3 className="font-semibold mb-2">Notifications</h3>
          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No notifications
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.read
                        ? "bg-muted/50 hover:bg-muted"
                        : "bg-primary/10 hover:bg-primary/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
