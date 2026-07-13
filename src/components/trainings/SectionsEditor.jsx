import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ArrowUp, ArrowDown, Video, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import QuizEditor from "@/components/trainings/QuizEditor";

export default function SectionsEditor({ sections = [], onChange, trainingTitle = "" }) {
  const [expanded, setExpanded] = useState({});

  const addSection = () => {
    const newSection = {
      id: Date.now().toString() + Math.random(),
      title: "",
      description: "",
      video_url: "",
      content: "",
      quiz: []
    };
    onChange([...sections, newSection]);
    setExpanded(prev => ({ ...prev, [newSection.id]: true }));
  };

  const updateSection = (idx, field, value) => {
    onChange(sections.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeSection = (idx) => {
    onChange(sections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx, direction) => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    onChange(newSections);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-1">
        <Label className="text-base font-bold">Sections</Label>
        <Button type="button" size="sm" variant="outline" onClick={addSection} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Section
        </Button>
      </div>
      <p className="text-xs text-slate-400 mb-3">Add multiple sections — each with its own video and quiz. Great for multi-part trainings.</p>

      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={section.id} className="border rounded-lg bg-white overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-200">
              <button type="button" onClick={() => toggleExpand(section.id)} className="p-1 text-slate-400 hover:text-slate-700">
                <ChevronDown className={cn("w-4 h-4 transition-transform", !expanded[section.id] && "-rotate-90")} />
              </button>
              <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
              <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                {section.title || "(Untitled Section)"}
              </span>
              {section.video_url && <Video className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
              {section.quiz?.length > 0 && <span className="flex items-center gap-0.5 text-xs text-slate-400"><ListChecks className="w-3 h-3" />{section.quiz.length}</span>}
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => moveSection(idx, "up")} disabled={idx === 0} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => moveSection(idx, "down")} disabled={idx === sections.length - 1} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <button type="button" onClick={() => removeSection(idx)} className="p-0.5 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {expanded[section.id] && (
              <div className="p-3 space-y-3">
                <div>
                  <Label>Section Title</Label>
                  <Input value={section.title} onChange={e => updateSection(idx, "title", e.target.value)} placeholder="e.g., Part 1: Safety Overview" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={section.description} onChange={e => updateSection(idx, "description", e.target.value)} placeholder="Brief description of this section" />
                </div>
                <div>
                  <Label>Video URL</Label>
                  <Input value={section.video_url} onChange={e => updateSection(idx, "video_url", e.target.value)} placeholder="YouTube, Vimeo, or direct video file" />
                </div>
                <div>
                  <Label>Content / Steps</Label>
                  <Textarea value={section.content} onChange={e => updateSection(idx, "content", e.target.value)} placeholder="Training material for this section" rows={3} />
                </div>
                <QuizEditor
                  quiz={section.quiz || []}
                  onChange={(quiz) => updateSection(idx, "quiz", quiz)}
                  trainingTitle={`${trainingTitle} - ${section.title || `Section ${idx + 1}`}`}
                  trainingDescription={section.description}
                  videoUrl={section.video_url}
                />
              </div>
            )}
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No sections yet. Add a section to include its own video and quiz.</p>
        )}
      </div>
    </div>
  );
}