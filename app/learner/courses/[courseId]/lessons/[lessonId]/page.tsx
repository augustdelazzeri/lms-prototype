"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import RouteGuard from "@/components/RouteGuard";
import CoursePlayerHeader from "@/components/learner/CoursePlayerHeader";
import CoursePlayerSidebar from "@/components/learner/CoursePlayerSidebar";
import LessonContentRenderer from "@/components/learner/LessonContentRenderer";
import CoursePlayerFooter from "@/components/learner/CoursePlayerFooter";
import CourseCompletionSummary from "@/components/learner/CourseCompletionSummary";
import LessonTimer from "@/components/learner/LessonTimer";
import VideoProgressTracker from "@/components/learner/VideoProgressTracker";
import Toast from "@/components/Toast";
import {
  getCurrentUser,
  getCourseById,
  getLessonsByCourseId,
  getProgressCourseByCourseAndUser,
  getProgressLesson,
  getNextLessonId,
  getNextUnlockedLesson,
  getPrevLessonId,
  startLesson,
  completeLesson,
  checkLessonCompletionThresholds,
  updateResumePointer,
  getResourcesByLessonId,
  isLessonUnlocked,
  subscribe,
  getOrCreateProgressLesson,
  updateLessonProgress,
} from "@/lib/store";
import { FEATURES } from "@/lib/features";
import { Course, Lesson, ProgressLesson } from "@/types";

type TextSize = "sm" | "base" | "lg";
const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

export default function CoursePlayerLessonPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [currentUser] = useState(getCurrentUser());
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressLesson>>({});
  const [courseProgress, setCourseProgress] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [watchPct, setWatchPct] = useState(0);

  // Completion states
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const [completionScore, setCompletionScore] = useState<number | undefined>(undefined);

  // Lesson completion feedback
  const [showLessonSuccess, setShowLessonSuccess] = useState(false);

  // Auto-save indicator
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Progress saved");

  // Accessibility & focus
  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("lms_textSize") as TextSize) || "base";
    }
    return "base";
  });
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lms_highContrast") === "true";
    }
    return false;
  });
  const [focusMode, setFocusMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lms_focusMode") === "true";
    }
    return false;
  });

  // Persist accessibility prefs
  const handleTextSizeChange = (size: TextSize) => {
    setTextSize(size);
    localStorage.setItem("lms_textSize", size);
  };
  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    localStorage.setItem("lms_highContrast", String(enabled));
  };
  const handleFocusModeChange = (enabled: boolean) => {
    setFocusMode(enabled);
    localStorage.setItem("lms_focusMode", String(enabled));
  };

  // Show save indicator helper
  const flashSave = useCallback((msg?: string) => {
    setSaveMessage(msg || "Progress saved");
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 2000);
  }, []);

  // Load course and lessons
  useEffect(() => {
    const courseData = getCourseById(courseId);
    if (!courseData) {
      router.push("/learner");
      return;
    }
    setCourse(courseData);
    const lessonsData = getLessonsByCourseId(courseId);
    setLessons(lessonsData);

    const lesson = lessonsData.find((l) => l.id === lessonId);
    if (!lesson) {
      const user = getCurrentUser();
      const progressCourse = getProgressCourseByCourseAndUser(courseId, user.id);
      if (progressCourse?.lastLessonId) {
        router.replace(`/learner/courses/${courseId}/lessons/${progressCourse.lastLessonId}`);
      } else if (lessonsData.length > 0) {
        router.replace(`/learner/courses/${courseId}/lessons/${lessonsData[0].id}`);
      } else {
        router.push("/learner");
      }
      return;
    }
    setCurrentLesson(lesson);

    if (!isLessonUnlocked(courseData, lessonId, getCurrentUser().id)) {
      const user = getCurrentUser();
      const unlockedLesson = lessonsData.find((l) => isLessonUnlocked(courseData, l.id, user.id));
      if (unlockedLesson) {
        router.replace(`/learner/courses/${courseId}/lessons/${unlockedLesson.id}`);
        return;
      }
    }
  }, [courseId, lessonId, router]);

  // Load progress data
  useEffect(() => {
    if (!course || lessons.length === 0) return;

    const user = getCurrentUser();
    const progressCourse = getProgressCourseByCourseAndUser(course.id, user.id);
    setCourseProgress(progressCourse);

    const map: Record<string, ProgressLesson> = {};
    lessons.forEach((lesson) => {
      const progress = getProgressLesson(user.id, lesson.id);
      if (progress) map[lesson.id] = progress;
    });
    setProgressMap(map);

    if (lessonId) {
      const progress = startLesson(course.id, lessonId, user.id);
      setTimeSpent(progress.timeSpentSec || 0);
      setWatchPct(progress.watchPct || 0);
    }

    // Flash resume indicator on page load if there's existing progress
    const existingProgress = getProgressLesson(user.id, lessonId);
    if (existingProgress?.timeSpentSec && existingProgress.timeSpentSec > 0) {
      flashSave("Progress restored");
    }
  }, [course, lessons, lessonId, flashSave]);

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const user = getCurrentUser();
      if (course) {
        const progressCourse = getProgressCourseByCourseAndUser(course.id, user.id);
        setCourseProgress(progressCourse);

        const map: Record<string, ProgressLesson> = {};
        lessons.forEach((lesson) => {
          const progress = getProgressLesson(user.id, lesson.id);
          if (progress) map[lesson.id] = progress;
        });
        setProgressMap(map);

        // Check if course just completed
        if (progressCourse?.status === "completed" && !showCompletionSummary) {
          setCompletionScore(progressCourse.scorePct);
          setShowCompletionSummary(true);
        }
      }
    });
    return unsubscribe;
  }, [course, lessons, showCompletionSummary]);

  const currentProgress = progressMap[lessonId];
  const canComplete = currentProgress && course
    ? checkLessonCompletionThresholds(course, currentProgress)
    : false;

  const isCompleted = currentProgress?.status === "completed";
  const requiresManualCompletion = course?.policy?.requiresManualCompletion ?? false;

  const getThresholdMessages = (): string[] => {
    const messages: string[] = [];
    if (!course || !currentProgress) return messages;
    if (course.policy?.minTimeOnLessonSec) {
      const ts = currentProgress.timeSpentSec || 0;
      const remaining = course.policy.minTimeOnLessonSec - ts;
      if (remaining > 0) messages.push(`Complete ${Math.ceil(remaining)} more seconds`);
    }
    if (course.policy?.minVideoWatchPct) {
      const wp = currentProgress.watchPct || 0;
      const remaining = course.policy.minVideoWatchPct - wp;
      if (remaining > 0) messages.push(`Watch ${Math.ceil(remaining)}% more video`);
    }
    return messages;
  };

  // Navigation
  const handleLessonClick = useCallback(
    (newLessonId: string) => {
      if (!course) return;
      const user = getCurrentUser();
      if (!isLessonUnlocked(course, newLessonId, user.id)) {
        setToastMessage("Complete previous lessons to unlock this lesson");
        setShowToast(true);
        return;
      }
      updateResumePointer(user.id, course.id, newLessonId);
      setShowLessonSuccess(false);
      router.push(`/learner/courses/${courseId}/lessons/${newLessonId}`);
    },
    [course, courseId, router]
  );

  const handlePrev = useCallback(() => {
    if (!lessonId) return;
    const prevId = getPrevLessonId(courseId, lessonId);
    if (prevId) handleLessonClick(prevId);
  }, [courseId, lessonId, handleLessonClick]);

  const handleNext = useCallback(() => {
    if (!lessonId || !course) return;
    const user = getCurrentUser();
    const nextId = getNextUnlockedLesson(courseId, user.id, lessonId);
    if (nextId) {
      handleLessonClick(nextId);
    } else {
      setToastMessage(isCompleted ? "All lessons complete" : "Complete this lesson to unlock the next lesson");
      setShowToast(true);
    }
  }, [course, courseId, lessonId, handleLessonClick, isCompleted]);

  const handleMarkComplete = useCallback(() => {
    if (!course || !lessonId) return;
    const user = getCurrentUser();
    completeLesson(course.id, lessonId, user.id);

    // Lesson completion feedback
    setShowLessonSuccess(true);
    flashSave("Lesson complete!");
    setTimeout(() => setShowLessonSuccess(false), 2500);

    const nextUnlockedLessonId = getNextUnlockedLesson(courseId, user.id, lessonId);
    if (nextUnlockedLessonId) {
      const nextLesson = lessons.find((l) => l.id === nextUnlockedLessonId);
      setToastMessage(`Lesson complete — ${nextLesson ? nextLesson.title : "Next lesson"} unlocked`);
    } else {
      setToastMessage("Lesson complete!");
    }
    setShowToast(true);
  }, [course, courseId, lessonId, lessons, flashSave]);

  const handleDemoComplete = useCallback(() => {
    if (!course || !lessonId) return;
    const user = getCurrentUser();
    updateLessonProgress(lessonId, user.id, {
      timeSpentSec: course.policy?.minTimeOnLessonSec || 60,
      watchPct: course.policy?.minVideoWatchPct || 80,
    });
    completeLesson(course.id, lessonId, user.id);
    setShowLessonSuccess(true);
    flashSave("Lesson complete!");
    setTimeout(() => {
      setShowLessonSuccess(false);
      const nextId = getNextLessonId(courseId, lessonId);
      if (nextId) handleLessonClick(nextId);
    }, 1500);
  }, [course, courseId, lessonId, handleLessonClick, flashSave]);

  // Auto-completion
  useEffect(() => {
    if (!course || !lessonId || !currentProgress) return;
    if (requiresManualCompletion) return;
    if (!FEATURES || !FEATURES.autoCompleteOnScroll) return;
    if (isCompleted || hasAutoCompleted) return;

    if (canComplete) {
      const user = getCurrentUser();
      completeLesson(course.id, lessonId, user.id);
      setHasAutoCompleted(true);
      setShowLessonSuccess(true);
      flashSave("Lesson complete!");
      setTimeout(() => setShowLessonSuccess(false), 2500);

      const nextUnlockedLessonId = getNextUnlockedLesson(courseId, user.id, lessonId);
      if (nextUnlockedLessonId) {
        const nextLesson = lessons.find((l) => l.id === nextUnlockedLessonId);
        setToastMessage(`Lesson complete — ${nextLesson ? nextLesson.title : "Next lesson"} unlocked`);
      } else {
        setToastMessage("Lesson complete!");
      }
      setShowToast(true);
    }
  }, [course, courseId, lessonId, currentProgress, canComplete, requiresManualCompletion, isCompleted, hasAutoCompleted, lessons, flashSave]);

  useEffect(() => {
    setHasAutoCompleted(false);
    setShowLessonSuccess(false);
  }, [lessonId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!course || !currentUser) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "f" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleFocusModeChange(!focusMode);
        return;
      }

      if (e.key === "ArrowRight" || (e.key === "n" && !e.ctrlKey)) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, course, currentUser, focusMode]);

  if (!course || !currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Course completion summary takes over the entire view
  if (showCompletionSummary) {
    return (
      <RouteGuard allowedRoles={["LEARNER"]}>
        <div className="flex flex-col h-screen bg-white">
          <div className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="max-w-full mx-auto flex items-center gap-2 text-sm text-gray-600">
              <Link href="/learner" className="hover:text-gray-900">Back to Courses</Link>
              <span>/</span>
              <span className="text-gray-900">{course.title}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CourseCompletionSummary
              course={course}
              userId={currentUser.id}
              scorePct={completionScore}
              onReturnToDashboard={() => {}}
            />
          </div>
        </div>
      </RouteGuard>
    );
  }

  const resources = getResourcesByLessonId(lessonId);
  const hasPrev = !!getPrevLessonId(courseId, lessonId);
  const nextUnlockedLessonId = course && currentUser ? getNextUnlockedLesson(courseId, currentUser.id, lessonId) : null;
  const hasNext = !!nextUnlockedLessonId;
  const nextLesson = nextUnlockedLessonId ? lessons.find((l) => l.id === nextUnlockedLessonId) : null;

  const completedCount = lessons.filter((l) => progressMap[l.id]?.status === "completed").length;

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <div className={`flex flex-col h-screen ${highContrast ? "bg-white" : "bg-gray-50"}`}>
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <div className="max-w-full mx-auto flex items-center gap-2 text-sm text-gray-600">
            <Link href="/learner" className="hover:text-gray-900">Back to Courses</Link>
            <span>/</span>
            <Link href={`/learner/courses/${courseId}`} className="hover:text-gray-900">{course.title}</Link>
            <span>/</span>
            <span className="text-gray-900">{currentLesson.title}</span>
          </div>
        </div>

        {/* Header */}
        <CoursePlayerHeader
          course={course}
          progress={courseProgress || {
            id: `pc_temp_${course.id}_${currentUser.id}`,
            userId: currentUser.id,
            courseId: course.id,
            status: "not_started" as const,
            lessonDoneCount: 0,
            lessonTotal: lessons.length,
            scorePct: 0,
            attempts: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          currentLessonId={lessonId}
          onExit={() => router.push("/learner")}
          onResume={(resumeLessonId) => router.push(`/learner/courses/${courseId}/lessons/${resumeLessonId}`)}
          textSize={textSize}
          highContrast={highContrast}
          focusMode={focusMode}
          onTextSizeChange={handleTextSizeChange}
          onHighContrastChange={handleHighContrastChange}
          onFocusModeChange={handleFocusModeChange}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <CoursePlayerSidebar
            course={course}
            lessons={lessons}
            currentLessonId={lessonId}
            progressMap={progressMap}
            onLessonClick={handleLessonClick}
            onBlockedNavigation={(message) => {
              setToastMessage(message);
              setShowToast(true);
            }}
            hidden={focusMode}
          />

          {/* Main Content */}
          <main className={`flex-1 overflow-y-auto ${highContrast ? "bg-white" : "bg-white"} relative`}>
            {/* Lesson completion success overlay */}
            {showLessonSuccess && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl animate-bounce">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xl font-bold">Lesson Complete!</span>
                  </div>
                </div>
              </div>
            )}

            {/* Learning objectives banner on first lesson */}
            {lessons[0]?.id === lessonId && course.metadata?.objectives && course.metadata.objectives.length > 0 && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3">
                <details className="max-w-4xl mx-auto">
                  <summary className="text-sm font-medium text-emerald-800 cursor-pointer">
                    In this course, you&apos;ll learn...
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4">
                    {course.metadata.objectives.map((obj, i) => (
                      <li key={i} className="text-sm text-emerald-700 list-disc">{obj}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            <LessonContentRenderer
              lesson={currentLesson}
              resources={resources}
              progress={currentProgress}
              courseId={courseId}
              userId={currentUser.id}
              isCompleted={isCompleted}
              onQuizComplete={() => {
                if (currentLesson.lessonType === "assessment") {
                  const cp = getProgressCourseByCourseAndUser(courseId, currentUser.id);
                  setCompletionScore(cp?.scorePct);
                  flashSave("Quiz submitted");
                } else {
                  flashSave("Quiz submitted");
                  window.location.reload();
                }
              }}
              onNavigateToLesson={(lid) => handleLessonClick(lid)}
              textSizeClass={TEXT_SIZE_CLASS[textSize]}
              highContrast={highContrast}
            />
          </main>
        </div>

        {/* Footer */}
        <CoursePlayerFooter
          course={course}
          currentLessonId={lessonId}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isCompleted={isCompleted}
          requiresManualCompletion={requiresManualCompletion}
          progress={currentProgress}
          canComplete={canComplete}
          thresholdMessages={getThresholdMessages()}
          completedCount={completedCount}
          totalCount={lessons.length}
          nextLessonTitle={nextLesson?.title}
          onPrev={handlePrev}
          onNext={handleNext}
          onMarkComplete={handleMarkComplete}
          onDemoComplete={handleDemoComplete}
        />

        {/* Timer and Video Tracking */}
        {currentProgress && (
          <>
            <LessonTimer
              courseId={course.id}
              lessonId={lessonId}
              userId={currentUser.id}
              minTimeSec={course.policy?.minTimeOnLessonSec}
              initialTimeSpent={currentProgress.timeSpentSec || 0}
              onTimeUpdate={(seconds) => setTimeSpent(seconds)}
            />
            <VideoProgressTracker
              courseId={course.id}
              lessonId={lessonId}
              userId={currentUser.id}
              minWatchPct={course.policy?.minVideoWatchPct}
              initialWatchPct={currentProgress.watchPct || 0}
              onProgressUpdate={(pct) => setWatchPct(pct)}
            />
          </>
        )}

        {/* Auto-save indicator */}
        <div
          className={`fixed bottom-20 right-6 z-50 transition-all duration-300 ${
            showSaveIndicator ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {saveMessage}
          </div>
        </div>

        {/* Toast */}
        {showToast && (
          <Toast
            message={toastMessage}
            onClose={() => setShowToast(false)}
            duration={3000}
          />
        )}
      </div>
    </RouteGuard>
  );
}
