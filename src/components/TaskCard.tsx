import { useState } from "react";
import { Calendar, Download, Upload, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskCardProps {
  taskId: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  dueDate: Date;
  completed?: boolean;
  onToggleComplete?: () => void;
  showCheckbox?: boolean;
  documentUrl?: string | null;
  documentName?: string | null;
  isStudent?: boolean;
}

const priorityConfig = {
  high: {
    bg: "bg-priority-high-light",
    border: "border-l-priority-high",
    badge: "bg-priority-high text-white",
    label: "High",
  },
  medium: {
    bg: "bg-priority-medium-light",
    border: "border-l-priority-medium",
    badge: "bg-priority-medium text-white",
    label: "Medium",
  },
  low: {
    bg: "bg-priority-low-light",
    border: "border-l-priority-low",
    badge: "bg-priority-low text-white",
    label: "Low",
  },
};

export function TaskCard({
  taskId,
  title,
  description,
  priority,
  dueDate,
  completed = false,
  onToggleComplete,
  showCheckbox = true,
  documentUrl,
  documentName,
  isStudent = false,
}: TaskCardProps) {
  const config = priorityConfig[priority];
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasSubmission, setHasSubmission] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState<{ document_name: string; submitted_at: string } | null>(null);

  const isPastDue = new Date(dueDate) < new Date();

  // Check if student has already submitted
  const checkSubmission = async () => {
    if (!isStudent) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("task_submissions")
      .select("document_name, submitted_at")
      .eq("task_id", taskId)
      .eq("student_id", session.user.id)
      .maybeSingle();

    if (data) {
      setHasSubmission(true);
      setSubmissionInfo(data);
    }
  };

  // Load submission status when dialog opens
  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open) {
      checkSubmission();
    }
  };

  const handleDownloadAssignment = async () => {
    if (!documentUrl) return;

    const { data, error } = await supabase.storage
      .from("assignments")
      .download(documentUrl);

    if (error) {
      toast.error("Failed to download assignment");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = documentName || "assignment";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmitWork = async () => {
    if (!submissionFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (isPastDue) {
      toast.error("Cannot submit after due date");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUploading(true);

    const fileExt = submissionFile.name.split('.').pop();
    const fileName = `${session.user.id}/${taskId}_${Date.now()}.${fileExt}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(fileName, submissionFile);

    if (uploadError) {
      toast.error("Failed to upload submission");
      setUploading(false);
      return;
    }

    // Save submission record
    const { error: dbError } = await supabase
      .from("task_submissions")
      .upsert({
        task_id: taskId,
        student_id: session.user.id,
        document_url: fileName,
        document_name: submissionFile.name,
      });

    setUploading(false);

    if (dbError) {
      toast.error("Failed to save submission");
    } else {
      toast.success("Submission uploaded successfully!");
      setSubmissionFile(null);
      setDialogOpen(false);
      checkSubmission();
    }
  };

  return (
    <div
      className={`${config.bg} ${config.border} border-l-4 rounded-lg p-4 space-y-3 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1">
          {showCheckbox && onToggleComplete && (
            <Checkbox
              checked={completed}
              onCheckedChange={onToggleComplete}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <h3 className={`font-semibold text-foreground ${completed ? "line-through opacity-60" : ""}`}>
              {title}
            </h3>
          </div>
        </div>
        <Badge className={config.badge}>{config.label}</Badge>
      </div>

      {description && (
        <p className={`text-sm text-muted-foreground ${completed ? "line-through opacity-60" : ""}`}>
          {description}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>{format(dueDate, "dd-MM-yyyy")}</span>
        {isPastDue && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
      </div>

      {documentUrl && documentName && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAssignment}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            {documentName}
          </Button>
        </div>
      )}

      {isStudent && (
        <div className="pt-2">
          {hasSubmission ? (
            <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/20 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Submitted</p>
                {submissionInfo && (
                  <p className="text-xs text-green-700 dark:text-green-400">
                    {submissionInfo.document_name} • {format(new Date(submissionInfo.submitted_at), "dd-MM-yyyy HH:mm")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full gap-2"
                  disabled={isPastDue}
                >
                  <Upload className="h-4 w-4" />
                  {isPastDue ? "Submission Closed" : "Submit Work"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Your Work</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Upload Document</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                      onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    {submissionFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {submissionFile.name}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmitWork}
                    disabled={uploading || !submissionFile}
                    className="w-full"
                  >
                    {uploading ? "Uploading..." : "Submit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}
