import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function ReviewForm({ questions, onSubmit, onCancel, initialAnswers = {} }) {
  const [answers, setAnswers] = useState(initialAnswers);

  const handleSubmit = (isDraft) => {
    onSubmit(answers, isDraft);
  };

  const renderQuestion = (q) => {
    const value = answers[q.id] || "";

    if (q.question_type === "Rating 1-5") {
      return (
        <ToggleGroup type="single" value={String(value)} onValueChange={(v) => setAnswers({ ...answers, [q.id]: parseInt(v) })}>
          {[1, 2, 3, 4, 5].map(n => (
            <ToggleGroupItem key={n} value={String(n)} className="w-10 h-10">{n}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }

    if (q.question_type === "Rating 1-10") {
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setAnswers({ ...answers, [q.id]: n })}
              className={`w-10 h-10 rounded border font-medium transition-colors ${
                value === n ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 hover:border-blue-400"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    if (q.question_type === "Yes/No") {
      return (
        <ToggleGroup type="single" value={value} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
          <ToggleGroupItem value="Yes">Yes</ToggleGroupItem>
          <ToggleGroupItem value="No">No</ToggleGroupItem>
        </ToggleGroup>
      );
    }

    if (q.question_type === "Text") {
      return (
        <Textarea
          placeholder="Your answer"
          value={value}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          className="min-h-24"
        />
      );
    }

    return (
      <Input
        placeholder="Your answer"
        value={value}
        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <div key={q.id} className="p-4 border border-slate-200 rounded-lg">
          <p className="font-medium text-slate-900 mb-3">{idx + 1}. {q.question_text}</p>
          {renderQuestion(q)}
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={() => handleSubmit(true)} variant="outline">Save as Draft</Button>
        <Button onClick={() => handleSubmit(false)} className="bg-green-600 hover:bg-green-700">Submit</Button>
        <Button onClick={onCancel} variant="outline">Cancel</Button>
      </div>
    </div>
  );
}