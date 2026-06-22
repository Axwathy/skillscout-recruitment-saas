"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageSquareText, RefreshCw, Send, Sparkles } from "lucide-react";

import { isUnauthorizedError } from "@/lib/api";
import {
  createInterviewQuestionNote,
  generateInterviewQuestions,
  getInterviewQuestions,
} from "@/lib/interviews";
import type {
  InterviewQuestion,
  InterviewQuestionCategory,
  InterviewQuestionSet,
} from "@/types/interviews";

const CATEGORY_ORDER: InterviewQuestionCategory[] = [
  "technical",
  "behavioral",
  "situational",
  "culture_fit",
  "gap_analysis",
];

const CATEGORY_LABELS: Record<InterviewQuestionCategory, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  situational: "Situational",
  culture_fit: "Culture fit",
  gap_analysis: "Gap analysis",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function groupQuestions(questions: InterviewQuestion[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    questions: questions.filter((question) => question.category === category),
  })).filter((group) => group.questions.length > 0);
}

export function InterviewPrepPanel({ applicationId }: { applicationId: string }) {
  const [questionSet, setQuestionSet] = useState<InterviewQuestionSet | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getInterviewQuestions(applicationId)
      .then((response) => {
        if (!ignore) setQuestionSet(response.question_set);
      })
      .catch((err) => {
        if (!ignore && !isUnauthorizedError(err)) {
          setError("Interview questions could not be loaded.");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [applicationId]);

  const groupedQuestions = useMemo(
    () => groupQuestions(questionSet?.questions ?? []),
    [questionSet],
  );

  async function handleGenerate(force = false) {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await generateInterviewQuestions(applicationId, force);
      setQuestionSet(response.question_set);
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError("Interview questions could not be generated.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleNoteSubmit(event: FormEvent, questionId: string) {
    event.preventDefault();
    const body = (noteDrafts[questionId] ?? "").trim();
    if (!body || !questionSet) return;

    setSavingNoteId(questionId);
    try {
      const note = await createInterviewQuestionNote(questionId, body);
      setQuestionSet({
        ...questionSet,
        questions: questionSet.questions.map((question) =>
          question.id === questionId
            ? { ...question, notes: [note, ...question.notes] }
            : question,
        ),
      });
      setNoteDrafts((current) => ({ ...current, [questionId]: "" }));
    } catch (err) {
      if (isUnauthorizedError(err)) return;
      setError("Note could not be saved.");
    } finally {
      setSavingNoteId(null);
    }
  }

  return (
    <div className="glass-panel rounded-lg">
      <div className="flex flex-col gap-3 border-b border-neutral-200/70 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Interview prep</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Role-specific questions, evaluation criteria, and recruiter notes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleGenerate(Boolean(questionSet))}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-700 hover:shadow-accent disabled:opacity-60"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {questionSet ? "Regenerate" : "Generate questions"}
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-md border border-danger-600/20 bg-danger-600/10 px-3 py-2 text-sm text-danger-600">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-sm text-neutral-400">
            Loading interview prep...
          </div>
        ) : !questionSet ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
            <MessageSquareText
              className="mx-auto h-8 w-8 text-neutral-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-neutral-900">
              No interview questions yet.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Generate a structured question set for this candidate and role.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-600">
                {questionSet.model}
              </span>
              <span>Created {formatDate(questionSet.created_at)}</span>
              {questionSet.generation_errors.length > 0 && (
                <span className="rounded-full bg-warning-600/10 px-2.5 py-1 font-semibold text-warning-600">
                  Fallback used
                </span>
              )}
            </div>

            {groupedQuestions.map((group) => (
              <section key={group.category} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {group.label}
                </h3>
                {group.questions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-semibold leading-6 text-neutral-900">
                        {question.question_text}
                      </p>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-500 ring-1 ring-inset ring-neutral-200">
                        {question.source_label}
                      </span>
                    </div>

                    {question.rationale && (
                      <p className="mt-3 text-sm text-neutral-600">
                        <span className="font-semibold text-neutral-700">Rationale:</span>{" "}
                        {question.rationale}
                      </p>
                    )}
                    {question.evaluation_criteria && (
                      <p className="mt-2 text-sm text-neutral-600">
                        <span className="font-semibold text-neutral-700">
                          Listen for:
                        </span>{" "}
                        {question.evaluation_criteria}
                      </p>
                    )}

                    <div className="mt-4 space-y-3 border-t border-neutral-200 pt-4">
                      {question.notes.length > 0 && (
                        <div className="space-y-2">
                          {question.notes.map((note) => (
                            <div
                              key={note.id}
                              className="rounded-md bg-white px-3 py-2 text-sm text-neutral-700 ring-1 ring-inset ring-neutral-200"
                            >
                              <p>{note.body}</p>
                              <p className="mt-1 text-xs text-neutral-400">
                                {note.author_email ?? "Recruiter"} -{" "}
                                {formatDate(note.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <form
                        onSubmit={(event) => handleNoteSubmit(event, question.id)}
                        className="flex flex-col gap-2 sm:flex-row"
                      >
                        <label className="sr-only" htmlFor={`note-${question.id}`}>
                          Add note
                        </label>
                        <input
                          id={`note-${question.id}`}
                          value={noteDrafts[question.id] ?? ""}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Add interview note"
                          className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white/70 px-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white"
                        />
                        <button
                          type="submit"
                          disabled={savingNoteId === question.id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-100 disabled:opacity-60"
                        >
                          {savingNoteId === question.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Save
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
