"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Eye, Star, Sparkles, Clock, BookOpen, Target } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  getCourseById,
  getLessonsByCourseId,
  getCourseFeedback,
  resolveAssigneesForCourse,
  getProgressCourseByCourseAndUser,
  getUser,
  getSkillV2ById,
  subscribe,
} from "@/lib/store-guard-1302";
import { Course, ProgressCourse, getFullName } from "@/types";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  published: { bg: "bg-green-100", text: "text-green-800" },
  draft: { bg: "bg-yellow-100", text: "text-yellow-800" },
  "ai-draft": { bg: "bg-purple-100", text: "text-purple-800" },
  "in-review": { bg: "bg-blue-100", text: "text-blue-800" },
  rejected: { bg: "bg-red-100", text: "text-red-800" },
};

const PROGRESS_COLORS: Record<string, { bg: string; text: string }> = {
  not_started: { bg: "bg-gray-100", text: "text-gray-600" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-800" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-800" },
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    const refresh = () => {
      const c = getCourseById(courseId);
      setCourse(c ?? null);
    };
    refresh();
    return subscribe(refresh);
  }, [courseId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!course) {
    return (
      <RouteGuard>
        <AdminLayout>
          <div className="text-center py-20">
            <h2 className="text-lg font-semibold text-gray-900">Course not found</h2>
            <p className="text-sm text-gray-500 mt-1">This course may have been deleted.</p>
            <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/courses")} className="mt-4">
              Back to Courses
            </Button>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  const lessons = getLessonsByCourseId(courseId);
  const feedback = getCourseFeedback(courseId);
  const assigneeIds = resolveAssigneesForCourse(courseId);

  const progressEntries: Array<{ userId: string; userName: string; progress: ProgressCourse | undefined }> = assigneeIds.map((uid) => {
    const u = getUser(uid);
    return {
      userId: uid,
      userName: u ? getFullName(u) : uid,
      progress: getProgressCourseByCourseAndUser(courseId, uid),
    };
  });

  const completedCount = progressEntries.filter((e) => e.progress?.status === "completed").length;
  const inProgressCount = progressEntries.filter((e) => e.progress?.status === "in_progress").length;
  const notStartedCount = progressEntries.filter((e) => !e.progress || e.progress.status === "not_started").length;

  const avgRating = feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0;

  const resolveUserName = (userId: string) => {
    const u = getUser(userId);
    return u ? getFullName(u) : userId;
  };

  const resolveSkillName = (skillId: string) => getSkillV2ById(skillId)?.name ?? skillId;

  const objectives = course.metadata?.objectives || [];

  const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="py-3 grid grid-cols-3 gap-4 border-b border-gray-100 last:border-b-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 col-span-2">{children}</dd>
    </div>
  );

  return (
    <RouteGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <button
              onClick={() => router.push("/GUARD-1302/admin/courses")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </button>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[course.status]?.bg ?? "bg-gray-100"} ${STATUS_COLORS[course.status]?.text ?? "text-gray-800"}`}>
                    {course.status === "ai-draft" ? "AI Draft" : course.status === "in-review" ? "In Review" : course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                  </span>
                  {course.category && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {course.category}
                    </span>
                  )}
                  {course.aiGenerated && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-medium rounded">
                      <Sparkles className="w-3 h-3" />
                      AI Generated
                    </span>
                  )}
                </div>
                {course.description && (
                  <p className="text-gray-500 mt-2 max-w-2xl">{course.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="secondary" onClick={() => router.push(`/GUARD-1302/admin/courses/${courseId}/preview`)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Course
                </Button>
                <Button variant="primary" onClick={() => router.push(`/GUARD-1302/admin/courses/${courseId}/edit`)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Course
                </Button>
              </div>
            </div>
          </div>

          {/* Details */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl>
              {course.estimatedMinutes && (
                <DetailRow label="Estimated Time">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {course.estimatedMinutes} minutes
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Lessons">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                  {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                </span>
              </DetailRow>
              {course.tags && course.tags.length > 0 && (
                <DetailRow label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {course.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}
              {course.skillsGranted && course.skillsGranted.length > 0 && (
                <DetailRow label="Skills Granted">
                  <div className="flex flex-wrap gap-1.5">
                    {course.skillsGranted.map((sg) => (
                      <span key={sg.skillId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                        {resolveSkillName(sg.skillId)}
                        {sg.level != null && <span className="ml-1 text-emerald-500">L{sg.level}</span>}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}
              <DetailRow label="Created">{formatDate(course.createdAt)}</DetailRow>
              <DetailRow label="Updated">{formatDate(course.updatedAt)}</DetailRow>
            </dl>
          </Card>

          {/* Learning Objectives */}
          {objectives.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Learning Objectives
              </h2>
              <ul className="space-y-2">
                {objectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold mt-0.5">
                      {idx + 1}
                    </span>
                    {obj}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Learner Progress */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Learner Progress</h2>

            {assigneeIds.length === 0 ? (
              <p className="text-sm text-gray-500">No learners are currently assigned to this course.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-2xl font-bold text-emerald-700">{completedCount}</span>
                    <span className="text-sm text-emerald-600">Completed</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-2xl font-bold text-blue-700">{inProgressCount}</span>
                    <span className="text-sm text-blue-600">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-2xl font-bold text-gray-600">{notStartedCount}</span>
                    <span className="text-sm text-gray-500">Not Started</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessons</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {progressEntries.map((entry) => {
                        const status = entry.progress?.status || "not_started";
                        const statusLabel = status === "not_started" ? "Not Started" : status === "in_progress" ? "In Progress" : "Completed";
                        const doneCount = entry.progress?.lessonDoneCount ?? 0;
                        const total = entry.progress?.lessonTotal ?? lessons.length;
                        return (
                          <tr key={entry.userId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.userName}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PROGRESS_COLORS[status]?.bg ?? "bg-gray-100"} ${PROGRESS_COLORS[status]?.text ?? "text-gray-800"}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{doneCount} / {total}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {entry.progress?.scorePct != null ? `${entry.progress.scorePct}%` : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(entry.progress?.completedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* Learner Feedback */}
          {feedback.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Learner Feedback</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-5 h-5 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <span className="text-lg font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({feedback.length} rating{feedback.length !== 1 ? "s" : ""})</span>
              </div>
              <div className="space-y-3">
                {feedback.map((f) => (
                  <div key={f.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{resolveUserName(f.userId)}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= f.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                    </div>
                    {f.comment && <p className="text-sm text-gray-600">{f.comment}</p>}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(f.submittedAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
