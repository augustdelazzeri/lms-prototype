"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import { BookOpen, Trash2, Sparkles, Search, MoreHorizontal, Pencil } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import {
  getCourses,
  deleteCourse,
  subscribe,
  getCurrentUser,
} from "@/lib/store";
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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
        return <Badge variant="success">Published</Badge>;
      case "ai-draft":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            <Sparkles className="w-3 h-3" />
            AI Draft
          </span>
        );
      case "in-review":
        return <Badge variant="warning">In Review</Badge>;
      case "rejected":
        return <Badge variant="error">Rejected</Badge>;
      case "generating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 animate-pulse bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
            <Sparkles className="w-3 h-3" />
            Generating...
          </span>
        );
      default:
        return <Badge variant="default">Draft</Badge>;
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
              <Button variant="primary" onClick={() => router.push("/admin/courses/generate")}>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            )}
          </div>

          {isManager && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>Read-Only Mode:</strong> As a Manager, you can view courses but cannot create, edit, or delete them.
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title or category..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "" | CourseStatus)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="ai-draft">AI Draft</option>
                  <option value="in-review">In Review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>Showing {filteredCourses.length} of {courses.length} courses</span>
                <button onClick={clearFilters} className="text-primary hover:underline">
                  Clear filters
                </button>
              </div>
            )}
          </Card>

          {/* Table */}
          {courses.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No courses yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
                {!isManager && (
                  <div className="mt-6">
                    <Button variant="primary" onClick={() => router.push("/admin/courses/generate")}>
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
                        const isAI = course.aiGenerated === true;

                        return (
                          <tr
                            key={course.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/admin/courses/${course.id}`)}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                <span className="hover:text-blue-600 transition-colors">{course.title}</span>
                                {isAI && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-500 text-[10px] font-medium rounded flex-shrink-0">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    AI
                                  </span>
                                )}
                              </div>
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
                                          router.push(`/admin/courses/${course.id}/edit`);
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
