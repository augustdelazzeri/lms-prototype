"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import CourseCard from "@/components/learner/CourseCard";
import {
  getCurrentUser,
  getAssignedCoursesForUser,
  getProgressCourseByCourseAndUser,
  getAssignmentForUserAndCourse,
  getDueSoonForUser,
  getOverdueForUser,
  getResumePointer,
  getCourseById,
  getLessonById,
  subscribe,
  getOnboardingAssignmentsByUserId,
  getOnboardingPathById,
} from "@/lib/store-guard-1302";
import { Course, ProgressCourse, CourseAssignment } from "@/types";
import { 
  Play, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Lock,
  GraduationCap,
} from "lucide-react";

export default function LearnerDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [assignedCourses, setAssignedCourses] = useState<Course[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressCourse>>({});
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, CourseAssignment>>({});
  const [resumePointer, setResumePointer] = useState<{ courseId: string; lessonId: string } | null>(null);
  const [dueSoonCourses, setDueSoonCourses] = useState<Array<{ course: Course; assignment: CourseAssignment }>>([]);
  const [overdueCourses, setOverdueCourses] = useState<Array<{ course: Course; assignment: CourseAssignment; daysOverdue: number }>>([]);

  useEffect(() => {
    const loadData = () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      // Load assigned courses (published only)
      const courses = getAssignedCoursesForUser(user.id);
      setAssignedCourses(courses);

      // Load progress and assignments
      const progress: Record<string, ProgressCourse> = {};
      const assignments: Record<string, CourseAssignment> = {};
      
      courses.forEach((course) => {
        const progressData = getProgressCourseByCourseAndUser(course.id, user.id);
        if (progressData) {
          progress[course.id] = progressData;
        }
        
        const assignment = getAssignmentForUserAndCourse(user.id, course.id);
        if (assignment) {
          assignments[course.id] = assignment;
        }
      });

      setProgressMap(progress);
      setAssignmentsMap(assignments);

      // Load resume pointer
      const resume = getResumePointer(user.id);
      setResumePointer(resume);

      // Load due soon and overdue
      const dueSoon = getDueSoonForUser(user.id, 14);
      setDueSoonCourses(dueSoon);

      const overdue = getOverdueForUser(user.id);
      setOverdueCourses(overdue);
    };

    loadData();

    const unsubscribe = subscribe(() => {
      loadData();
    });

    return unsubscribe;
  }, []);

  // Get active courses (not completed)
  const activeCourses = assignedCourses.filter((course) => {
    const progress = progressMap[course.id];
    return !progress || progress.status !== "completed";
  });

  // Sort courses: overdue first, then due soon, then by due date, then in-progress first
  const getSortedCourses = (courses: Course[]): Course[] => {
    return [...courses].sort((a, b) => {
      const assignmentA = assignmentsMap[a.id];
      const assignmentB = assignmentsMap[b.id];
      const progressA = progressMap[a.id];
      const progressB = progressMap[b.id];

      // Check if overdue
      const isOverdueA = overdueCourses.some(o => o.course.id === a.id);
      const isOverdueB = overdueCourses.some(o => o.course.id === b.id);
      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      // Check if due soon
      const isDueSoonA = dueSoonCourses.some(d => d.course.id === a.id);
      const isDueSoonB = dueSoonCourses.some(d => d.course.id === b.id);
      if (isDueSoonA && !isDueSoonB) return -1;
      if (!isDueSoonA && isDueSoonB) return 1;

      // Sort by due date asc (if exists)
      if (assignmentA?.dueAt && assignmentB?.dueAt) {
        const dateA = new Date(assignmentA.dueAt).getTime();
        const dateB = new Date(assignmentB.dueAt).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      } else if (assignmentA?.dueAt && !assignmentB?.dueAt) {
        return -1;
      } else if (!assignmentA?.dueAt && assignmentB?.dueAt) {
        return 1;
      }

      // Then in-progress first
      const isInProgressA = progressA?.status === "in_progress";
      const isInProgressB = progressB?.status === "in_progress";
      if (isInProgressA && !isInProgressB) return -1;
      if (!isInProgressA && isInProgressB) return 1;

      // Finally by title asc
      return a.title.localeCompare(b.title);
    });
  };

  const sortedActiveCourses = getSortedCourses(activeCourses);

  const handleCourseClick = (courseId: string) => {
    if (courseId === "crs_loto_full") {
      router.push(`/GUARD-1302/learner/course/${courseId}`);
    } else {
      router.push(`/GUARD-1302/learner/courses/${courseId}`);
    }
  };

  const handleResume = (courseId: string, lessonId: string) => {
    if (courseId === "crs_loto_full") {
      router.push(`/GUARD-1302/learner/course/${courseId}`);
    } else {
      router.push(`/GUARD-1302/learner/courses/${courseId}/lessons/${lessonId}`);
    }
  };

  // Get resume course/lesson info
  const resumeCourse = resumePointer ? getCourseById(resumePointer.courseId) : null;
  const resumeLesson = resumePointer ? getLessonById(resumePointer.lessonId) : null;

  // Stats
  const inProgressCount = activeCourses.filter(c => progressMap[c.id]?.status === "in_progress").length;
  const notStartedCount = activeCourses.filter(c => !progressMap[c.id] || progressMap[c.id]?.status === "not_started").length;
  const completedCount = assignedCourses.length - activeCourses.length;

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <LearnerLayout>
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Welcome back, {currentUser.firstName}
                </h1>
                <p className="text-gray-500 text-sm">
                  {activeCourses.length === 0
                    ? "You're all caught up! Check back soon for new training assignments."
                    : `You have ${activeCourses.length} active course${activeCourses.length !== 1 ? "s" : ""} to complete.`}
                </p>

                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Play className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 leading-none">{inProgressCount}</p>
                      <p className="text-xs text-gray-500">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 leading-none">{notStartedCount}</p>
                      <p className="text-xs text-gray-500">Not Started</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 leading-none">{completedCount}</p>
                      <p className="text-xs text-gray-500">Completed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resume Card */}
              {resumeCourse && resumeLesson && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 min-w-[280px] max-w-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Continue Learning</p>
                      <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                        {resumeCourse.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {resumeLesson.title}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResume(resumePointer!.courseId, resumePointer!.lessonId)}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Resume
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Onboarding Section */}
          <OnboardingSection userId={currentUser.id} />

          {/* Alert Banners — compact inline */}
          {overdueCourses.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 flex-1">
                <span className="font-semibold">{overdueCourses.length} overdue</span>
                {" — "}
                {overdueCourses.map(o => o.course.title).join(", ")}
              </p>
              <button
                onClick={() => handleCourseClick(overdueCourses[0].course.id)}
                className="text-sm font-medium text-red-700 hover:text-red-800 flex items-center gap-1 flex-shrink-0"
              >
                View <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {dueSoonCourses.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 flex-1">
                <span className="font-semibold">{dueSoonCourses.length} due soon</span>
                {" — "}
                {dueSoonCourses.map(d => d.course.title).join(", ")}
              </p>
              <button
                onClick={() => handleCourseClick(dueSoonCourses[0].course.id)}
                className="text-sm font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 flex-shrink-0"
              >
                View <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Courses Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
              <Link
                href="/GUARD-1302/learner/completed"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                View Completed
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {sortedActiveCourses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-500 max-w-md mx-auto text-sm">
                  You don't have any active courses right now. Check back soon for new assignments.
                </p>
                <Link
                  href="/GUARD-1302/learner/completed"
                  className="inline-flex items-center gap-2 mt-4 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                >
                  View Completed Courses
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedActiveCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={progressMap[course.id]}
                    assignment={assignmentsMap[course.id]}
                    onOpen={() => handleCourseClick(course.id)}
                    onResume={(lessonId) => handleResume(course.id, lessonId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </LearnerLayout>
    </RouteGuard>
  );
}

/* ─── Onboarding Section ──────────────────────────────────────────────── */

function OnboardingSection({ userId }: { userId: string }) {
  const assignments = getOnboardingAssignmentsByUserId(userId).filter((a) => a.status === "active");

  // Compute initial expanded phases (current in-progress phase)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => {
    if (assignments.length === 0) return new Set<string>();
    const a0 = assignments[0];
    const inProg = a0.phaseProgress.find((p) => p.status === "in_progress");
    return inProg ? new Set([inProg.phaseId]) : new Set<string>();
  });

  if (assignments.length === 0) return null;

  const a = assignments[0];
  const path = getOnboardingPathById(a.pathId);
  if (!path) return null;

  const today = new Date();
  const dayNum = Math.max(1, Math.ceil((today.getTime() - new Date(a.startDate).getTime()) / 86400000));
  const totalCompletedCourses = a.phaseProgress.reduce((s, p) => s + p.coursesCompleted, 0);
  const totalCourses = a.phaseProgress.reduce((s, p) => s + p.coursesTotal, 0);
  const progressPct = totalCourses > 0 ? Math.round((totalCompletedCourses / totalCourses) * 100) : 0;

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <GraduationCap className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-bold text-gray-900">Your Onboarding Plan</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
        <span>{path.title.replace(" Onboarding", "")}</span>
        <span>&bull;</span>
        <span>Started {new Date(a.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <span>&bull;</span>
        <span>Day {dayNum} of {path.durationDays}</span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600">{progressPct}% complete</span>
      </div>

      {/* Phases */}
      <div className="space-y-2">
        {path.phases.map((phase, i) => {
          const pp = a.phaseProgress.find((p) => p.phaseId === phase.id);
          if (!pp) return null;

          const isExpanded = expandedPhases.has(phase.id);
          const prevPhase = i > 0 ? path.phases[i - 1] : null;
          const prevPP = prevPhase ? a.phaseProgress.find((p) => p.phaseId === prevPhase.id) : null;

          const statusIcon =
            pp.status === "completed" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : pp.status === "in_progress" ? (
              <Clock className="w-4 h-4 text-blue-500" />
            ) : (
              <Lock className="w-4 h-4 text-gray-300" />
            );

          const statusLabel =
            pp.status === "completed"
              ? "Complete"
              : pp.status === "in_progress"
              ? "In Progress"
              : prevPP
              ? `Complete ${prevPhase?.name} to unlock`
              : "Locked";

          const startDate = new Date(a.startDate);
          const phaseDueDate = new Date(startDate.getTime() + phase.dayEnd * 86400000);

          const phaseBorder =
            pp.status === "completed"
              ? "border-emerald-200 bg-emerald-50/30"
              : pp.status === "in_progress"
              ? "border-blue-200 bg-blue-50/30"
              : "border-gray-200";

          return (
            <div key={phase.id} className={`border rounded-lg overflow-hidden ${phaseBorder}`}>
              <button
                onClick={() => pp.status !== "locked" && togglePhase(phase.id)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left ${
                  pp.status === "locked" ? "opacity-60 cursor-default" : "hover:bg-white/60"
                }`}
              >
                {pp.status !== "locked" ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )
                ) : (
                  <Lock className="w-4 h-4 text-gray-300" />
                )}
                <span className="text-sm font-medium text-gray-900 flex-1">
                  Phase {i + 1}: {phase.timeline} — {phase.name}
                </span>
                {statusIcon}
                <span className="text-xs text-gray-500">{statusLabel}</span>
              </button>

              {/* Phase content */}
              {isExpanded && pp.status !== "locked" && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {phase.courses.map((course, ci) => {
                    const isCompleted = ci < pp.coursesCompleted;
                    const isCurrent = ci === pp.coursesCompleted && pp.status === "in_progress";

                    return (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isCompleted ? "text-gray-400 line-through" : "text-gray-900"}`}>
                            {course.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {course.estimatedMinutes} min — Due{" "}
                            {phaseDueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        {isCurrent && (
                          <button className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-full hover:bg-emerald-700">
                            {ci === 0 ? "Start" : "Continue"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
