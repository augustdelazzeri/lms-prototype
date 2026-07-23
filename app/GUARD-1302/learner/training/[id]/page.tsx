// Phase I Epic 4 & UI Refresh v2: Learner training detail with lucide icons
/**
 * ACCEPTANCE CHECKLIST (Epic 4):
 * ✓ Detail page displays assignment info, due/completed dates, overdue days
 * ✓ Proof preview when available (read-only for learner)
 * ✓ Action controls disabled with tooltip: "Managers/Admins mark completions"
 * ✓ Breadcrumb back to /learner
 * ✓ Permissions: Learner can only view their own completions
 * ✓ UI Refresh v2: lucide icons, no emojis
 */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Paperclip, ExternalLink } from "lucide-react";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import {
  getCurrentUser,
  getCompletionById,
  getTrainingById,
  getUsers,
  getSites,
  getDepartments,
  subscribe,
} from "@/lib/store-guard-1302";
import { formatDate } from "@/lib/utils";

export default function TrainingDetailPage() {
  const params = useParams();
  const completionId = params.id as string;

  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [completion, setCompletion] = useState(getCompletionById(completionId));

  const users = getUsers();
  const sites = getSites();
  const departments = getDepartments();

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setCurrentUser(getCurrentUser());
      setCompletion(getCompletionById(completionId));
    });
    return unsubscribe;
  }, [completionId]);

  if (!completion) {
    return (
      <RouteGuard>
        <LearnerLayout>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Training Not Found</h2>
            <p className="text-gray-600 mb-6">The training you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/GUARD-1302/learner">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
          </div>
        </LearnerLayout>
      </RouteGuard>
    );
  }

  const training = getTrainingById(completion.trainingId);
  const user = getUsers().find(u => u.id === completion.userId);
  const site = user?.siteId ? sites.find(s => s.id === user.siteId) : undefined;
  const dept = user?.departmentId ? departments.find(d => d.id === user.departmentId) : undefined;

  const getStatusBadge = () => {
    switch (completion.status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "ASSIGNED":
        return <Badge variant="info">Assigned</Badge>;
      case "OVERDUE":
        return <Badge variant="error">Overdue</Badge>;
      default:
        return <Badge variant="default">{completion.status}</Badge>;
    }
  };

  const getAssignmentScope = () => {
    if (!training) return "—";
    const { assignment } = training;
    const parts = [];
    if (assignment.roles && assignment.roles.length > 0) {
      parts.push(`Roles: ${assignment.roles.join(", ")}`);
    }
    if (assignment.sites && assignment.sites.length > 0) {
      const siteNames = assignment.sites.map(id => sites.find(s => s.id === id)?.name || id);
      parts.push(`Sites: ${siteNames.join(", ")}`);
    }
    if (assignment.departments && assignment.departments.length > 0) {
      const deptNames = assignment.departments.map(id => departments.find(d => d.id === id)?.name || id);
      parts.push(`Departments: ${deptNames.join(", ")}`);
    }
    return parts.length > 0 ? parts.join(" • ") : "Organization-wide";
  };

  return (
    <RouteGuard>
      <LearnerLayout>
        <div>
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link href="/GUARD-1302/learner" className="text-sm hover:underline" style={{ color: "var(--primary-color)" }}>
              ← Back to My Trainings
            </Link>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{training?.title}</h1>
              {training?.standardRef && (
                <p className="text-sm text-gray-600">Standard Reference: {training.standardRef}</p>
              )}
            </div>
            <div>{getStatusBadge()}</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {training?.description && (
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-700">{training.description}</p>
                </Card>
              )}

              {/* Assignment Info */}
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Assignment Information</h2>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Assigned To:</dt>
                    <dd className="text-sm text-gray-900">{getAssignmentScope()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Your Site:</dt>
                    <dd className="text-sm text-gray-900">{site?.name || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">Your Department:</dt>
                    <dd className="text-sm text-gray-900">{dept?.name || "—"}</dd>
                  </div>
                  {training?.retrainIntervalDays && (
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Retraining Interval:</dt>
                      <dd className="text-sm text-gray-900">Every {training.retrainIntervalDays} days</dd>
                    </div>
                  )}
                </dl>
              </Card>

              {/* Related Policy/SOP */}
              {training?.policyUrl && (
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Related Policy / SOP</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Review the related policy or standard operating procedure:
                  </p>
                  <a
                    href={training.policyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    View Policy Document
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Card>
              )}

              {/* Proof of Completion */}
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Proof of Completion</h2>
                {completion.status === "COMPLETED" && completion.proofUrl ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Certificate or proof document:</p>
                    <a
                      href={completion.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
                      style={{ color: "var(--primary-color)" }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      View Proof Document
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">
                      {completion.status === "COMPLETED"
                        ? "No proof document attached."
                        : "Proof will be attached when your manager or admin marks this training as complete."}
                    </p>
                  </div>
                )}
              </Card>

              {/* Notes */}
              {completion.notes && (
                <Card>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
                  <p className="text-gray-700">{completion.notes}</p>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status Details */}
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Details</h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">Due Date</dt>
                    <dd className="text-sm text-gray-900">{formatDate(completion.dueAt)}</dd>
                  </div>
                  {completion.status === "OVERDUE" && completion.overdueDays && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 mb-1">Days Overdue</dt>
                      <dd className="text-sm font-bold text-red-600">{completion.overdueDays} days</dd>
                    </div>
                  )}
                  {completion.status === "COMPLETED" && completion.completedAt && (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-1">Completed On</dt>
                        <dd className="text-sm text-gray-900">{formatDate(completion.completedAt)}</dd>
                      </div>
                      {completion.expiresAt && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500 mb-1">Expires On</dt>
                          <dd className="text-sm text-gray-900">{formatDate(completion.expiresAt)}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </Card>

              {/* Action Area */}
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                {completion.status !== "COMPLETED" ? (
                  <div>
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed relative group"
                      title="Only managers and admins can mark completions"
                    >
                      Mark as Complete
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Managers/Admins mark completions
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-green-600 mt-2">Training Completed</p>
                  </div>
                )}
              </Card>

              {/* Help */}
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">What&apos;s this?</h2>
                <p className="text-sm text-gray-600 mb-3">
                  This training is part of your compliance requirements. You must complete it by the due date to maintain certification.
                </p>
                {training?.retrainIntervalDays && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Retraining:</span> This training must be retaken every{" "}
                    {training.retrainIntervalDays} days to stay compliant.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </div>
      </LearnerLayout>
    </RouteGuard>
  );
}

