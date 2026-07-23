"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import ResponseCard from "@/components/admin/training-responses/ResponseCard";
import {
  getTrainingResponses,
  subscribe,
} from "@/lib/store-guard-1302";
import type { TrainingResponse } from "@/types";

const TABS = [
  { key: "pending", label: "Pending Review", icon: Clock },
  { key: "active", label: "Active", icon: Zap },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function getTabResponses(all: TrainingResponse[], tab: TabKey): TrainingResponse[] {
  switch (tab) {
    case "pending":
      return all.filter((r) => r.status === "draft" || r.status === "approved");
    case "active":
      return all.filter((r) => r.status === "assigned");
    case "completed":
      return all.filter((r) => r.status === "completed");
    case "rejected":
      return all.filter((r) => r.status === "rejected");
    default:
      return [];
  }
}

function TrainingResponsesListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const activeTab = (searchParams.get("tab") || "pending") as TabKey;
  const allResponses = getTrainingResponses();

  const tabCounts = useMemo(() => ({
    pending: allResponses.filter((r) => r.status === "draft" || r.status === "approved").length,
    active: allResponses.filter((r) => r.status === "assigned").length,
    completed: allResponses.filter((r) => r.status === "completed").length,
    rejected: allResponses.filter((r) => r.status === "rejected").length,
  }), [allResponses]);

  const tabResponses = useMemo(
    () =>
      getTabResponses(allResponses, activeTab).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [allResponses, activeTab]
  );

  const switchTab = (tab: TabKey) => {
    router.push(`/GUARD-1302/admin/training-responses?tab=${tab}`);
  };

  return (
    <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
      <AdminLayout>
        <div className="max-w-6xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-6 h-6 text-violet-600" />
                <h1 className="text-xl font-bold text-gray-900">Training Actions</h1>
              </div>
              <p className="text-sm text-gray-500">
                Signal-driven training generated from operational events
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 mb-6 gap-1">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-violet-600 text-violet-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {tabCounts[key] > 0 && (
                    <span
                      className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-violet-100 text-violet-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tabCounts[key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Response List */}
          {tabResponses.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No {activeTab === "pending" ? "pending" : activeTab} training responses.
              </p>
              {activeTab === "pending" && (
                <p className="text-xs text-gray-400 mt-1">
                  Generate training from the{" "}
                  <a
                    href="/GUARD-1302/admin/signals"
                    className="text-violet-600 hover:text-violet-800 underline"
                  >
                    Signals page
                  </a>{" "}
                  to get started.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tabResponses.map((r) => (
                <ResponseCard key={r.id} response={r} />
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

export default function TrainingResponsesListPage() {
  return (
    <Suspense
      fallback={
        <RouteGuard allowedRoles={["ADMIN"]}>
          <AdminLayout>
            <div className="max-w-7xl mx-auto py-12 text-center text-gray-500">Loading...</div>
          </AdminLayout>
        </RouteGuard>
      }
    >
      <TrainingResponsesListContent />
    </Suspense>
  );
}
