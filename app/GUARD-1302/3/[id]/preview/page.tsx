// Course Preview Page - View course as a learner would see it
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCourseById,
  getLessonsByCourseId,
  getResourcesByLessonId,
  getQuizzesByCourseId,
  getQuestionsByQuizId,
  getCurrentUser,
  subscribe,
} from "@/lib/store-guard-1302";
import { Course, Lesson, Resource, ProgressLesson, ProgressCourse, Quiz, Question } from "@/types";
import {
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  Lock,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Play,
  X,
} from "lucide-react";
import Button from "@/components/Button";
import ResourceRenderer from "@/components/learner/player/ResourceRenderer";
import PreviewHeader from "./_components/PreviewHeader";
import PreviewQuizPanel from "./_components/PreviewQuizPanel";

export default function CoursePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const currentUser = getCurrentUser();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mock progress for preview (no actual tracking)
  const [mockProgress, setMockProgress] = useState<Record<string, "not_started" | "in_progress" | "completed">>({});

  useEffect(() => {
    const courseData = getCourseById(courseId);
    if (!courseData) {
      router.push("/GUARD-1302/admin/courses");
      return;
    }
    setCourse(courseData);
    
    const lessonsData = getLessonsByCourseId(courseId);
    setLessons(lessonsData);

    // Initialize mock progress only if empty (to preserve progress during session)
    setMockProgress(prev => {
      if (Object.keys(prev).length === 0) {
        const initialProgress: Record<string, "not_started" | "in_progress" | "completed"> = {};
        lessonsData.forEach(l => {
          initialProgress[l.id] = "not_started";
        });
        return initialProgress;
      }
      return prev;
    });
  }, [courseId, router]);

  // Load resources and quiz for current lesson
  useEffect(() => {
    if (lessons.length === 0) return;
    
    const currentLesson = lessons[currentLessonIndex];
    if (!currentLesson) return;

    const lessonResources = getResourcesByLessonId(currentLesson.id);
    setResources(lessonResources.sort((a, b) => a.order - b.order));

    // Check for lesson-level quiz first, then course-level
    const allQuizzes = getQuizzesByCourseId(courseId);
    const lessonQuiz = allQuizzes.find(q => q.lessonId === currentLesson.id);
    const courseQuiz = allQuizzes.find(q => !q.lessonId);
    const activeQuiz = lessonQuiz || courseQuiz;
    
    if (activeQuiz) {
      setQuiz(activeQuiz);
      setQuestions(getQuestionsByQuizId(activeQuiz.id));
    } else {
      setQuiz(null);
      setQuestions([]);
    }

    // Mark current lesson as in_progress in mock state
    setMockProgress(prev => ({
      ...prev,
      [currentLesson.id]: prev[currentLesson.id] === "completed" ? "completed" : "in_progress",
    }));
  }, [currentLessonIndex, lessons, courseId]);

  const currentLesson = lessons[currentLessonIndex];

  const handleLessonClick = (index: number) => {
    setCurrentLessonIndex(index);
  };

  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentLessonIndex < lessons.length - 1) {
      // Mark current as completed in mock state
      if (currentLesson) {
        setMockProgress(prev => ({
          ...prev,
          [currentLesson.id]: "completed",
        }));
      }
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handleMarkComplete = () => {
    if (currentLesson) {
      setMockProgress(prev => ({
        ...prev,
        [currentLesson.id]: "completed",
      }));
    }
  };

  const getStatusIcon = (lessonId: string, index: number) => {
    const status = mockProgress[lessonId] || "not_started";
    
    // Check if lesson would be locked in linear mode
    const isLinearMode = course?.policy?.progression === "linear";
    const wouldBeLocked = isLinearMode && index > 0 && mockProgress[lessons[index - 1]?.id] !== "completed";
    
    if (wouldBeLocked) {
      return (
        <div className="relative group">
          <Lock className="w-4 h-4 text-amber-500" />
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-amber-900 text-amber-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Would be locked for learners
          </div>
        </div>
      );
    }
    
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "in_progress":
        return <Play className="w-4 h-4 text-blue-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-300" />;
    }
  };

  if (!course || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading preview...</p>
        </div>
      </div>
    );
  }

  const completedCount = Object.values(mockProgress).filter(s => s === "completed").length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Preview Header */}
      <PreviewHeader 
        course={course} 
        currentLesson={currentLesson}
        lessonIndex={currentLessonIndex}
        totalLessons={lessons.length}
        progressPercent={progressPercent}
        onExit={() => router.push(`/GUARD-1302/admin/courses/${courseId}/edit`)}
      />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          isSidebarCollapsed ? "w-0 overflow-hidden" : "w-72"
        }`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Lessons</h2>
              <span className="text-xs text-gray-500">
                {completedCount} / {lessons.length}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
            {lessons.map((lesson, index) => {
              const isCurrent = index === currentLessonIndex;
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleLessonClick(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isCurrent
                      ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {getStatusIcon(lesson.id, index)}
                  <span className="flex-1 text-sm truncate">{lesson.title}</span>
                  {isCurrent && (
                    <span className="text-xs text-emerald-600 font-medium">Current</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar toggle button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-lg p-1 shadow-sm hover:bg-gray-50 transition-all"
          style={{ left: isSidebarCollapsed ? 0 : "288px" }}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {/* Lesson Title */}
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>Lesson {currentLessonIndex + 1} of {lessons.length}</span>
                {mockProgress[currentLesson?.id] === "completed" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{currentLesson?.title}</h1>
            </div>

            {/* Lesson Content */}
            <div className="space-y-8">
              {resources.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No content in this lesson</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Add resources in the course editor to see them here
                  </p>
                </div>
              ) : (
                resources.map((resource, index) => (
                  <div 
                    key={resource.id}
                    className={`bg-white rounded-xl border border-gray-200 p-6 ${
                      index < resources.length - 1 ? "" : ""
                    }`}
                  >
                    <ResourceRenderer
                      resource={resource}
                      courseId={courseId}
                      lessonId={currentLesson?.id || ""}
                      userId={currentUser.id}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Quiz Section */}
            {quiz && questions.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <PreviewQuizPanel
                  quiz={quiz}
                  questions={questions}
                  courseId={courseId}
                  lessonId={currentLesson?.id || ""}
                />
              </div>
            )}

            {/* Navigation Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={currentLessonIndex === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Lesson
                </Button>
                
                <div className="flex items-center gap-3">
                  {mockProgress[currentLesson?.id] !== "completed" && (
                    <Button
                      variant="secondary"
                      onClick={handleMarkComplete}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Complete
                    </Button>
                  )}
                  
                  {currentLessonIndex < lessons.length - 1 ? (
                    <Button
                      variant="primary"
                      onClick={handleNext}
                      className="flex items-center gap-2"
                    >
                      Next Lesson
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => router.push(`/GUARD-1302/admin/courses/${courseId}/edit`)}
                      className="flex items-center gap-2"
                    >
                      Finish Preview
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

