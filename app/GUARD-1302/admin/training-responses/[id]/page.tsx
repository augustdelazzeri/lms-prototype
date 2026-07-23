"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Zap,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  Loader2,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import {
  getTrainingResponseById,
  getOperationalSignalById,
  getSkillV2ById,
  getUser,
  getCurrentUser,
  approveTrainingResponse,
  assignTrainingResponse,
  rejectTrainingResponse,
  completeTrainingResponseTarget,
  subscribe,
  getLibraryItems,
} from "@/lib/store-guard-1302";
import { getFullName } from "@/types";
import type { TrainingResponse, TrainingResponseTarget } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  incident_retraining: "Incident Retraining",
  corrective_training: "Corrective Training",
  near_miss_briefing: "Near-Miss Briefing",
  regulatory_update: "Regulatory Update",
  delta_renewal: "Delta Renewal",
  rebuilt_renewal: "Full Rebuild",
  clean_renewal: "Clean Renewal",
  path_refresh: "Path Refresh",
  role_change_gap: "Role Change Gap",
  new_equipment_process: "New Equipment/Process",
};

const STATUS_VARIANTS: Record<string, "default" | "info" | "warning" | "success" | "error"> = {
  draft: "default",
  approved: "info",
  assigned: "warning",
  completed: "success",
  rejected: "error",
};

const URGENCY_VARIANTS: Record<string, "error" | "warning" | "info" | "default"> = {
  immediate: "error",
  urgent: "warning",
  standard: "info",
  blocking: "error",
};

export default function TrainingResponseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const response = getTrainingResponseById(id);
  const currentUser = getCurrentUser();

  if (!response) {
    return (
      <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
        <AdminLayout>
          <div className="text-center py-20">
            <p className="text-gray-500">Training response not found.</p>
            <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/training-responses")} className="mt-4">
              <ArrowLeft className="w-4 h-4" /> Back to Training Actions
            </Button>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  const signal = response.triggeredBySignalId
    ? getOperationalSignalById(response.triggeredBySignalId)
    : null;

  const allSources = getLibraryItems();
  const completedTargets = response.targets.filter((t) => t.status === "completed").length;
  const totalTargets = response.targets.length;

  const handleApproveAndAssign = () => {
    approveTrainingResponse(id, currentUser.id);
    assignTrainingResponse(id);
    setShowApproveModal(false);
    setToast("Training approved and assigned to all targets.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleReject = (reason: string) => {
    rejectTrainingResponse(id, currentUser.id, reason);
    setShowRejectModal(false);
    setToast("Training response rejected.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleCompleteTarget = (userId: string) => {
    const score = response.assessmentRequired ? 85 + Math.floor(Math.random() * 15) : undefined;
    completeTrainingResponseTarget(id, userId, score);
    const user = getUser(userId);
    setToast(`${user ? getFullName(user) : userId} marked as complete${score ? ` (score: ${score}%)` : ""}.`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
      <AdminLayout>
        <div className="max-w-5xl">
          {/* Back */}
          <button
            onClick={() => router.push("/GUARD-1302/admin/training-responses")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training Actions
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={STATUS_VARIANTS[response.status] || "default"}>
                  {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                </Badge>
                <Badge variant="default">{TYPE_LABELS[response.type] || response.type}</Badge>
                <Badge variant={URGENCY_VARIANTS[response.urgency] || "default"}>
                  {response.urgency.toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{response.title}</h1>
              <p className="text-sm text-gray-500">{response.description}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {response.totalEstimatedMinutes} min
                </span>
                {response.assessmentRequired && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Assessment required (pass: {response.passingScore}%)
                  </span>
                )}
                <span>
                  Generated{" "}
                  {new Date(response.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {response.deadline && (
                  <span className="text-amber-600 font-medium">
                    Deadline:{" "}
                    {new Date(response.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {response.status === "draft" && (
                <>
                  <Button variant="secondary" onClick={() => setShowRejectModal(true)}>
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                  <Button variant="primary" onClick={() => setShowApproveModal(true)}>
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Assign
                  </Button>
                </>
              )}
              {response.status === "approved" && (
                <Button
                  variant="primary"
                  onClick={() => {
                    assignTrainingResponse(id);
                    setToast("Training assigned to all targets.");
                    setTimeout(() => setToast(null), 3000);
                  }}
                >
                  <Users className="w-4 h-4" />
                  Assign to Users
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Trigger Card */}
              {signal && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Triggered By Signal
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-gray-900 text-sm">{signal.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{signal.description}</p>
                  <button
                    onClick={() => router.push("/GUARD-1302/admin/signals")}
                    className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    View in Signals <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Content Preview */}
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-3">Content Preview</h2>
                <div className="space-y-3">
                  {response.sections.map((section, idx) => (
                    <div
                      key={section.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400">
                          Section {idx + 1}
                        </span>
                        {section.isAssessment && (
                          <Badge variant="warning">Assessment</Badge>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          {section.estimatedMinutes} min
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {section.title}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">{section.description}</p>
                      <div className="space-y-1">
                        {section.lessons.map((lesson, li) => (
                          <div
                            key={li}
                            className="flex items-center gap-2 text-xs text-gray-500 pl-2"
                          >
                            {lesson.isAssessment ? (
                              <BookOpen className="w-3 h-3 text-amber-500" />
                            ) : (
                              <FileText className="w-3 h-3 text-gray-300" />
                            )}
                            <span>{lesson.title}</span>
                            <span className="ml-auto text-gray-400">
                              {lesson.estimatedMinutes} min
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delta Changes */}
              {response.deltaChanges && response.deltaChanges.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 mb-3">
                    What&apos;s Changed
                  </h2>
                  <div className="space-y-2">
                    {response.deltaChanges.map((dc, i) => (
                      <div
                        key={i}
                        className="border border-amber-200 bg-amber-50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="warning">
                            {dc.changeType.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-800">{dc.description}</p>
                        {dc.before && dc.after && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-red-50 border border-red-100 rounded p-2">
                              <p className="font-medium text-red-700 mb-0.5">Before</p>
                              <p className="text-red-600">{dc.before}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded p-2">
                              <p className="font-medium text-emerald-700 mb-0.5">After</p>
                              <p className="text-emerald-600">{dc.after}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Attribution */}
              {response.sourceAttributions.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-800 mb-3">
                    Source Attribution
                  </h2>
                  <div className="space-y-1">
                    {response.sourceAttributions.map((sid) => {
                      const src = allSources.find((s) => s.id === sid);
                      return (
                        <div
                          key={sid}
                          className="flex items-center gap-2 text-sm text-gray-700 py-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          {src?.title || sid}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right column: Targets */}
            <div className="space-y-6">
              {/* Targets */}
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  Target Users ({completedTargets}/{totalTargets})
                </h2>
                {response.status === "assigned" && totalTargets > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>
                        {Math.round((completedTargets / totalTargets) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{
                          width: `${(completedTargets / totalTargets) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                  {response.targets.map((target) => (
                    <TargetRow
                      key={target.userId}
                      target={target}
                      response={response}
                      onComplete={() => handleCompleteTarget(target.userId)}
                    />
                  ))}
                  {response.targets.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400">
                      No targets assigned yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Skill Impact */}
              <div>
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  Affected Skills
                </h2>
                <div className="space-y-2">
                  {response.affectedSkillIds.map((sid) => {
                    const skill = getSkillV2ById(sid);
                    return (
                      <div
                        key={sid}
                        className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-800">{skill?.name || sid}</span>
                        <Badge
                          variant={
                            response.skillAction === "suspend_until_complete"
                              ? "error"
                              : response.skillAction === "renew"
                              ? "warning"
                              : response.skillAction === "grant"
                              ? "success"
                              : "default"
                          }
                        >
                          {response.skillAction.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Approve & Assign Training
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This will approve the training and assign it to{" "}
                <strong>{response.targetUserIds.length}</strong> user(s).
                {response.skillAction === "suspend_until_complete" &&
                  " Affected skills will be SUSPENDED until completion."}
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleApproveAndAssign}>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Assign
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <RejectModal
            onReject={handleReject}
            onClose={() => setShowRejectModal(false)}
          />
        )}

        {toast && (
          <Toast message={toast} type="success" onClose={() => setToast(null)} />
        )}
      </AdminLayout>
    </RouteGuard>
  );
}

function TargetRow({
  target,
  response,
  onComplete,
}: {
  target: TrainingResponseTarget;
  response: TrainingResponse;
  onComplete: () => void;
}) {
  const user = getUser(target.userId);
  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="px-3 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user ? getFullName(user) : target.userId}
        </p>
        <p className="text-xs text-gray-400">
          {user?.jobTitleText || user?.role}
        </p>
      </div>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          statusColors[target.status] || statusColors.pending
        }`}
      >
        {target.status.replace(/_/g, " ")}
      </span>
      {target.assessmentScore !== undefined && (
        <span className="text-xs text-gray-500">{target.assessmentScore}%</span>
      )}
      {response.status === "assigned" &&
        (target.status === "pending" || target.status === "in_progress") && (
          <button
            onClick={onComplete}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
          >
            Mark Complete
          </button>
        )}
    </div>
  );
}

function RejectModal({
  onReject,
  onClose,
}: {
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          Reject Training Response
        </h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for rejection..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none mb-4"
        />
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onReject(reason)}
            disabled={!reason.trim()}
            className="!bg-red-600 hover:!bg-red-700"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
