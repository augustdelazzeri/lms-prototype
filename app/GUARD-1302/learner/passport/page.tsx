// Skill Passport Page - Premium Redesign
"use client";

import React, { useState, useEffect, useRef } from "react";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import { getCurrentUser, getEarnedSkillsByUser, subscribe, getOrganization, getProgressCoursesByUserId, getCertificatesByUserId, getCompletionsByUserId, getActiveUserSkillRecordsByUserId, getSkillV2ById } from "@/lib/store-guard-1302";
import type { SkillV2, UserSkillRecord } from "@/types";
import { Download, BookOpen, Stamp, Calendar, Award, Shield, Verified, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SkillStamp from "@/components/learner/SkillStamp";

export default function SkillPassportPage() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [earnedSkills, setEarnedSkills] = useState(getEarnedSkillsByUser(currentUser.id));
  const [v2Records, setV2Records] = useState<UserSkillRecord[]>([]);
  const organization = getOrganization();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const updateState = () => {
      const user = getCurrentUser();
      setCurrentUser(user);
      setEarnedSkills(getEarnedSkillsByUser(user.id));
      setV2Records(getActiveUserSkillRecordsByUserId(user.id));
    };
    
    updateState();
    const unsubscribe = subscribe(updateState);
    return unsubscribe;
  }, []);

  // Skills V2: Group V2 records by category (used when V2 records exist)
  const v2SkillsByCategory = v2Records.reduce((acc, record) => {
    const skill = getSkillV2ById(record.skillId);
    if (!skill) return acc;
    const category = skill.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push({ skill, record });
    return acc;
  }, {} as Record<string, Array<{ skill: SkillV2; record: UserSkillRecord }>>);

  const hasV2Skills = v2Records.length > 0;

  const getSkillEarnedDate = (skillId: string, courseId: string): string | null => {
    const userId = currentUser.id;
    const progress = getProgressCoursesByUserId(userId).find(
      p => p.courseId === courseId && p.status === "completed"
    );
    if (progress?.completedAt) return progress.completedAt;
    
    const certificate = getCertificatesByUserId(userId).find(c => c.courseId === courseId);
    if (certificate?.issuedAt) return certificate.issuedAt;
    
    const completions = getCompletionsByUserId(userId);
    const trainingCompletion = completions.find(
      c => c.courseId === courseId && c.status === "COMPLETED" && c.completedAt
    );
    if (trainingCompletion?.completedAt) return trainingCompletion.completedAt;
    
    return null;
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current || isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 595.28;
      const pdfHeight = 841.89;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'pt', 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const firstName = currentUser.firstName || 'User';
      const lastName = currentUser.lastName || '';
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `Skill_Passport_${firstName}_${lastName}_${dateStr}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Group skills by category
  const skillsByCategory = earnedSkills.reduce((acc, { skill, courses }) => {
    const category = skill.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ skill, courses });
    return acc;
  }, {} as Record<string, Array<{ skill: typeof earnedSkills[0]['skill']; courses: typeof earnedSkills[0]['courses'] }>>);

  // Category styles for section headers
  const categoryHeaderStyles: Record<string, { bg: string; border: string; icon: string }> = {
    Safety: { bg: "bg-rose-50", border: "border-rose-200", icon: "text-rose-500" },
    Equipment: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500" },
    Compliance: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-500" },
    Emergency: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500" },
    Leadership: { bg: "bg-cyan-50", border: "border-cyan-200", icon: "text-cyan-500" },
    Quality: { bg: "bg-teal-50", border: "border-teal-200", icon: "text-teal-500" },
    Other: { bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-500" },
  };

  const totalCourses = earnedSkills.reduce((sum, { courses }) => sum + courses.length, 0);

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <LearnerLayout>
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 md:p-10">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/4 -right-1/4 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-3xl" />
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 mb-4">
                    <Verified className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Verified Credentials</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Skill Passport
                  </h1>
                  <p className="text-slate-300 max-w-lg">
                    Your official record of verified skills and competencies earned through completed training programs.
                  </p>

                  {/* User info pill */}
                  <div className="mt-6 inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{currentUser.firstName} {currentUser.lastName}</p>
                      <p className="text-xs text-slate-400">{organization.name}</p>
                    </div>
                  </div>
                </div>

                {/* Stats & Action */}
                <div className="flex flex-col gap-4">
                  {/* Stats cards */}
                  <div className="flex gap-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 text-center min-w-[100px]">
                      <p className="text-3xl font-bold text-white">{hasV2Skills ? v2Records.length : earnedSkills.length}</p>
                      <p className="text-xs text-slate-400 font-medium">Skills</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 text-center min-w-[100px]">
                      <p className="text-3xl font-bold text-white">{hasV2Skills ? Object.keys(v2SkillsByCategory).length : Object.keys(skillsByCategory).length}</p>
                      <p className="text-xs text-slate-400 font-medium">Categories</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 text-center min-w-[100px]">
                      <p className="text-3xl font-bold text-white">{totalCourses}</p>
                      <p className="text-xs text-slate-400 font-medium">Courses</p>
                    </div>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF || (earnedSkills.length === 0 && !hasV2Skills)}
                    className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-slate-900 font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Export Passport
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Content */}
          {earnedSkills.length === 0 && !hasV2Skills ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <Stamp className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Skills Earned Yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Complete training courses to earn verified skill badges. Each completed course adds new skills to your passport.
              </p>
              <a
                href="/GUARD-1302/learner"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Browse Courses
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Skills V2 records (shown when V2 data exists) */}
              {hasV2Skills && (
                <>
                  {Object.entries(v2SkillsByCategory).map(([category, items]) => {
                    const headerStyle = categoryHeaderStyles[category] || categoryHeaderStyles.Other;
                    return (
                      <div key={`v2-${category}`}>
                        <div className={`${headerStyle.bg} ${headerStyle.border} border rounded-xl px-5 py-3 mb-4 flex items-center justify-between`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                              <Shield className={`w-4 h-4 ${headerStyle.icon}`} />
                            </div>
                            <div>
                              <h2 className="font-bold text-gray-900">{category}</h2>
                              <p className="text-xs text-gray-500">{items.length} skill{items.length !== 1 ? "s" : ""} earned</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {items.map(({ skill, record }) => (
                            <SkillStamp
                              key={record.id}
                              skill={{ id: skill.id, name: skill.name, category: skill.category }}
                              courses={[]}
                              earnedDate={record.achievedDate || undefined}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Legacy skills rendering (shown when no V2 data) */}
              {!hasV2Skills && Object.entries(skillsByCategory).map(([category, items]) => {
                const headerStyle = categoryHeaderStyles[category] || categoryHeaderStyles.Other;
                
                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className={`${headerStyle.bg} ${headerStyle.border} border rounded-xl px-5 py-3 mb-4 flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center`}>
                          <Shield className={`w-4 h-4 ${headerStyle.icon}`} />
                        </div>
                        <div>
                          <h2 className="font-bold text-gray-900">{category}</h2>
                          <p className="text-xs text-gray-500">{items.length} skill{items.length !== 1 ? 's' : ''} earned</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {items.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${headerStyle.icon.replace('text-', 'bg-')}`} />
                        ))}
                        {items.length > 3 && (
                          <span className="text-xs text-gray-400 ml-1">+{items.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {/* Skills Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map(({ skill, courses }) => {
                        const completionDates = courses
                          .map(course => getSkillEarnedDate(skill.id, course.id))
                          .filter((date): date is string => date !== null)
                          .sort();
                        const earliestDate = completionDates[0];

                        return (
                          <SkillStamp
                            key={skill.id}
                            skill={skill}
                            courses={courses}
                            earnedDate={earliestDate || undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {(earnedSkills.length > 0 || hasV2Skills) && (
            <div className="text-center py-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Issued by <span className="font-semibold text-gray-700">{organization.name}</span>
                <span className="mx-2">•</span>
                Last updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Hidden PDF Container */}
          <div 
            ref={pdfRef} 
            className="fixed -left-[9999px] top-0" 
            style={{ width: '8.5in' }}
          >
            <div className="bg-white p-8">
              {/* PDF Header */}
              <div className="border-b-4 border-indigo-600 pb-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">SKILL PASSPORT</h1>
                    <p className="text-gray-500">{currentUser.firstName} {currentUser.lastName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{organization.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* PDF Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{earnedSkills.length}</p>
                  <p className="text-sm text-gray-600">Total Skills</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{Object.keys(skillsByCategory).length}</p>
                  <p className="text-sm text-gray-600">Categories</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{totalCourses}</p>
                  <p className="text-sm text-gray-600">Courses</p>
                </div>
              </div>

              {/* PDF Skills */}
              {Object.entries(skillsByCategory).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">{category}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {items.map(({ skill, courses }) => {
                      const completionDates = courses
                        .map(course => getSkillEarnedDate(skill.id, course.id))
                        .filter((date): date is string => date !== null)
                        .sort();
                      const earliestDate = completionDates[0];

                      return (
                        <div key={skill.id} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">{skill.name}</h3>
                          {earliestDate && (
                            <p className="text-xs text-gray-500 mb-2">
                              Earned: {new Date(earliestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Courses: </span>
                            {courses.map(c => c.title).join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* PDF Footer */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                This document certifies the skills earned by {currentUser.firstName} {currentUser.lastName} through verified training completion.
              </div>
            </div>
          </div>
        </div>
      </LearnerLayout>
    </RouteGuard>
  );
}
