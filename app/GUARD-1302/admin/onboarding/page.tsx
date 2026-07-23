"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Button from "@/components/Button";
import { subscribe, getJobTitles, getOnboardingPaths } from "@/lib/store-guard-1302";
import PathsTab from "@/components/admin/onboarding/PathsTab";
import GenerateWizard from "@/components/admin/onboarding/GenerateWizard";
import PathPreview from "@/components/admin/onboarding/PathPreview";
import BatchGenerateModal from "@/components/admin/onboarding/BatchGenerateModal";

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const actionParam = searchParams.get("action");
  const jobTitleIdParam = searchParams.get("jobTitleId");
  const previewParam = searchParams.get("preview");

  const [showWizard, setShowWizard] = useState(actionParam === "generate");
  const [previewPathId, setPreviewPathId] = useState<string | null>(previewParam || null);
  const [showBatchGenerate, setShowBatchGenerate] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  useEffect(() => {
    if (actionParam === "generate") setShowWizard(true);
    if (previewParam) setPreviewPathId(previewParam);
  }, [actionParam, previewParam]);

  const openWizard = useCallback(
    (jtId?: string) => {
      setShowWizard(true);
      setPreviewPathId(null);
      const url = jtId
        ? `/admin/onboarding?action=generate&jobTitleId=${jtId}`
        : `/admin/onboarding?action=generate`;
      router.replace(url, { scroll: false });
    },
    [router]
  );

  const openPreview = useCallback(
    (pathId: string) => {
      setPreviewPathId(pathId);
      setShowWizard(false);
      router.replace(`/GUARD-1302/admin/onboarding?preview=${pathId}`, { scroll: false });
    },
    [router]
  );

  const closePreview = useCallback(() => {
    setPreviewPathId(null);
    router.replace(`/GUARD-1302/admin/onboarding`, { scroll: false });
  }, [router]);

  const onWizardComplete = useCallback(
    (pathId: string) => {
      setShowWizard(false);
      openPreview(pathId);
    },
    [openPreview]
  );

  if (showWizard) {
    return (
      <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
        <AdminLayout>
          <GenerateWizard
            preselectedJobTitleId={jobTitleIdParam || undefined}
            onCancel={() => {
              setShowWizard(false);
              router.replace("/GUARD-1302/admin/onboarding", { scroll: false });
            }}
            onComplete={onWizardComplete}
          />
        </AdminLayout>
      </RouteGuard>
    );
  }

  if (previewPathId) {
    return (
      <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
        <AdminLayout>
          <PathPreview pathId={previewPathId} onBack={closePreview} />
        </AdminLayout>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Onboarding</h1>
              <p className="text-gray-500 mt-1">Create and manage onboarding programs for new hires</p>
            </div>
            <Button variant="primary" onClick={() => openWizard()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Generate New Path
            </Button>
          </div>

          <PathsTab
            onGenerate={openWizard}
            onPreview={openPreview}
            onBatchGenerate={() => setShowBatchGenerate(true)}
          />
        </div>

        {showBatchGenerate && (
          <BatchGenerateModal
            uncoveredJTs={getJobTitles()
              .filter((jt) => jt.active)
              .filter(
                (jt) =>
                  !getOnboardingPaths().some(
                    (p) => p.jobTitleId === jt.id && p.status === "published"
                  )
              )}
            onClose={() => setShowBatchGenerate(false)}
            onComplete={() => setShowBatchGenerate(false)}
          />
        )}
      </AdminLayout>
    </RouteGuard>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <OnboardingPageInner />
    </Suspense>
  );
}
