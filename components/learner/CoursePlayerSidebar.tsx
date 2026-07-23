"use client";

import React, { useState } from "react";
import { Circle, CircleDot, CheckCircle2, Lock, ClipboardList, StickyNote, Download } from "lucide-react";
import { Course, Lesson, ProgressLesson } from "@/types";
import { isLessonUnlocked, hasLessonNote, getQuizByLesson } from "@/lib/store";
import { getCurrentUser } from "@/lib/store";

interface CoursePlayerSidebarProps {
  course: Course;
  lessons: Lesson[];
  currentLessonId: string;
  progressMap: Record<string, ProgressLesson>;
  onLessonClick: (lessonId: string) => void;
  onBlockedNavigation?: (message: string) => void;
  hidden?: boolean;
}

export default function CoursePlayerSidebar({
  course,
  lessons,
  currentLessonId,
  progressMap,
  onLessonClick,
  onBlockedNavigation,
  hidden,
}: CoursePlayerSidebarProps) {
  const currentUser = getCurrentUser();
  const [hoveredLockedLesson, setHoveredLockedLesson] = useState<string | null>(null);

  if (hidden) return null;

  const completedCount = lessons.filter((l) => progressMap[l.id]?.status === "completed").length;

  const getStatusIcon = (lesson: Lesson) => {
    const progress = progressMap[lesson.id];
    const status = progress?.status || "not_started";
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />;
      case "in_progress":
        return <CircleDot className="w-4.5 h-4.5 text-blue-600" />;
      default:
        return <Circle className="w-4.5 h-4.5 text-gray-300" />;
    }
  };

  const isUnlocked = (lessonId: string) => isLessonUnlocked(course, lessonId, currentUser.id);

  const handleLessonClick = (lesson: Lesson) => {
    if (isUnlocked(lesson.id)) {
      onLessonClick(lesson.id);
    } else {
      onBlockedNavigation?.("Complete previous lesson first");
    }
  };

  const hasQuiz = (lesson: Lesson) => {
    return !!(lesson.knowledgeChecks?.length || getQuizByLesson(course.id, lesson.id));
  };

  // Mini progress per lesson
  const getLessonMiniProgress = (lesson: Lesson): number => {
    const p = progressMap[lesson.id];
    if (!p) return 0;
    if (p.status === "completed") return 100;
    const timePct = p.timeSpentSec && lesson.estimatedMinutes ? Math.min(100, (p.timeSpentSec / (lesson.estimatedMinutes * 60)) * 100) : 0;
    const scrollPct = p.scrollDepth || 0;
    const watchPct = p.watchPct || 0;
    return Math.min(100, Math.max(timePct, scrollPct, watchPct));
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-200 sticky top-0 h-screen overflow-y-auto shrink-0">
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Lessons</h2>
          <p className="text-xs text-gray-400 mt-0.5">{completedCount} of {lessons.length} complete</p>
        </div>

        <nav className="space-y-0.5">
          {lessons.map((lesson) => {
            const isCurrent = lesson.id === currentLessonId;
            const unlocked = isUnlocked(lesson.id);
            const isLocked = !unlocked;
            const showTooltip = isLocked && hoveredLockedLesson === lesson.id;
            const quiz = hasQuiz(lesson);
            const note = hasLessonNote(lesson.id, currentUser.id);
            const miniProg = getLessonMiniProgress(lesson);
            const isInProgress = progressMap[lesson.id]?.status === "in_progress";

            return (
              <div
                key={lesson.id}
                className="relative"
                onMouseEnter={() => { if (isLocked) setHoveredLockedLesson(lesson.id); }}
                onMouseLeave={() => { if (isLocked) setHoveredLockedLesson(null); }}
              >
                <button
                  onClick={() => handleLessonClick(lesson)}
                  disabled={isLocked}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors relative ${
                    isCurrent
                      ? "bg-blue-50 border-l-2 border-l-emerald-500 pl-2.5"
                      : isLocked
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-gray-400" />
                    ) : (
                      getStatusIcon(lesson)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm block truncate ${isCurrent ? "font-medium text-gray-900" : ""}`}>
                      {lesson.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lesson.estimatedMinutes && (
                        <span className="text-[11px] text-gray-400">{lesson.estimatedMinutes} min</span>
                      )}
                      {lesson.lessonType === "assessment" && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Assessment</span>
                      )}
                      {quiz && lesson.lessonType !== "assessment" && (
                        <span title="Has quiz"><ClipboardList className="w-3 h-3 text-purple-400" /></span>
                      )}
                      {note && (
                        <span title="Has notes"><StickyNote className="w-3 h-3 text-amber-400" /></span>
                      )}
                      {lesson.downloadableResources && lesson.downloadableResources.length > 0 && (
                        <span title="Has downloads"><Download className="w-3 h-3 text-gray-400" /></span>
                      )}
                    </div>
                    {/* Mini progress */}
                    {isInProgress && miniProg > 0 && miniProg < 100 && (
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-1.5">
                        <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${miniProg}%` }} />
                      </div>
                    )}
                  </div>
                </button>
                {showTooltip && (
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-50">
                    Complete previous lesson first
                    <div className="absolute right-full top-1/2 transform -translate-y-1/2 -mr-1 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
