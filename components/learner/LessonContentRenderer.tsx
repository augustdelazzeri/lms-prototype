"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import ResourceRenderer from "./player/ResourceRenderer";
import KnowledgeCheckCard from "./KnowledgeCheckCard";
import QuizCard from "@/components/learner/quiz/QuizCard";
import { Lesson, Resource, ProgressLesson } from "@/types";
import {
  getQuizByLesson,
  getQuizzesByCourseId,
  getKnowledgeCheckAnswers,
  getLessonNote,
  setLessonNote,
  getCurrentUser,
  getLessonsByCourseId,
  getNextLessonId,
} from "@/lib/store";
import { FileText, ClipboardList, StickyNote, Download, ChevronRight, ArrowRight, FileDown } from "lucide-react";
import Button from "@/components/Button";

interface LessonContentRendererProps {
  lesson: Lesson;
  resources: Resource[];
  progress?: ProgressLesson;
  courseId: string;
  userId: string;
  isCompleted?: boolean;
  onAllKnowledgeChecksAnswered?: (allAnswered: boolean) => void;
  onQuizComplete?: () => void;
  onNavigateToLesson?: (lessonId: string) => void;
  textSizeClass?: string;
  highContrast?: boolean;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function LessonContentRenderer({
  lesson,
  resources,
  progress,
  courseId,
  userId,
  isCompleted,
  onAllKnowledgeChecksAnswered,
  onQuizComplete,
  onNavigateToLesson,
  textSizeClass,
  highContrast,
}: LessonContentRendererProps) {
  const [answeredChecks, setAnsweredChecks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"lesson" | "quiz" | "notes">("lesson");
  const [noteText, setNoteText] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveTab("lesson");
  }, [lesson.id]);

  // Load note
  useEffect(() => {
    setNoteText(getLessonNote(lesson.id, userId));
  }, [lesson.id, userId]);

  // Auto-save notes
  const handleNoteChange = (val: string) => {
    setNoteText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLessonNote(lesson.id, userId, val);
    }, 800);
  };

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = Math.max(0, -rect.top);
      const total = rect.height - window.innerHeight;
      if (total <= 0) { setReadingProgress(100); return; }
      setReadingProgress(Math.min(100, Math.round((scrolled / total) * 100)));
    };
    const parent = document.querySelector("main");
    if (parent) {
      parent.addEventListener("scroll", handleScroll, { passive: true });
      return () => parent.removeEventListener("scroll", handleScroll);
    }
  }, [lesson.id]);

  useEffect(() => {
    if (lesson.knowledgeChecks && lesson.knowledgeChecks.length > 0) {
      const answers = getKnowledgeCheckAnswers(lesson.id, userId);
      const answered = new Set(Object.keys(answers));
      setAnsweredChecks(answered);
      const allAnswered = lesson.knowledgeChecks.every((kc) => answered.has(kc.id));
      onAllKnowledgeChecksAnswered?.(allAnswered);
    } else {
      onAllKnowledgeChecksAnswered?.(true);
    }
  }, [lesson.id, lesson.knowledgeChecks, userId, onAllKnowledgeChecksAnswered]);

  const handleKCAnswered = useCallback(
    (checkId: string) => {
      setAnsweredChecks((prev) => {
        const next = new Set(prev);
        next.add(checkId);
        if (lesson.knowledgeChecks) {
          const allAnswered = lesson.knowledgeChecks.every((kc) => next.has(kc.id));
          onAllKnowledgeChecksAnswered?.(allAnswered);
        }
        return next;
      });
    },
    [lesson.knowledgeChecks, onAllKnowledgeChecksAnswered]
  );

  const sortedResources = [...resources].sort((a, b) => a.order - b.order);
  const knowledgeChecks = lesson.knowledgeChecks || [];

  const lessonQuiz = getQuizByLesson(courseId, lesson.id);
  const courseQuizzes = getQuizzesByCourseId(courseId);
  const courseLevelQuiz = courseQuizzes.find((q) => !q.lessonId);
  const isAssessment = lesson.lessonType === "assessment";
  const quiz = isAssessment ? lessonQuiz || courseLevelQuiz : lessonQuiz;

  const hasQuizContent = knowledgeChecks.length > 0 || !!quiz;
  const quizQuestionCount = knowledgeChecks.length + (quiz ? (quiz as any).questions?.length || 0 : 0);

  // What's Next
  const allLessons = getLessonsByCourseId(courseId);
  const nextLessonId = getNextLessonId(courseId, lesson.id);
  const nextLesson = nextLessonId ? allLessons.find((l) => l.id === nextLessonId) : null;
  const isLastLesson = !nextLessonId;

  const downloadableResources = lesson.downloadableResources || [];

  const textSize = textSizeClass || "text-base";

  return (
    <div ref={contentRef} className={`relative ${highContrast ? "high-contrast" : ""}`}>
      {/* Reading progress bar */}
      <div className="sticky top-0 z-10 h-0.5 bg-gray-100">
        <div
          className="h-full bg-emerald-500 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div className={`max-w-4xl mx-auto px-6 py-8 ${textSize}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${highContrast ? "text-black" : "text-gray-900"}`}>
              {lesson.title}
            </h1>
            {lesson.estimatedMinutes && (
              <p className="text-sm text-gray-500 mt-1">~{lesson.estimatedMinutes} min</p>
            )}
          </div>
          {progress?.updatedAt && (
            <div className="text-sm text-gray-500">
              Saved {formatRelativeTime(new Date(progress.updatedAt))}
            </div>
          )}
        </div>

        {/* Tabs */}
        {(hasQuizContent || true) && (
          <div className="flex items-center gap-1 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("lesson")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "lesson"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" />
              Lesson
            </button>
            {hasQuizContent && (
              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "quiz"
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Quiz
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === "quiz" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {quizQuestionCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setActiveTab("notes")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notes"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <StickyNote className="w-4 h-4" />
              Notes
              {noteText.trim() && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>
        )}

        {/* Lesson Tab */}
        {activeTab === "lesson" && (
          <>
            <div className="space-y-10">
              {sortedResources.length === 0 && !hasQuizContent ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500 text-lg">No content available for this lesson.</p>
                </div>
              ) : (
                sortedResources.map((resource) => (
                  <div key={resource.id} className="resource-wrapper">
                    <ResourceRenderer
                      resource={resource}
                      courseId={courseId}
                      lessonId={lesson.id}
                      userId={userId}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Downloadable Resources */}
            {downloadableResources.length > 0 && (
              <div className="mt-10">
                <button
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 mb-3"
                >
                  <Download className="w-4 h-4" />
                  Downloads ({downloadableResources.length})
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${resourcesOpen ? "rotate-90" : ""}`} />
                </button>
                {resourcesOpen && (
                  <div className="space-y-2 pl-6">
                    {downloadableResources.map((dr, i) => (
                      <a
                        key={i}
                        href={dr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <FileDown className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 flex-1">{dr.title}</span>
                        <span className="text-xs text-gray-400 uppercase">{dr.fileType}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* What's Next card */}
            {isCompleted && (
              <div className="mt-10 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
                {nextLesson ? (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Up Next</p>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{nextLesson.title}</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {nextLesson.estimatedMinutes ? `~${nextLesson.estimatedMinutes} min` : ""}
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => onNavigateToLesson?.(nextLesson.id)}
                      className="flex items-center gap-2"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Course Complete</p>
                    <h3 className="text-lg font-semibold text-gray-900">You&apos;ve finished all lessons!</h3>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Quiz Tab */}
        {activeTab === "quiz" && (
          <div>
            {knowledgeChecks.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                    <span className="text-purple-600 text-sm font-bold">?</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Knowledge Check</h2>
                    <p className="text-sm text-gray-500">
                      {answeredChecks.size}/{knowledgeChecks.length} answered
                    </p>
                  </div>
                </div>
                <div className="space-y-5">
                  {knowledgeChecks.map((kc, idx) => (
                    <KnowledgeCheckCard
                      key={kc.id}
                      check={kc}
                      index={idx}
                      lessonId={lesson.id}
                      userId={userId}
                      onAnswered={(checkId) => handleKCAnswered(checkId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {quiz && (
              <div className={knowledgeChecks.length > 0 ? "pt-8 border-t border-gray-200" : ""}>
                <QuizCard
                  quiz={quiz}
                  courseId={courseId}
                  lessonId={lesson.id}
                  userId={userId}
                  onComplete={() => {
                    if (onQuizComplete) onQuizComplete();
                    else window.location.reload();
                  }}
                />
              </div>
            )}

            {!quiz && knowledgeChecks.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No quiz content for this lesson.
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Notes</h2>
              <p className="text-sm text-gray-500">Notes are saved automatically as you type.</p>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Type your notes here..."
              className="w-full h-64 p-4 border border-gray-200 rounded-lg text-sm text-gray-700 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {noteText.trim() && (
              <p className="text-xs text-gray-400 mt-2">
                {noteText.length} character{noteText.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
