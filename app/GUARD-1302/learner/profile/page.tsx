// Learner Profile Page - User Info
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import { 
  getCurrentUser, 
  getSites, 
  getDepartments, 
  getUser,
  getAssignedCoursesForUser,
  getProgressCoursesByUserId,
  getCertificatesByUserId,
  getEarnedSkillsByUser,
  subscribe 
} from "@/lib/store-guard-1302";
import { User, getFullName } from "@/types";
import { 
  User as UserIcon,
  Mail,
  Building2,
  Briefcase,
  Users,
  BookOpen,
  CheckCircle2,
  Award,
  Stamp,
  ArrowRight
} from "lucide-react";

export default function LearnerProfilePage() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    certificates: 0,
    skills: 0
  });

  useEffect(() => {
    const updateState = () => {
      const user = getCurrentUser();
      setCurrentUser(user);

      // Calculate stats
      const assignedCourses = getAssignedCoursesForUser(user.id);
      const progress = getProgressCoursesByUserId(user.id);
      const completedCount = progress.filter(p => p.status === "completed").length;
      const certs = getCertificatesByUserId(user.id);
      const earnedSkills = getEarnedSkillsByUser(user.id);

      setStats({
        totalCourses: assignedCourses.length,
        completedCourses: completedCount,
        certificates: certs.length,
        skills: earnedSkills.length
      });
    };
    
    updateState();
    const unsubscribe = subscribe(updateState);
    return unsubscribe;
  }, []);

  // Get site and department names
  const sites = getSites();
  const departments = getDepartments();
  const userSite = currentUser.siteId ? sites.find(s => s.id === currentUser.siteId) : null;
  const siteName = userSite ? (userSite.region ? `${userSite.name} (${userSite.region})` : userSite.name) : null;
  const deptName = currentUser.departmentId ? departments.find(d => d.id === currentUser.departmentId)?.name : null;
  
  // Get manager info
  const manager = currentUser.managerId ? getUser(currentUser.managerId) : null;

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <LearnerLayout>
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100"></div>
            <div className="px-6 pb-6 -mt-8">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="w-16 h-16 rounded-xl bg-white shadow-md flex items-center justify-center border-2 border-white">
                  <div className="w-full h-full rounded-lg bg-emerald-600 flex items-center justify-center text-white text-lg font-bold">
                    {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 pt-1 md:pt-0">
                  <h1 className="text-xl font-bold text-gray-900">
                    {getFullName(currentUser)}
                  </h1>
                  <p className="text-sm text-gray-500">Learner</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/GUARD-1302/learner" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  <p className="text-xs text-gray-500">Assigned Courses</p>
                </div>
              </div>
            </Link>
            <Link href="/GUARD-1302/learner/completed" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedCourses}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            </Link>
            <Link href="/GUARD-1302/learner/certificates" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.certificates}</p>
                  <p className="text-xs text-gray-500">Certificates</p>
                </div>
              </div>
            </Link>
            <Link href="/GUARD-1302/learner/passport" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Stamp className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.skills}</p>
                  <p className="text-xs text-gray-500">Skills Earned</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-400" />
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{currentUser.email}</p>
                  </div>
                </div>
                {siteName && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Site</p>
                      <p className="text-sm font-medium text-gray-900">{siteName}</p>
                    </div>
                  </div>
                )}
                {deptName && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="text-sm font-medium text-gray-900">{deptName}</p>
                    </div>
                  </div>
                )}
                {manager && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Manager</p>
                      <p className="text-sm font-medium text-gray-900">{getFullName(manager)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
              <div className="space-y-3">
                <Link 
                  href="/GUARD-1302/learner" 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                    <span className="font-medium">My Courses</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                </Link>
                <Link 
                  href="/GUARD-1302/learner/certificates" 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-amber-50 hover:text-amber-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-gray-400 group-hover:text-amber-600" />
                    <span className="font-medium">My Certificates</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600" />
                </Link>
                <Link 
                  href="/GUARD-1302/learner/passport" 
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Stamp className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
                    <span className="font-medium">Skill Passport</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </LearnerLayout>
    </RouteGuard>
  );
}
