"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import RouteGuard from "@/components/RouteGuard";
import {
  getCurrentUser,
  getCourseById,
  getLessonsByCourseId,
  getProgressCourseByCourseAndUser,
  getProgressLesson,
  getResumePointerForCourse,
  isLessonUnlocked,
  getQuizByLesson,
  getAssignmentForUserAndCourse,
  getAvailableCourseLanguages,
} from "@/lib/store";
import {
  LANGUAGE_LABELS as SHARED_LANGUAGE_LABELS,
  readStoredLearnerLanguage,
  storeLearnerLanguage,
  translateLessonTitle,
} from "@/lib/lessonI18n";
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  Target, 
  CheckCircle2, 
  Circle, 
  CircleDot, 
  Lock, 
  PlayCircle, 
  ClipboardList, 
  ChevronDown, 
  ChevronUp,
  Globe,
  Sparkles
} from "lucide-react";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { Course, Lesson, ProgressLesson } from "@/types";

export default function CourseOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const [descExpanded, setDescExpanded] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [availableLanguages, setAvailableLanguages] = useState(["en"]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const user = getCurrentUser();
  const course = getCourseById(courseId);
  const lessons = useMemo(() => (course ? getLessonsByCourseId(courseId) : []), [courseId, course]);
  const progress = course ? getProgressCourseByCourseAndUser(courseId, user.id) : undefined;
  const assignment = course ? getAssignmentForUserAndCourse(user.id, courseId) : undefined;

  const LANGUAGE_LABELS: Record<string, string> = {
    ...SHARED_LANGUAGE_LABELS,
    es: "Spanish",
    fr: "French",
    de: "German",
    pt: "Portuguese",
    zh: "Mandarin",
    ja: "Japanese",
  };

  useEffect(() => {
    const langs = getAvailableCourseLanguages();
    setAvailableLanguages(langs);
    const stored = readStoredLearnerLanguage();
    if (stored && langs.includes(stored)) {
      setCurrentLanguage(stored);
    }
  }, []);

  const progressMap = useMemo(() => {
    const map: Record<string, ProgressLesson> = {};
    lessons.forEach((l) => {
      const p = getProgressLesson(user.id, l.id);
      if (p) map[l.id] = p;
    });
    return map;
  }, [lessons, user.id]);

  const completedCount = lessons.filter((l) => progressMap[l.id]?.status === "completed").length;
  const percentComplete = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const isCompleted = progress?.status === "completed";

  const totalMinutes = lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 5), 0);
  const remainingMinutes = lessons.reduce((sum, l) => {
    if (progressMap[l.id]?.status === "completed") return sum;
    return sum + (l.estimatedMinutes || 5);
  }, 0);

  const resumeLessonId = course ? getResumePointerForCourse(user.id, courseId) : null;
  const resumeLesson = resumeLessonId ? lessons.find((l) => l.id === resumeLessonId) : null;
  const resumeIndex = resumeLesson ? lessons.indexOf(resumeLesson) + 1 : 1;

  const objectives = course?.metadata?.objectives || [];

  const dueDate = assignment?.dueAt ? new Date(assignment.dueAt) : null;
  const now = new Date();
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = dueDate && dueDate < now && !isCompleted;

  if (!course) {
    return (
      <RouteGuard allowedRoles={["LEARNER"]}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">Course not found.</p>
        </div>
      </RouteGuard>
    );
  }

  const handleStart = () => {
    const targetLessonId = resumeLessonId || lessons[0]?.id;
    if (targetLessonId) {
      router.push(`/learner/courses/${courseId}/lessons/${targetLessonId}`);
    }
  };

  const getLessonStatus = (lesson: Lesson) => {
    const p = progressMap[lesson.id];
    if (p?.status === "completed") return "completed";
    if (p?.status === "in_progress") return "in_progress";
    return "not_started";
  };

  const hasQuiz = (lesson: Lesson) => {
    return !!(lesson.knowledgeChecks?.length || getQuizByLesson(courseId, lesson.id));
  };

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-20 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/learner"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Courses
            </Link>

            {/* Language Switcher (H1 Requirement) */}
            <div className="relative">
              <button 
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-white hover:shadow-md transition-all text-xs font-bold text-gray-700"
              >
                <Globe className="size-3.5 text-blue-600" />
                <span>Language: {LANGUAGE_LABELS[currentLanguage]}</span>
                <ChevronDown className="size-3.5 text-gray-400" />
              </button>
              
              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLanguageMenu(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Version</p>
                    {availableLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          setCurrentLanguage(lang);
                          storeLearnerLanguage(lang);
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                          currentLanguage === lang ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {LANGUAGE_LABELS[lang]}
                          {lang !== 'en' && <Sparkles className="size-3 text-purple-400" />}
                        </div>
                        {currentLanguage === lang && <CheckCircle2 className="size-4" />}
                      </button>
                    ))}
                    {availableLanguages.length === 1 && (
                      <div className="px-4 py-2 text-[10px] text-gray-400 italic">No translated versions available.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Due date banner */}
        {dueDate && daysUntilDue !== null && (daysUntilDue <= 7 || isOverdue) && (
          <div className={`px-6 py-2.5 text-sm font-medium text-center ${isOverdue ? "bg-red-50 text-red-700 border-b border-red-100" : "bg-amber-50 text-amber-700 border-b border-amber-100"}`}>
            <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            {isOverdue
              ? `This course is overdue. It was due ${dueDate.toLocaleDateString()}.`
              : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} (${dueDate.toLocaleDateString()})`}
          </div>
        )}

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Hero */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-3">
              {course.category && (
                <Badge variant="info" className="text-[10px] font-bold uppercase tracking-wider">{course.category}</Badge>
              )}
              {isCompleted && (
                <Badge variant="success" className="text-[10px] font-bold uppercase tracking-wider">Completed</Badge>
              )}
              {currentLanguage !== 'en' && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="size-2.5" />
                  AI Translated ({LANGUAGE_LABELS[currentLanguage]})
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
              {currentLanguage === 'en' ? course.title : `[${LANGUAGE_LABELS[currentLanguage]}] ${course.title}`}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
              <span className="flex items-center gap-2">
                <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-semibold">{lessons.length}</span> lessons
              </span>
              <span className="flex items-center gap-2">
                <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <span className="font-semibold">{totalMinutes} min</span> total
                {!isCompleted && completedCount > 0 && (
                  <span className="text-gray-400 font-medium ml-1">(~{remainingMinutes} left)</span>
                )}
              </span>
              {course.tags && course.tags.length > 0 && (
                <span className="flex items-center gap-2">
                  <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                    <Target className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="font-medium text-gray-500">{course.tags.slice(0, 3).join(", ")}</span>
                </span>
              )}
            </div>

            {/* Progress bar */}
            {completedCount > 0 && (
              <div className="mb-8 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">{completedCount} of {lessons.length} lessons complete</span>
                  <span className="font-bold text-gray-900">{percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"}`}
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handleStart} 
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <PlayCircle className="w-6 h-6" />
                {isCompleted
                  ? "Review Course"
                  : completedCount > 0
                  ? `Resume — Lesson ${resumeIndex}`
                  : "Start Building Skills"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-8">
              {/* Description */}
              {course.description && (
                <div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">About This Training</h2>
                  <div className={`text-base text-gray-700 leading-relaxed ${!descExpanded ? "line-clamp-4" : ""}`}>
                    {currentLanguage === 'en' ? course.description : `[${LANGUAGE_LABELS[currentLanguage]} Translation]: ${course.description}`}
                  </div>
                  {course.description.length > 200 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="mt-2 text-sm text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1"
                    >
                      {descExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>}
                    </button>
                  )}
                </div>
              )}

              {/* Lesson list */}
              <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Course Curriculum</h2>
                <div className="space-y-3">
                  {lessons.map((lesson, index) => {
                    const status = getLessonStatus(lesson);
                    const unlocked = isLessonUnlocked(course, lesson.id, user.id);
                    const isLocked = !unlocked;
                    const quiz = hasQuiz(lesson);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (!isLocked) {
                            router.push(`/learner/courses/${courseId}/lessons/${lesson.id}`);
                          }
                        }}
                        disabled={isLocked}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all ${
                          isLocked
                            ? "opacity-50 grayscale border-dashed"
                            : "hover:bg-white hover:shadow-md cursor-pointer group"
                        } ${status === "in_progress" ? "bg-blue-50 border-2 border-blue-200" : "bg-white border border-gray-100"}`}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-gray-100 bg-gray-50 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {isLocked ? (
                            <Lock className="w-4 h-4 text-gray-400" />
                          ) : status === "completed" ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          ) : status === "in_progress" ? (
                            <div className="relative">
                              <CircleDot className="w-6 h-6 text-blue-600" />
                              <div className="absolute inset-0 animate-ping opacity-20"><CircleDot className="w-6 h-6 text-blue-600" /></div>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-gray-400 group-hover:text-white">{index + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-sm font-bold truncate ${status === "completed" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                              {translateLessonTitle(lesson.title, currentLanguage)}
                            </span>
                            {lesson.lessonType === "assessment" && (
                              <Badge variant="warning" className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0">Final Exam</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{lesson.estimatedMinutes || 5} min read</span>
                            {quiz && lesson.lessonType !== "assessment" && (
                              <div className="flex items-center gap-1 text-[10px] text-purple-500 font-bold uppercase tracking-wide">
                                <ClipboardList className="size-3" />
                                Knowledge Check
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-2 rounded-full text-gray-300 group-hover:text-blue-600 transition-colors">
                          <ChevronRight className="size-5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Objectives */}
              {objectives.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Learning Goals
                  </h2>
                  <ul className="space-y-4">
                    {objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-3 group">
                        <div className="mt-1 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 group-hover:scale-150 transition-transform"></div>
                        <span className="text-sm text-gray-700 font-medium leading-relaxed">
                          {currentLanguage === 'en' ? obj : `[${LANGUAGE_LABELS[currentLanguage]}] ${obj}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course Info */}
              <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-200">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Certification Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                    <span className="text-xs text-gray-400">Difficulty</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{course.metadata?.difficulty || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                    <span className="text-xs text-gray-400">Format</span>
                    <span className="text-xs font-bold uppercase tracking-wider">AI Interactive</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Award</span>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Skill Stamp</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50/50">
                <p className="text-[10px] text-gray-400 text-center leading-relaxed font-medium">
                  Generated by UpKeep AI Synthesis.
                  All content is verified against company standards.
                  Translations are powered by deep learning models.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
