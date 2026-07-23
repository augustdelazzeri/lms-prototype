"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import {
  getCurrentUser,
  getAssignedCoursesForUser,
  getProgressCourseByCourseAndUser,
  getCertificatesByUserId,
  subscribe,
} from "@/lib/store-guard-1302";
import { Course, ProgressCourse, Certificate } from "@/types";
import { 
  CheckCircle2,
  Award,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function CompletedCoursesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [completedCourses, setCompletedCourses] = useState<Array<{
    course: Course;
    progress: ProgressCourse;
    certificate?: Certificate;
  }>>([]);

  useEffect(() => {
    const loadData = () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      // Load assigned courses
      const courses = getAssignedCoursesForUser(user.id);
      const certificates = getCertificatesByUserId(user.id);
      
      // Filter to completed courses
      const completed: Array<{
        course: Course;
        progress: ProgressCourse;
        certificate?: Certificate;
      }> = [];

      courses.forEach((course) => {
        const progress = getProgressCourseByCourseAndUser(course.id, user.id);
        if (progress?.status === "completed") {
          const cert = certificates.find(c => c.courseId === course.id);
          completed.push({ course, progress, certificate: cert });
        }
      });

      // Sort by completion date (most recent first)
      completed.sort((a, b) => {
        const dateA = a.progress.completedAt ? new Date(a.progress.completedAt).getTime() : 0;
        const dateB = b.progress.completedAt ? new Date(b.progress.completedAt).getTime() : 0;
        return dateB - dateA;
      });

      setCompletedCourses(completed);
    };

    loadData();
    const unsubscribe = subscribe(loadData);
    return unsubscribe;
  }, []);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCourseClick = (courseId: string) => {
    router.push(`/GUARD-1302/learner/courses/${courseId}`);
  };

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <LearnerLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Completed Courses</h1>
              <p className="text-gray-500 text-sm mt-1">
                {completedCourses.length} course{completedCourses.length !== 1 ? "s" : ""} completed
                {completedCourses.filter(c => c.certificate).length > 0 &&
                  ` \u00b7 ${completedCourses.filter(c => c.certificate).length} certificate${completedCourses.filter(c => c.certificate).length !== 1 ? "s" : ""} earned`}
              </p>
            </div>
          </div>

          {/* Completed Courses Grid */}
          {completedCourses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No completed courses yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm mb-4">
                Complete your assigned courses to see them here and earn certificates.
              </p>
              <Link
                href="/GUARD-1302/learner"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                Go to My Learning
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {completedCourses.map(({ course, progress, certificate }) => (
                <div
                  key={course.id}
                  onClick={() => handleCourseClick(course.id)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                      {certificate && (
                        <Award className="w-4 h-4 text-amber-500" />
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-emerald-700 transition-colors">
                      {course.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      {course.category && <span>{course.category}</span>}
                      {course.category && course.estimatedMinutes && <span>&bull;</span>}
                      {course.estimatedMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.estimatedMinutes} min
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Completed {formatDate(progress.completedAt)}</span>
                    </div>
                  </div>

                  <div className="px-5 pb-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCourseClick(course.id); }}
                      className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Review Course
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {certificate && (
                      <Link
                        href="/GUARD-1302/learner/certificates"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full mt-2 py-1.5 px-3 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center justify-center"
                      >
                        View Certificate
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </LearnerLayout>
    </RouteGuard>
  );
}

