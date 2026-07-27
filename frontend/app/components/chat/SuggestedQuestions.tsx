"use client";

import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "What are the main trends in this data?",
  "Summarize the key findings",
  "What are the data quality issues?",
  "Which columns have the most missing values?",
  "Are there any outliers I should know about?",
  "What recommendations do you have?",
];

interface SuggestedQuestionsProps {
  onAsk: (question: string) => void;
}

export function SuggestedQuestions({ onAsk }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((q) => (
        <Button
          key={q}
          variant="outline"
          size="sm"
          onClick={() => onAsk(q)}
          className="text-xs h-auto py-2 px-3"
        >
          {q}
        </Button>
      ))}
    </div>
  );
}
