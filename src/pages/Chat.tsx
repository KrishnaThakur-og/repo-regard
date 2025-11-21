import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Paperclip, Mic, Image, FileText, X } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";

interface Teacher {
  id: string;
  full_name: string;
  classroom_id: string;
  classroom_name: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
}

export default function Chat() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<"teacher" | "student">("student");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && userRole === "student") {
      fetchTeachers();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      navigate("/auth");
      return;
    }
    setUser(currentUser);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (roleData) {
      setUserRole(roleData.role as "teacher" | "student");
    } else {
      toast.error("User role not found");
      navigate("/auth");
    }
  };

  const fetchTeachers = async () => {
    // First get the classrooms the student is a member of
    const { data: memberships } = await supabase
      .from("classroom_members")
      .select("classroom_id")
      .eq("student_id", user.id);

    if (!memberships || memberships.length === 0) {
      setTeachers([]);
      return;
    }

    const classroomIds = memberships.map(m => m.classroom_id);

    // Get classroom details
    const { data: classrooms } = await supabase
      .from("classrooms")
      .select("id, name, teacher_id")
      .in("id", classroomIds);

    if (!classrooms || classrooms.length === 0) {
      setTeachers([]);
      return;
    }

    // Get unique teacher IDs
    const teacherIds = [...new Set(classrooms.map(c => c.teacher_id))];

    // Get teacher profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", teacherIds);

    if (!profiles) {
      setTeachers([]);
      return;
    }

    // Build teacher list with classroom info
    const teacherList: Teacher[] = classrooms.map((classroom) => {
      const profile = profiles.find(p => p.id === classroom.teacher_id);
      return {
        id: classroom.teacher_id,
        full_name: profile?.full_name || "Unknown Teacher",
        classroom_id: classroom.id,
        classroom_name: classroom.name,
      };
    });

    setTeachers(teacherList);
  };

  const selectTeacher = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("student_id", user.id)
      .eq("teacher_id", teacher.id)
      .eq("classroom_id", teacher.classroom_id)
      .single();

    if (existingConv) {
      setConversationId(existingConv.id);
    } else {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          student_id: user.id,
          teacher_id: teacher.id,
          classroom_id: teacher.classroom_id,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Failed to create conversation");
        return;
      }
      setConversationId(newConv.id);
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-files")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("chat-files")
      .getPublicUrl(fileName);

    return { url: publicUrl, name: file.name, type: file.type };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setSelectedFile(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async () => {
    if (!conversationId || (!newMessage.trim() && !selectedFile)) return;

    setIsUploading(true);
    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: newMessage.trim() || null,
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
      });

      if (error) throw error;

      setNewMessage("");
      setSelectedFile(null);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="h-4 w-4" />;
    if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (fileType.startsWith("audio/")) return <Mic className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar userRole={userRole} />
          <div className="flex-1 flex flex-col">
            <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
              <div className="flex h-16 items-center gap-4 px-6">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold">Chat</h1>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              {userRole === "student" && (
                <div className="w-80 border-r border-border bg-muted/50">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-2">
                      <h2 className="text-sm font-semibold text-muted-foreground mb-4">
                        Your Teachers
                      </h2>
                      {teachers.map((teacher) => (
                        <Button
                          key={teacher.id}
                          variant={selectedTeacher?.id === teacher.id ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                          onClick={() => selectTeacher(teacher)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {teacher.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{teacher.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {teacher.classroom_name}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                {selectedTeacher ? (
                  <>
                    <div className="border-b border-border p-4 bg-background">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {selectedTeacher.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{selectedTeacher.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedTeacher.classroom_name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender_id === user.id ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.sender_id === user.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {message.content && (
                                <p className="text-sm">{message.content}</p>
                              )}
                              {message.file_url && (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 mt-2 text-sm underline"
                                >
                                  {getFileIcon(message.file_type)}
                                  {message.file_name}
                                </a>
                              )}
                              <span className="text-xs opacity-70 mt-1 block">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="border-t border-border p-4 bg-background">
                      {selectedFile && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded">
                          {getFileIcon(selectedFile.type)}
                          <span className="text-sm flex-1 truncate">
                            {selectedFile.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx,audio/*"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant={isRecording ? "destructive" : "ghost"}
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          <Mic className="h-5 w-5" />
                        </Button>
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                          disabled={isUploading}
                        />
                        <Button onClick={sendMessage} disabled={isUploading}>
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a teacher to start chatting
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
