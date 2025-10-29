import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface TaskCardProps {
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  dueDate: Date;
  completed?: boolean;
  onToggleComplete?: () => void;
  showCheckbox?: boolean;
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
  title,
  description,
  priority,
  dueDate,
  completed = false,
  onToggleComplete,
  showCheckbox = true,
}: TaskCardProps) {
  const config = priorityConfig[priority];

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
      </div>
    </div>
  );
}
