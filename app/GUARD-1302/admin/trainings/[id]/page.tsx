"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import TrainingModal from "@/components/TrainingModal";
import {
  getTrainingById,
  getCompletionsByTrainingId,
  getUser,
  getSite,
  getDepartment,
  getSkillV2ById,
  deleteTraining,
  subscribe,
} from "@/lib/store-guard-1302";
import { Training, TrainingCompletion, TrainingCategory, getFullName } from "@/types";

const CATEGORY_COLORS: Record<TrainingCategory, { bg: string; text: string }> = {
  Safety: { bg: "bg-red-100", text: "text-red-800" },
  Compliance: { bg: "bg-amber-100", text: "text-amber-800" },
  Onboarding: { bg: "bg-green-100", text: "text-green-800" },
  Technical: { bg: "bg-blue-100", text: "text-blue-800" },
  HR: { bg: "bg-purple-100", text: "text-purple-800" },
  Other: { bg: "bg-gray-100", text: "text-gray-800" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-green-100", text: "text-green-800" },
  draft: { bg: "bg-yellow-100", text: "text-yellow-800" },
  archived: { bg: "bg-gray-100", text: "text-gray-600" },
};

const COMPLETION_COLORS: Record<string, { bg: string; text: string }> = {
  ASSIGNED: { bg: "bg-blue-100", text: "text-blue-800" },
  COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-800" },
  OVERDUE: { bg: "bg-orange-100", text: "text-orange-800" },
  EXEMPT: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trainingId = params.id as string;

  const [training, setTraining] = useState<Training | null>(null);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const t = getTrainingById(trainingId);
      setTraining(t ?? null);
      setCompletions(getCompletionsByTrainingId(trainingId));
    };
    refresh();
    return subscribe(refresh);
  }, [trainingId]);

  const handleDelete = () => {
    if (!training) return;
    if (confirm(`Are you sure you want to delete "${training.title}"? All associated completions will be removed.`)) {
      deleteTraining(training.id);
      router.push("/GUARD-1302/admin/trainings");
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

  if (!training) {
    return (
      <RouteGuard>
        <AdminLayout>
          <div className="text-center py-20">
            <h2 className="text-lg font-semibold text-gray-900">Training not found</h2>
            <p className="text-sm text-gray-500 mt-1">This training may have been deleted.</p>
            <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/trainings")} className="mt-4">
              Back to Trainings
            </Button>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  const assignedCount = completions.filter((c) => c.status === "ASSIGNED").length;
  const completedCount = completions.filter((c) => c.status === "COMPLETED").length;
  const overdueCount = completions.filter((c) => c.status === "OVERDUE").length;
  const exemptCount = completions.filter((c) => c.status === "EXEMPT").length;

  const resolveUserName = (userId: string) => {
    const u = getUser(userId);
    return u ? getFullName(u) : userId;
  };

  const resolveSiteName = (siteId: string) => getSite(siteId)?.name ?? siteId;
  const resolveDeptName = (deptId: string) => getDepartment(deptId)?.name ?? deptId;
  const resolveSkillName = (skillId: string) => getSkillV2ById(skillId)?.name ?? skillId;

  const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="py-3 grid grid-cols-3 gap-4 border-b border-gray-100 last:border-b-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 col-span-2">{children}</dd>
    </div>
  );

  return (
    <RouteGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <button
              onClick={() => router.push("/GUARD-1302/admin/trainings")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Trainings
            </button>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900">{training.title}</h1>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[training.status].bg} ${STATUS_COLORS[training.status].text}`}>
                    {training.status.charAt(0).toUpperCase() + training.status.slice(1)}
                  </span>
                  {training.category && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[training.category].bg} ${CATEGORY_COLORS[training.category].text}`}>
                      {training.category}
                    </span>
                  )}
                </div>
                {training.description && (
                  <p className="text-gray-500 mt-2 max-w-2xl">{training.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="secondary" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Details */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl>
              {training.standardRef && (
                <DetailRow label="Standard Reference">
                  <span className="text-blue-600 font-medium">{training.standardRef}</span>
                </DetailRow>
              )}
              <DetailRow label="Category">{training.category ?? "—"}</DetailRow>
              {training.vendor && <DetailRow label="Vendor">{training.vendor}</DetailRow>}
              {training.retrainIntervalDays && (
                <DetailRow label="Retrain Interval">{training.retrainIntervalDays} days</DetailRow>
              )}
              {training.policyUrl && (
                <DetailRow label="Policy">
                  <a href={training.policyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    View Policy <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </DetailRow>
              )}
              {training.contentUrl && (
                <DetailRow label="Content">
                  <a href={training.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    View Content <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </DetailRow>
              )}
              <DetailRow label="Training Format">
                {training.trainingFormat ? (
                  <span className="text-gray-700">
                    {training.trainingFormat === "other"
                      ? training.trainingFormatOther || "Other"
                      : { "in-person": "In-Person", "classroom": "Classroom", "on-site": "On-Site", "third-party-online": "Third-Party Online" }[training.trainingFormat] ?? training.trainingFormat}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </DetailRow>
              {training.skillsGranted && training.skillsGranted.length > 0 && (
                <DetailRow label="Skills Granted">
                  <div className="flex flex-wrap gap-1.5">
                    {training.skillsGranted.map((sg) => (
                      <span key={sg.skillId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                        {resolveSkillName(sg.skillId)}
                        {sg.level != null && <span className="ml-1 text-emerald-500">L{sg.level}</span>}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}
              {training.skillsRequired && training.skillsRequired.length > 0 && (
                <DetailRow label="Skills Required">
                  <div className="flex flex-wrap gap-1.5">
                    {training.skillsRequired.map((sr) => (
                      <span key={sr.skillId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {resolveSkillName(sr.skillId)}
                        {sr.level != null && <span className="ml-1 text-blue-500">L{sr.level}</span>}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}
              {training.tags && training.tags.length > 0 && (
                <DetailRow label="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {training.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </DetailRow>
              )}
              <DetailRow label="Created">{formatDate(training.createdAt)}</DetailRow>
              <DetailRow label="Updated">{formatDate(training.updatedAt)}</DetailRow>
            </dl>
          </Card>

          {/* Assignment */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>
            {(() => {
              const { roles, sites, departments, users } = training.assignment;
              const hasAssignment = (roles?.length ?? 0) > 0 || (sites?.length ?? 0) > 0 || (departments?.length ?? 0) > 0 || (users?.length ?? 0) > 0;

              if (!hasAssignment) {
                return <p className="text-sm text-gray-500">No assignment criteria configured.</p>;
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roles && roles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Roles</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map((role) => (
                          <span key={role} className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {sites && sites.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Sites</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {sites.map((siteId) => (
                          <span key={siteId} className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {resolveSiteName(siteId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {departments && departments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Departments</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {departments.map((deptId) => (
                          <span key={deptId} className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {resolveDeptName(deptId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {users && users.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Individual Users</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {users.map((userId) => (
                          <span key={userId} className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {resolveUserName(userId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>

          {/* Progress */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>

            {/* Summary stats */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-2xl font-bold text-blue-700">{assignedCount}</span>
                <span className="text-sm text-blue-600">Assigned</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-2xl font-bold text-emerald-700">{completedCount}</span>
                <span className="text-sm text-emerald-600">Completed</span>
              </div>
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200">
                  <span className="text-2xl font-bold text-orange-700">{overdueCount}</span>
                  <span className="text-sm text-orange-600">Overdue</span>
                </div>
              )}
              {exemptCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-2xl font-bold text-gray-600">{exemptCount}</span>
                  <span className="text-sm text-gray-500">Exempt</span>
                </div>
              )}
            </div>

            {/* Per-user completion table */}
            {completions.length === 0 ? (
              <p className="text-sm text-gray-500">No completions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {resolveUserName(c.userId)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COMPLETION_COLORS[c.status]?.bg ?? "bg-gray-100"} ${COMPLETION_COLORS[c.status]?.text ?? "text-gray-800"}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.dueAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.completedAt)}</td>
                        <td className="px-4 py-3 text-sm">
                          {c.overdueDays && c.overdueDays > 0 ? (
                            <span className="text-orange-600 font-medium">{c.overdueDays} days</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {c.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <TrainingModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            training={training}
            onSave={() => {
              const t = getTrainingById(trainingId);
              setTraining(t ?? null);
            }}
          />
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
