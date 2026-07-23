// User Profile Page - View learner's complete training profile
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ProgressRing from "@/components/ProgressRing";
import Toast from "@/components/Toast";
import {
  getUser,
  getUsers,
  getSites,
  getDepartments,
  getCourses,
  getAssignedCoursesForUser,
  getCompletionsByUserId,
  getCertificatesByUserId,
  getProgressCourseByCourseAndUser,
  getCurrentUser,
  subscribe,
  getUserSkillRecordsByUserId,
  getSkillV2ById,
  getJobTitleById,
  getUserSkillGapsByJobTitle,
  getActiveUserSkillRecordsByUserId,
} from "@/lib/store-guard-1302";
import { User, Course, TrainingCompletion, Certificate, ProgressCourse, getFullName } from "@/types";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Building2,
  MapPin,
  UserCheck,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Plus,
  Calendar,
  ExternalLink,
  GraduationCap,
  TrendingUp,
  Target,
  Users,
  ChevronRight,
  Shield,
} from "lucide-react";
import AssignCourseModal from "@/components/users/AssignCourseModal";

type FilterTab = "all" | "in_progress" | "completed" | "overdue";

interface CourseWithProgress {
  course: Course;
  progress?: ProgressCourse;
  completion?: TrainingCompletion;
  status: "not_started" | "in_progress" | "completed" | "overdue";
  dueAt?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [manager, setManager] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<CourseWithProgress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  const sites = getSites();
  const departments = getDepartments();
  const currentUser = getCurrentUser();

  useEffect(() => {
    const loadData = () => {
      const userData = getUser(userId);
      if (!userData) {
        router.push("/GUARD-1302/admin/users");
        return;
      }
      setUser(userData);
      
      // Get manager if exists
      if (userData.managerId) {
        const managerData = getUser(userData.managerId);
        setManager(managerData || null);
      }
      
      // Get team members if user is a manager
      if (userData.role === "MANAGER" || userData.role === "ADMIN") {
        const allUsers = getUsers();
        const directReports = allUsers.filter(u => u.managerId === userData.id);
        setTeamMembers(directReports);
      } else {
        setTeamMembers([]);
      }
      
      // Get assigned courses with progress
      const courses = getAssignedCoursesForUser(userId);
      const completions = getCompletionsByUserId(userId);
      const now = new Date();
      
      const coursesWithProgress: CourseWithProgress[] = courses.map(course => {
        const progress = getProgressCourseByCourseAndUser(course.id, userId);
        const completion = completions.find(c => c.courseId === course.id);
        
        // Determine status
        let status: CourseWithProgress["status"] = "not_started";
        if (progress?.status === "completed" || completion?.status === "COMPLETED") {
          status = "completed";
        } else if (completion?.status === "OVERDUE" || (completion?.dueAt && new Date(completion.dueAt) < now)) {
          status = "overdue";
        } else if (progress?.status === "in_progress") {
          status = "in_progress";
        }
        
        return {
          course,
          progress,
          completion,
          status,
          dueAt: completion?.dueAt,
        };
      });
      
      setAssignedCourses(coursesWithProgress);
      setCertificates(getCertificatesByUserId(userId));
    };
    
    loadData();
    const unsubscribe = subscribe(loadData);
    return unsubscribe;
  }, [userId, router]);

  // Access control - Managers can only view their direct reports
  const canViewProfile = () => {
    if (!user || !currentUser) return false;
    if (currentUser.role === "ADMIN") return true;
    if (currentUser.role === "MANAGER" && user.managerId === currentUser.id) return true;
    if (currentUser.id === user.id) return true;
    return false;
  };

  if (!user) {
    return (
      <RouteGuard>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading...</p>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  if (!canViewProfile()) {
    return (
      <RouteGuard>
        <AdminLayout>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-gray-700 font-medium">You don't have permission to view this profile</p>
            <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/users")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  const getSiteName = (siteId?: string) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return "—";
    return site.region ? `${site.name} (${site.region})` : site.name;
  };
  const getDepartmentName = (deptId?: string) => departments.find(d => d.id === deptId)?.name || "—";

  // Calculate stats
  const stats = {
    total: assignedCourses.length,
    inProgress: assignedCourses.filter(c => c.status === "in_progress").length,
    completed: assignedCourses.filter(c => c.status === "completed").length,
    overdue: assignedCourses.filter(c => c.status === "overdue").length,
    notStarted: assignedCourses.filter(c => c.status === "not_started").length,
  };
  
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Filter courses based on tab
  const filteredCourses = assignedCourses.filter(c => {
    if (filterTab === "all") return true;
    if (filterTab === "in_progress") return c.status === "in_progress" || c.status === "not_started";
    if (filterTab === "completed") return c.status === "completed";
    if (filterTab === "overdue") return c.status === "overdue";
    return true;
  });

  const getStatusBadge = (status: CourseWithProgress["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "overdue":
        return <Badge variant="error">Overdue</Badge>;
      default:
        return <Badge variant="default">Not Started</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "error";
      case "MANAGER": return "warning";
      case "LEARNER": return "info";
      default: return "default";
    }
  };

  const getInitials = (user: User) => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/users")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Users
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
                <p className="text-sm text-gray-600">View training progress and assignments</p>
              </div>
            </div>
            {currentUser?.role === "ADMIN" && (
              <Button variant="primary" onClick={() => setIsAssignModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Assign Course
              </Button>
            )}
          </div>

          {/* User Info Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30">
                  {getInitials(user)}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{getFullName(user)}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="bg-white/20 text-white border-white/30">
                      {user.role}
                    </Badge>
                    <Badge variant={user.active ? "success" : "default"} className="bg-white/20 text-white border-white/30">
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{getSiteName(user.siteId)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{getDepartmentName(user.departmentId)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    Manager: {manager ? <Link href={`/GUARD-1302/admin/users/${manager.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{getFullName(manager)}</Link> : "—"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Assigned</p>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress + stats.notStarted}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex flex-col items-center">
                <ProgressRing progress={completionRate} size={48} strokeWidth={4} />
                <p className="text-xs text-gray-500 mt-2">Completion Rate</p>
              </div>
            </Card>
          </div>

          {/* Assigned Courses Section */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Assigned Courses</h3>
                </div>
                {/* Filter Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {[
                    { key: "all", label: "All" },
                    { key: "in_progress", label: "In Progress" },
                    { key: "completed", label: "Completed" },
                    { key: "overdue", label: "Overdue" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterTab(tab.key as FilterTab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        filterTab === tab.key
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {filteredCourses.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {filterTab === "all" 
                      ? "No courses assigned yet" 
                      : `No ${filterTab.replace("_", " ")} courses`}
                  </p>
                  {filterTab === "all" && currentUser?.role === "ADMIN" && (
                    <Button 
                      variant="primary" 
                      className="mt-4"
                      onClick={() => setIsAssignModalOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Assign First Course
                    </Button>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCourses.map(({ course, progress, status, dueAt }) => {
                      const progressPct = progress 
                        ? Math.round((progress.lessonDoneCount / Math.max(progress.lessonTotal, 1)) * 100)
                        : 0;
                      return (
                        <tr key={course.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{course.title}</p>
                              <p className="text-xs text-gray-500">{course.category || "Uncategorized"}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    status === "completed" ? "bg-emerald-500" :
                                    status === "overdue" ? "bg-red-500" :
                                    "bg-blue-500"
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">{progressPct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(dueAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Link
                              href={`/GUARD-1302/admin/courses/${course.id}/edit`}
                              className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                            >
                              View Course
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Certificates Section */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Certificates</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {certificates.length}
                </span>
              </div>
            </div>
            {certificates.length === 0 ? (
              <div className="p-12 text-center">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No certificates earned yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Certificates are awarded upon course completion
                </p>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.map(cert => {
                  const course = getCourses().find(c => c.id === cert.courseId);
                  return (
                    <div 
                      key={cert.id}
                      className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="w-5 h-5 text-amber-600" />
                            <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                              Certificate
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {course?.title || cert.courseTitle || "Course Certificate"}
                          </h4>
                          <div className="mt-3 space-y-1 text-xs text-gray-600">
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Issued: {formatDate(cert.issuedAt)}
                            </p>
                            {cert.expiresAt && (
                              <p className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expires: {formatDate(cert.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                          <Award className="w-5 h-5 text-amber-700" />
                        </div>
                      </div>
                      {cert.serial && (
                        <p className="mt-3 text-[10px] font-mono text-gray-400">
                          Serial: {cert.serial}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Skills & Compliance Section */}
          {(() => {
            const userSkills = getUserSkillRecordsByUserId(userId);
            const activeRecords = getActiveUserSkillRecordsByUserId(userId);
            const activeSkillIds = new Set(activeRecords.map((r) => r.skillId));
            const jobTitleEntity = user.jobTitleId ? getJobTitleById(user.jobTitleId) : null;
            const gapResult = user.jobTitleId ? getUserSkillGapsByJobTitle(userId) : null;

            return (
              <Card>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Skills & Compliance</h3>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Job Title Compliance Summary */}
                  {jobTitleEntity && gapResult ? (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-500">Job Title</p>
                          <p className="font-medium text-gray-900">{jobTitleEntity.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Compliance</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  gapResult.compliancePct === 100
                                    ? "bg-green-500"
                                    : gapResult.compliancePct >= 70
                                    ? "bg-yellow-400"
                                    : "bg-red-400"
                                }`}
                                style={{ width: `${gapResult.compliancePct}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {gapResult.compliancePct}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({gapResult.covered.length} of {gapResult.required.length} skills)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Required Skills Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {["Skill", "Status", "Achieved", "Expires"].map((h) => (
                                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {jobTitleEntity.requiredSkills.map((req) => {
                              const skill = getSkillV2ById(req.skillId);
                              if (!skill) return null;
                              const hasSkill = activeSkillIds.has(req.skillId);
                              const record = activeRecords.find((r) => r.skillId === req.skillId);
                              const daysUntilExpiry = record?.expiryDate
                                ? Math.floor(
                                    (new Date(record.expiryDate).getTime() - Date.now()) /
                                      (1000 * 60 * 60 * 24)
                                  )
                                : null;

                              return (
                                <tr key={req.skillId} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {skill.name}
                                  </td>
                                  <td className="px-4 py-3">
                                    {hasSkill ? (
                                      <Badge variant="success">Active</Badge>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                        <AlertCircle className="w-3 h-3" />
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {record?.achievedDate || "—"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {daysUntilExpiry !== null ? (
                                      <span
                                        className={`font-medium ${
                                          daysUntilExpiry < 0
                                            ? "text-red-600"
                                            : daysUntilExpiry < 30
                                            ? "text-yellow-600"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        {record?.expiryDate}
                                        {daysUntilExpiry >= 0 && daysUntilExpiry < 30 && (
                                          <span className="ml-1 text-xs">({daysUntilExpiry}d)</span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : !jobTitleEntity ? (
                    <div className="text-sm text-gray-500 italic">
                      No structured job title assigned. Skill compliance is not tracked.
                    </div>
                  ) : null}

                  {/* Additional Skills (not part of job title requirements) */}
                  {userSkills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {jobTitleEntity ? "All Skill Records" : "Skills & Certifications"}
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{userSkills.length}</span>
                      </h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {["Skill Name", "Type", "Status", "Achieved", "Expiry", "Days Until Expiry"].map((h) => (
                                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userSkills.map((record) => {
                              const skill = getSkillV2ById(record.skillId);
                              if (!skill) return null;
                              const daysUntilExpiry = record.expiryDate
                                ? Math.floor(
                                    (new Date(record.expiryDate).getTime() - Date.now()) /
                                      (1000 * 60 * 60 * 24)
                                  )
                                : null;

                              return (
                                <tr key={record.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {skill.name}
                                    {skill.regulatoryRef && (
                                      <div className="text-xs text-blue-600">{skill.regulatoryRef}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge variant={skill.type === "certification" ? "info" : "default"}>
                                      {skill.type === "certification" ? "Certification" : "Skill"}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge
                                      variant={
                                        record.status === "active"
                                          ? "success"
                                          : record.status === "expired"
                                          ? "error"
                                          : record.status === "pending"
                                          ? "warning"
                                          : "default"
                                      }
                                    >
                                      {record.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {record.achievedDate || "—"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {record.expiryDate || "No expiry"}
                                  </td>
                                  <td className="px-4 py-3">
                                    {daysUntilExpiry !== null ? (
                                      <span
                                        className={`text-sm font-medium ${
                                          daysUntilExpiry < 0
                                            ? "text-red-600"
                                            : daysUntilExpiry < 30
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                        }`}
                                      >
                                        {daysUntilExpiry < 0
                                          ? `Expired ${Math.abs(daysUntilExpiry)}d ago`
                                          : `${daysUntilExpiry} days`}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {userSkills.length === 0 && !jobTitleEntity && (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No skills or certifications yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Skills are earned by completing trainings and courses
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Team Members Section - Only show for managers with direct reports */}
          {teamMembers.length > 0 && (
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {teamMembers.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map(member => {
                    // Get quick stats for each team member
                    const memberCourses = getAssignedCoursesForUser(member.id);
                    const memberCompletions = getCompletionsByUserId(member.id);
                    const completedCount = memberCompletions.filter(c => c.status === "COMPLETED").length;
                    const overdueCount = memberCompletions.filter(c => c.status === "OVERDUE").length;
                    
                    return (
                      <Link
                        key={member.id}
                        href={`/GUARD-1302/admin/users/${member.id}`}
                        className="group flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                            {getFullName(member)}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {memberCourses.length} courses
                            </span>
                            {completedCount > 0 && (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" />
                                {completedCount}
                              </span>
                            )}
                            {overdueCount > 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                {overdueCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </AdminLayout>

      {/* Assign Course Modal */}
      <AssignCourseModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        user={user}
        existingCourseIds={assignedCourses.map(c => c.course.id)}
        onAssigned={() => {
          setToast({ message: "Courses assigned successfully", type: "success" });
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </RouteGuard>
  );
}

