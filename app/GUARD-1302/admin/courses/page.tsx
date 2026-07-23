"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import { BookOpen, Trash2, Sparkles, Search, MoreHorizontal, Pencil } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import {
  getCourses,
  deleteCourse,
  subscribe,
  getCurrentUser,
} from "@/lib/store-guard-1302";
import { Course, CourseStatus } from "@/types";

export default function CoursesPage() {
  return (
    <Suspense>
      <CoursesPageInner />
    </Suspense>
  );
}

function CoursesPageInner() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | CourseStatus>("");
  const [filterCategory, setFilterCategory] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showGeneratingToast, setShowGeneratingToast] = useState(false);
  const searchParams = useSearchParams();

  const currentUser = getCurrentUser();
  const isManager = currentUser.role === "MANAGER";

  useEffect(() => {
    const updateData = () => setCourses(getCourses());
    updateData();
    const unsubscribe = subscribe(updateData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    if (searchParams.get("toast") === "generating") {
      setShowGeneratingToast(true);
      window.history.replaceState({}, "", "/admin/courses");
    }
  }, [searchParams]);

  const handleDeleteCourse = (courseId: string, courseTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${courseTitle}"? All lessons, sections, quizzes, and progress will be removed.`)) {
      deleteCourse(courseId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const uniqueCategories = Array.from(
    new Set(courses.map((c) => c.category).filter(Boolean))
  ).sort() as string[];

  const getFilteredCourses = (): Course[] => {
    return courses.filter((course) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(query);
        const matchesCategory = course.category?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCategory) return false;
      }
      if (filterStatus && course.status !== filterStatus) return false;
      if (filterCategory && course.category !== filterCategory) return false;
      return true;
    });
  };

  const filteredCourses = getFilteredCourses();
  const hasActiveFilters = searchQuery || filterStatus || filterCategory;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("");
    setFilterCategory("");
  };

  const getStatusBadge = (course: Course) => {
    switch (course.status) {
      case "published":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            Published
          </span>
        );
      case "ai-draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            AI Draft
          </span>
        );
      case "in-review":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            In Review
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Rejected
          </span>
        );
      case "generating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 animate-pulse rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3 h-3" />
            Generating...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            Draft
          </span>
        );
    }
  };

  return (
    <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
              <p className="text-gray-500 mt-1">
                {isManager ? "View course library (read-only)" : "Create and manage learning content for your organization"}
              </p>
            </div>
            {!isManager && (
              <Button variant="primary" onClick={() => router.push("/GUARD-1302/admin/courses/generate")}>
                + Create Course
              </Button>
            )}
          </div>

          {isManager && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>Read-Only Mode:</strong> As a Manager, you can view courses but cannot create, edit, or delete them.
            </div>
          )}

          {/* Filters — production-style row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "" | CourseStatus)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Status: All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="ai-draft">AI Draft</option>
              <option value="in-review">In Review</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Category: All</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="relative ml-auto">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          {courses.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
                {!isManager && (
                  <div className="mt-6">
                    <Button variant="primary" onClick={() => router.push("/GUARD-1302/admin/courses/generate")}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create First Course
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          No courses match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredCourses.map((course) => {
                        return (
                          <tr
                            key={course.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/GUARD-1302/admin/courses/${course.id}/edit`)}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              <span className="hover:text-blue-600 transition-colors">{course.title}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {course.tags && course.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {course.tags.slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      {tag}
                                    </span>
                                  ))}
                                  {course.tags.length > 3 && (
                                    <span className="text-xs text-gray-400">+{course.tags.length - 3}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {course.category || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(course.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {getStatusBadge(course)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {!isManager && (
                                <div className="relative inline-block">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === course.id ? null : course.id);
                                    }}
                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {openMenuId === course.id && (
                                    <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                          router.push(`/GUARD-1302/admin/courses/${course.id}/edit`);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          setOpenMenuId(null);
                                          handleDeleteCourse(course.id, course.title, e);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
        {showGeneratingToast && (
          <Toast
            message="Your course is being generated. We'll notify you when it's ready."
            type="info"
            duration={5000}
            onClose={() => setShowGeneratingToast(false)}
          />
        )}
      </AdminLayout>
    </RouteGuard>
  );
}
