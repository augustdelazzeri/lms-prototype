"use client";

import React, { useState, useEffect } from "react";
import { X, Award, Calendar, RotateCcw, Clock, Maximize2, Minimize2 } from "lucide-react";
import Button from "@/components/Button";
import { Course, ProgressCourse } from "@/types";
import {
  getCertificatesByUserId,
  getCurrentUser,
  getAssignmentForUserAndCourse,
  getTrainingById,
  getResumePointerForCourse,
  getLessonsByCourseId,
  getProgressLesson,
} from "@/lib/store";
import CertificateModal from "./certificates/CertificateModal";
import AccessibilityControls from "./AccessibilityControls";
import { formatDate } from "@/lib/utils";

interface CoursePlayerHeaderProps {
  course: Course;
  progress: ProgressCourse;
  currentLessonId?: string;
  onExit: () => void;
  onResume?: (lessonId: string) => void;
  textSize: "sm" | "base" | "lg";
  highContrast: boolean;
  focusMode: boolean;
  onTextSizeChange: (size: "sm" | "base" | "lg") => void;
  onHighContrastChange: (enabled: boolean) => void;
  onFocusModeChange: (enabled: boolean) => void;
}

export default function CoursePlayerHeader({
  course,
  progress,
  currentLessonId,
  onExit,
  onResume,
  textSize,
  highContrast,
  focusMode,
  onTextSizeChange,
  onHighContrastChange,
  onFocusModeChange,
}: CoursePlayerHeaderProps) {
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  const currentUser = getCurrentUser();
  const certificates = getCertificatesByUserId(currentUser.id);
  const courseCertificate = certificates.find((c) => c.courseId === course.id);
  const isCompleted = progress.completedAt !== undefined;

  const assignment = getAssignmentForUserAndCourse(currentUser.id, course.id);
  const shadowTrainingId = `trn_${course.id}`;
  const shadowTraining = getTrainingById(shadowTrainingId);

  const lessons = getLessonsByCourseId(course.id);
  const completedCount = lessons.filter((l) => {
    const p = getProgressLesson(currentUser.id, l.id);
    return p?.status === "completed";
  }).length;
  const percentComplete = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  const currentLessonIndex = currentLessonId ? lessons.findIndex((l) => l.id === currentLessonId) : -1;

  const now = new Date();
  const dueDate = assignment?.dueAt ? new Date(assignment.dueAt) : null;
  const isOverdue = dueDate && dueDate < now && percentComplete < 100;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const showDueBanner = dueDate && (isOverdue || (daysUntilDue !== null && daysUntilDue <= 7));

  const resumeLessonId = getResumePointerForCourse(currentUser.id, course.id);
  const showResumeButton = resumeLessonId && resumeLessonId !== currentLessonId && !isCompleted;

  // Time remaining
  const remainingMinutes = lessons.reduce((sum, l) => {
    const p = getProgressLesson(currentUser.id, l.id);
    if (p?.status === "completed") return sum;
    return sum + (l.estimatedMinutes || 5);
  }, 0);

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm ${focusMode ? "py-2" : ""}`}>
        {focusMode ? (
          // Minimal header in focus mode
          <div className="max-w-full mx-auto px-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${isCompleted ? "bg-emerald-500" : "bg-blue-600"}`}
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-gray-500 shrink-0">{percentComplete}%</span>
            <button
              onClick={() => onFocusModeChange(false)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              title="Exit focus mode"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <Button variant="secondary" onClick={onExit} className="flex items-center gap-1.5 text-xs py-1 px-2">
              <X className="w-3.5 h-3.5" />
              Exit
            </Button>
          </div>
        ) : (
          <div className="max-w-full mx-auto px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-lg font-bold text-gray-900 truncate">{course.title}</h1>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Completed
                    </span>
                  )}
                  {courseCertificate && (
                    <Button
                      variant="secondary"
                      onClick={() => setIsCertificateModalOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Certificate
                    </Button>
                  )}
                </div>

                {/* Lesson counter + time remaining */}
                <div className="flex items-center gap-4 mb-2 text-sm">
                  {currentLessonIndex >= 0 && (
                    <span className="text-gray-600">
                      Lesson {currentLessonIndex + 1} of {lessons.length}
                    </span>
                  )}
                  {!isCompleted && remainingMinutes > 0 && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      ~{remainingMinutes} min remaining
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{completedCount} of {lessons.length} complete</span>
                    <span className="font-semibold text-gray-700">{percentComplete}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${isCompleted ? "bg-emerald-500" : "bg-blue-600"}`}
                      style={{ width: `${percentComplete}%` }}
                      role="progressbar"
                      aria-valuenow={percentComplete}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AccessibilityControls
                  textSize={textSize}
                  highContrast={highContrast}
                  onTextSizeChange={onTextSizeChange}
                  onHighContrastChange={onHighContrastChange}
                />
                <button
                  onClick={() => onFocusModeChange(true)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Focus mode (F)"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                {showResumeButton && (
                  <Button
                    variant="secondary"
                    onClick={() => onResume?.(resumeLessonId!)}
                    className="flex items-center gap-2"
                    title="Resume from last position"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resume
                  </Button>
                )}
                <Button variant="secondary" onClick={onExit} className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Exit
                </Button>
              </div>
            </div>
          </div>
        )}

        {courseCertificate && (
          <CertificateModal
            isOpen={isCertificateModalOpen}
            onClose={() => setIsCertificateModalOpen(false)}
            certificates={[courseCertificate]}
          />
        )}
      </header>

      {/* Due date banner */}
      {showDueBanner && !focusMode && (
        <div className={`px-6 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
          isOverdue
            ? "bg-red-50 text-red-700 border-b border-red-100"
            : "bg-amber-50 text-amber-700 border-b border-amber-100"
        }`}>
          <Calendar className="w-4 h-4" />
          {isOverdue
            ? `This course is overdue. It was due ${formatDate(assignment!.dueAt!)}.`
            : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} — ${formatDate(assignment!.dueAt!)}`}
        </div>
      )}
    </>
  );
}
