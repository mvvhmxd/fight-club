import { trpc } from "@/lib/trpc";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check, ChevronDown, ChevronRight, GripVertical,
  Loader2, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Inline editable text ────────────────────────────────────────────────────

function InlineEdit({
  value, onSave, className = "",
}: { value: string; onSave: (v: string) => Promise<void>; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const cancel = () => { setEditing(false); setDraft(value); };
  const save = async () => {
    if (!draft.trim() || draft === value) { cancel(); return; }
    setSaving(true);
    try { await onSave(draft.trim()); setEditing(false); }
    catch { /* error toast handled by caller */ }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="flex-1 bg-background border border-primary rounded px-2 py-0.5 text-sm font-semibold text-foreground focus:outline-none"
        />
        <button onClick={save} disabled={saving} className="text-green-400 hover:text-green-300 p-0.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={start} className={`flex items-center gap-1.5 group text-left ${className}`}>
      <span className="font-semibold text-sm text-foreground">{value}</span>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}

// ─── Topic context editor ─────────────────────────────────────────────────────

function ContextEditor({ topicId, initial }: { topicId: string; initial: string | null }) {
  const [draft, setDraft] = useState(initial ?? "");
  const [saved, setSaved] = useState(true);
  const update = trpc.admin.updateTopic.useMutation({
    onSuccess: () => { toast.success("Context saved"); setSaved(true); },
    onError: e => toast.error(e.message),
  });

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">Context Paragraph</p>
      <p className="text-[11px] text-muted-foreground/70">
        Explain why this topic matters and what learners should focus on (The Odin Project-style intro).
      </p>
      <textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); setSaved(false); }}
        placeholder="e.g. Before diving into transformers, it's important to understand the attention mechanism at a high level..."
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-24"
      />
      <Button
        size="sm"
        className="h-7 text-xs"
        disabled={saved || update.isPending}
        onClick={() => update.mutate({ id: topicId, contextParagraph: draft })}
      >
        {update.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
        {saved ? "Saved" : "Save Context"}
      </Button>
    </div>
  );
}

// ─── Sortable Stage Row ───────────────────────────────────────────────────────

function SortableStageRow({
  stage, index, isExpanded, onToggle, onDelete, onRename, children,
}: {
  stage: any; index: number; isExpanded: boolean;
  onToggle: () => void; onDelete: () => void;
  onRename: (v: string) => Promise<void>; children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 shrink-0 touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{index + 1}.</span>
        <InlineEdit value={stage.name} onSave={onRename} className="flex-1 min-w-0" />
        <span className="text-xs text-muted-foreground shrink-0">({(stage.topics ?? []).length} topics)</span>
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      {isExpanded && children}
    </div>
  );
}

// ─── Sortable Topic Row ───────────────────────────────────────────────────────

function SortableTopicRow({
  topic, isExpanded, onToggle, onDelete, onRename, children,
}: {
  topic: any; isExpanded: boolean;
  onToggle: () => void; onDelete: () => void;
  onRename: (v: string) => Promise<void>; children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 shrink-0 touch-none">
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <InlineEdit value={topic.name} onSave={onRename} className="flex-1 min-w-0 text-xs" />
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground p-0.5 shrink-0">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-6 w-6 p-0 shrink-0" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {isExpanded && children}
    </div>
  );
}

// ─── Sortable Resource Row ────────────────────────────────────────────────────

function SortableResourceRow({ resource, onDelete }: { resource: any; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resource.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 text-xs py-1">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none">
        <GripVertical className="w-3 h-3" />
      </button>
      <span className="text-muted-foreground capitalize shrink-0">[{resource.type}]</span>
      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-foreground hover:text-primary truncate">{resource.title}</a>
      <Button size="sm" variant="ghost" className="text-red-400 h-5 w-5 p-0 shrink-0" onClick={onDelete}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ─── Resource Add Form ────────────────────────────────────────────────────────

function ResourceForm({ topicId, currentCount, onSuccess }: { topicId: string; currentCount: number; onSuccess: () => void }) {
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [type, setType] = useState("article");
  const [isRequired, setIsRequired] = useState(true); const [isFree, setIsFree] = useState(true);
  const [description, setDescription] = useState(""); const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const create = trpc.admin.createResource.useMutation({
    onSuccess: () => { toast.success("Resource added"); onSuccess(); setTitle(""); setUrl(""); setDescription(""); },
    onError: e => toast.error(e.message),
  });

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2 mt-2">
      <p className="text-xs font-semibold text-foreground">Add Resource</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="col-span-2 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" className="col-span-2 bg-background border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <select value={type} onChange={e => setType(e.target.value)} className="bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
          {["article","video","book","course","paper","docs"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} placeholder="Est. minutes" type="number" className="bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Admin note (optional)" className="col-span-2 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} />Required
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} />Free
        </label>
      </div>
      <Button size="sm" disabled={create.isPending || !title.trim() || !url.trim()} onClick={() => create.mutate({ topicId, title, url, type: type as any, isRequired, isFree, description: description || undefined, estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined, orderIndex: currentCount + 1 })}>
        {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}Add Resource
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCurriculum() {
  const { data: stages, isLoading, refetch } = trpc.curriculum.getStages.useQuery();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [newTopicName, setNewTopicName] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const createStage = trpc.admin.createStage.useMutation({ onSuccess: () => { toast.success("Stage created"); refetch(); setNewStageName(""); }, onError: e => toast.error(e.message) });
  const deleteStage = trpc.admin.deleteStage.useMutation({ onSuccess: () => { toast.success("Stage deleted"); refetch(); }, onError: e => toast.error(e.message) });
  const updateStage = trpc.admin.updateStage.useMutation({ onSuccess: () => refetch(), onError: e => toast.error(e.message) });
  const createTopic = trpc.admin.createTopic.useMutation({ onSuccess: () => { toast.success("Topic created"); refetch(); }, onError: e => toast.error(e.message) });
  const deleteTopic = trpc.admin.deleteTopic.useMutation({ onSuccess: () => { toast.success("Topic deleted"); refetch(); }, onError: e => toast.error(e.message) });
  const updateTopic = trpc.admin.updateTopic.useMutation({ onSuccess: () => refetch(), onError: e => toast.error(e.message) });
  const deleteResource = trpc.admin.deleteResource.useMutation({ onSuccess: () => { toast.success("Resource deleted"); refetch(); }, onError: e => toast.error(e.message) });
  const reorderStages = trpc.admin.reorderStages.useMutation({ onSuccess: () => refetch(), onError: e => toast.error(e.message) });
  const reorderTopics = trpc.admin.reorderTopics.useMutation({ onSuccess: () => refetch(), onError: e => toast.error(e.message) });
  const reorderResources = trpc.admin.reorderResources.useMutation({ onSuccess: () => refetch(), onError: e => toast.error(e.message) });

  const handleStageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !stages) return;
    const oldIndex = (stages as any[]).findIndex((s: any) => s.id === active.id);
    const newIndex = (stages as any[]).findIndex((s: any) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(stages as any[], oldIndex, newIndex);
    reorderStages.mutate(reordered.map((s: any, i: number) => ({ id: s.id, orderIndex: i + 1 })));
    toast.success("Stage order saved");
  };

  const handleTopicDragEnd = (stageId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !stages) return;
    const stage = (stages as any[]).find(s => s.id === stageId);
    if (!stage) return;
    const topics = stage.topics ?? [];
    const oldIndex = topics.findIndex((t: any) => t.id === active.id);
    const newIndex = topics.findIndex((t: any) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(topics, oldIndex, newIndex);
    reorderTopics.mutate(reordered.map((t: any, i: number) => ({ id: t.id, orderIndex: i + 1 })));
    toast.success("Topic order saved");
  };

  const handleResourceDragEnd = (topicId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !stages) return;
    let resources: any[] = [];
    for (const stage of (stages as any[])) {
      const topic = (stage.topics ?? []).find((t: any) => t.id === topicId);
      if (topic) { resources = topic.resources ?? []; break; }
    }
    const oldIndex = resources.findIndex((r: any) => r.id === active.id);
    const newIndex = resources.findIndex((r: any) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(resources, oldIndex, newIndex);
    reorderResources.mutate(reordered.map((r: any, i: number) => ({ id: r.id, orderIndex: i + 1 })));
    toast.success("Resource order saved");
  };

  if (isLoading) return <div className="space-y-3 max-w-3xl">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>;

  const stageList = (stages ?? []) as any[];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Curriculum Editor</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Drag ⠿ to reorder. Click a name to rename inline.</p>
      </div>

      {/* Add stage */}
      <div className="flex gap-2">
        <input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="New stage name..." onKeyDown={e => e.key === "Enter" && newStageName.trim() && createStage.mutate({ name: newStageName, orderIndex: stageList.length + 1 })} className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        <Button size="sm" disabled={createStage.isPending || !newStageName.trim()} onClick={() => createStage.mutate({ name: newStageName, orderIndex: stageList.length + 1 })}>
          {createStage.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add Stage
        </Button>
      </div>

      {/* Stages — draggable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStageDragEnd}>
        <SortableContext items={stageList.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {stageList.map((stage, si) => (
              <SortableStageRow
                key={stage.id}
                stage={stage}
                index={si}
                isExpanded={expandedStage === stage.id}
                onToggle={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                onDelete={() => { if (confirm(`Delete stage "${stage.name}"? This will also delete all topics and resources inside it.`)) deleteStage.mutate({ id: stage.id }); }}
                onRename={async (name) => { await updateStage.mutateAsync({ id: stage.id, name }); toast.success("Stage renamed"); }}
              >
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Add topic */}
                  <div className="flex gap-2">
                    <input value={newTopicName[stage.id] ?? ""} onChange={e => setNewTopicName(p => ({ ...p, [stage.id]: e.target.value }))} placeholder="New topic name..." onKeyDown={e => e.key === "Enter" && newTopicName[stage.id]?.trim() && createTopic.mutate({ stageId: stage.id, name: newTopicName[stage.id] ?? "", orderIndex: (stage.topics?.length ?? 0) + 1 })} className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    <Button size="sm" className="h-7 text-xs" disabled={createTopic.isPending || !newTopicName[stage.id]?.trim()} onClick={() => createTopic.mutate({ stageId: stage.id, name: newTopicName[stage.id] ?? "", orderIndex: (stage.topics?.length ?? 0) + 1 })}>
                      <Plus className="w-3 h-3 mr-1" />Add Topic
                    </Button>
                  </div>

                  {/* Topics — draggable */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleTopicDragEnd(stage.id, e)}>
                    <SortableContext items={(stage.topics ?? []).map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {(stage.topics ?? []).map((topic: any) => (
                          <SortableTopicRow
                            key={topic.id}
                            topic={topic}
                            isExpanded={expandedTopic === topic.id}
                            onToggle={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                            onDelete={() => { if (confirm(`Delete topic "${topic.name}"?`)) deleteTopic.mutate({ id: topic.id }); }}
                            onRename={async (name) => { await updateTopic.mutateAsync({ id: topic.id, name }); toast.success("Topic renamed"); }}
                          >
                            <div className="border-t border-border px-3 py-3 space-y-4">
                              {/* Context paragraph editor */}
                              <ContextEditor topicId={topic.id} initial={topic.contextParagraph ?? null} />

                              <div className="border-t border-border pt-3 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Resources</p>
                                {/* Resources — draggable */}
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleResourceDragEnd(topic.id, e)}>
                                  <SortableContext items={(topic.resources ?? []).map((r: any) => r.id)} strategy={verticalListSortingStrategy}>
                                    {(topic.resources ?? []).map((r: any) => (
                                      <SortableResourceRow
                                        key={r.id}
                                        resource={r}
                                        onDelete={() => deleteResource.mutate({ id: r.id })}
                                      />
                                    ))}
                                  </SortableContext>
                                </DndContext>
                                {(topic.resources ?? []).length === 0 && (
                                  <p className="text-xs text-muted-foreground py-1">No resources yet.</p>
                                )}
                                <ResourceForm topicId={topic.id} currentCount={(topic.resources ?? []).length} onSuccess={refetch} />
                              </div>
                            </div>
                          </SortableTopicRow>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </SortableStageRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {stageList.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-lg bg-card">
          <p className="text-sm">No stages yet. Add your first stage above.</p>
        </div>
      )}
    </div>
  );
}
