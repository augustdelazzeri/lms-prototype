"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Briefcase,
  Wrench,
  Library,
  Building2,
  FileText,
} from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getCurrentUser } from "@/lib/store-guard-1302";
import JobTitlesTab from "@/components/admin/learningmodel/JobTitlesTab";
import SkillsTab from "@/components/admin/learningmodel/SkillsTab";
import OrganizationTab from "@/components/admin/learningmodel/OrganizationTab";
import SourcesTab from "@/components/admin/learningmodel/SourcesTab";
import ContentStandardsTab from "@/components/admin/learningmodel/ContentStandardsTab";

const TABS = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "content-standards", label: "Content Standards", icon: FileText },
  { id: "jobtitles", label: "Job Titles", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "sources", label: "Sources", icon: Library },
] as const;

type TabId = (typeof TABS)[number]["id"];

function LearningModelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as TabId | null;
  const validTab = TABS.find((t) => t.id === tabParam)?.id;
  const [activeTab, setActiveTab] = useState<TabId>(validTab || "jobtitles");

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // Sync tab from URL
  useEffect(() => {
    if (validTab && validTab !== activeTab) {
      setActiveTab(validTab);
    }
  }, [validTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = useCallback(
    (tabId: TabId) => {
      setActiveTab(tabId);
      router.replace(`/GUARD-1302/admin/learningmodel?tab=${tabId}`, { scroll: false });
    },
    [router]
  );

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only administrators can access the Learning Model.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Learning Model</h1>
          </div>
          <p className="text-gray-600">
            Manage job roles, skills, knowledge sources, and AI-generated training
          </p>
        </div>

        {/* Tab Bar */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex items-center">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "organization" && <OrganizationTab />}
        {activeTab === "content-standards" && <ContentStandardsTab />}
        {activeTab === "jobtitles" && <JobTitlesTab />}
        {activeTab === "skills" && <SkillsTab />}
        {activeTab === "sources" && <SourcesTab />}
      </div>
    </AdminLayout>
  );
}

/* ─── Wrap in Suspense for useSearchParams ────────────────────────────── */

export default function LearningModelPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="max-w-7xl mx-auto py-12 text-center text-gray-500">Loading...</div>
        </AdminLayout>
      }
    >
      <LearningModelContent />
    </Suspense>
  );
}
