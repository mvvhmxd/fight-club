import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const MILESTONE_OPTIONS = ["reading", "video", "notes", "coding", "mini_project", "quiz", "discussion"];

export default function AdminTasks() {
  const { data: stages, isLoading } = trpc.curriculum.getStages.useQuery();
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>(["reading"]);

  const createTask = trpc.admin.createTask.useMutation({
    onSuccess: () => { toast.success("Task created!"); setTitle(""); setDescription(""); },
    onError: e => toast.error(e.message),
  });

  const toggleMilestone = (m: string) => {
    setSelectedMilestones(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const allTopics = (stages ?? []).flatMap((s: any) => (s.topics ?? []).map((t: any) => ({ ...t, stageName: s.name })));

  if (isLoading) return <div className="space-y-3 max-w-2xl">{[1,2].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly Task Assignment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Create and assign weekly tasks to topics.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Create Task</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic</label>
            <select value={selectedTopicId} onChange={e => setSelectedTopicId(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">Select a topic...</option>
              {allTopics.map((t: any) => <option key={t.id} value={t.id}>{t.stageName} → {t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Task Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 1: Foundations" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Task description..." className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Week #</label>
              <input type="number" value={weekNumber} onChange={e => setWeekNumber(e.target.value)} min="1" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Assigned Date</label>
              <input type="date" value={assignedDate} onChange={e => setAssignedDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Required Milestones</label>
            <div className="flex flex-wrap gap-2">
              {MILESTONE_OPTIONS.map(m => (
                <button
                  key={m}
                  onClick={() => toggleMilestone(m)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors capitalize ${selectedMilestones.includes(m) ? "bg-primary/20 border-primary/40 text-primary" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={createTask.isPending || !selectedTopicId || !title.trim() || !dueDate || selectedMilestones.length === 0}
            onClick={() => createTask.mutate({
              topicId: selectedTopicId,
              weekNumber: parseInt(weekNumber),
              title,
              description: description || undefined,
              assignedDate: new Date(assignedDate).toISOString(),
              dueDate: new Date(dueDate).toISOString(),
              requiredMilestones: selectedMilestones as any,
            })}
          >
            {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Task
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
