// Preview Header Component - Shows preview mode banner and navigation
"use client";

import React from "react";
import { Eye, ArrowLeft, BookOpen, Play, Clock, CheckCircle, Lock, Video, FileCheck, X } from "lucide-react";
import { Course, Lesson } from "@/types";

interface PreviewHeaderProps {
  course: Course;
  currentLesson: Lesson | undefined;
  lessonIndex: number;
  totalLessons: number;
  progressPercent: number;
  onExit: () => void;
}

export default function PreviewHeader({
  course,
  currentLesson,
  lessonIndex,
  totalLessons,
  progressPercent,
  onExit,
}: PreviewHeaderProps) {
  // Check if there are any active policies to display
  const hasActivePolicies = course.policy && (
    course.policy.progression === "linear" ||
    (course.policy.minVideoWatchPct && course.policy.minVideoWatchPct > 0) ||
    (course.policy.minTimeOnLessonSec && course.policy.minTimeOnLessonSec > 0) ||
    course.policy.requireQuizPassToCompleteLesson
  );

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      {/* Preview Mode Alert Bar */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-semibold uppercase tracking-wide">
              <Eye className="w-3.5 h-3.5" />
              Preview Mode
            </div>
            <p className="text-sm text-amber-800">
              Viewing as a learner would see it. Progress is <span className="font-medium">not tracked</span>.
            </p>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Exit Preview
          </button>
        </div>
      </div>
      
      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-8">
          {/* Course Icon & Title */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{course.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <Play className="w-3.5 h-3.5" />
                  Lesson {lessonIndex + 1} of {totalLessons}
                </span>
                {currentLesson && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600 truncate max-w-[200px]">{currentLesson.title}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="hidden lg:flex items-center gap-6 px-6 py-3 bg-gray-50 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{progressPercent}%</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Complete</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="w-32">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress</span>
                <span>{lessonIndex + 1}/{totalLessons}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mobile Progress */}
          <div className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <span className="text-sm font-semibold text-gray-900">{progressPercent}%</span>
          </div>

          {/* Back to Editor Button */}
          <button
            onClick={onExit}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Editor
          </button>
        </div>
      </div>

      {/* Course Requirements Bar */}
      {hasActivePolicies && (
        <div className="bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-2">
                Course Requirements:
              </span>
              {course.policy?.progression === "linear" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Sequential lessons
                </span>
              )}
              {course.policy?.minVideoWatchPct && course.policy.minVideoWatchPct > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600">
                  <Video className="w-3 h-3 text-slate-400" />
                  {course.policy.minVideoWatchPct}% video required
                </span>
              )}
              {course.policy?.minTimeOnLessonSec && course.policy.minTimeOnLessonSec > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {Math.round(course.policy.minTimeOnLessonSec / 60)} min/lesson
                </span>
              )}
              {course.policy?.requireQuizPassToCompleteLesson && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600">
                  <FileCheck className="w-3 h-3 text-slate-400" />
                  Quiz pass required
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
