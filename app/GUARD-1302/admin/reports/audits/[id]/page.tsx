/**
 * PHASE I POLISH PACK ACCEPTANCE CHECKLIST:
 * ✓ Display frozen snapshot with filters summary
 * ✓ Read-only table with frozen data
 * ✓ Download CSV and Print buttons
 * ✓ Print stylesheet applies
 */
"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import {
  getAuditSnapshotById,
  getTrainings,
  getUsers,
  getSites,
  getDepartments,
  getUser,
  getCertificatesByUserId,
} from "@/lib/store-guard-1302";
import { formatDate } from "@/lib/utils";
import { CompletionStatus, getFullName } from "@/types";
import { Award, ExternalLink } from "lucide-react";

export default function AuditSnapshotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const snapshotId = params.id as string;
  
  const snapshot = getAuditSnapshotById(snapshotId);
  const trainings = getTrainings();
  const users = getUsers();
  const sites = getSites();
  const departments = getDepartments();

  if (!snapshot) {
    return (
      <RouteGuard>
        <AdminLayout>
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Snapshot not found.</p>
            <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/reports/audits")}>
              Back to Audit Snapshots
            </Button>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  const creator = getUser(snapshot.createdByUserId);

  const getTraining = (trainingId: string) => trainings.find((t) => t.id === trainingId);
  const getUserById = (userId: string) => users.find((u) => u.id === userId);
  const getSite = (siteId?: string) => siteId ? sites.find((s) => s.id === siteId) : undefined;
  const getDepartment = (deptId?: string) => deptId ? departments.find((d) => d.id === deptId) : undefined;

  const getStatusBadge = (status: CompletionStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "ASSIGNED":
        return <Badge variant="info">Assigned</Badge>;
      case "OVERDUE":
        return <Badge variant="error">Overdue</Badge>;
      case "EXEMPT":
        return <Badge variant="exempt">Exempt</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleDownloadCSV = () => {
    const csvHeader = "Training,Employee,Site,Department,Status,Due Date,Completed,Overdue Days,Notes\n";
    const csvRows = snapshot.rows.map((row) => {
      const training = getTraining(row.trainingId);
      const user = getUserById(row.userId);
      const site = getSite(user?.siteId);
      const dept = getDepartment(user?.departmentId);

      return `"${training?.title || ""}","${user ? getFullName(user) : ""}","${site?.name || ""}","${dept?.name || ""}","${row.status}","${row.dueAt}","${row.completedAt || ""}","${row.overdueDays || 0}","${row.notes || ""}"`;
    }).join("\n");

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-snapshot-${snapshot.id}-${formatDate(snapshot.createdAt)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          {/* Header - hidden in print */}
          <div className="mb-6 no-print">
            <Button variant="secondary" onClick={() => router.push("/GUARD-1302/admin/reports/audits")}>
              ← Back to Audits
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Audit Snapshot: {snapshot.id}</h1>
            <p className="text-sm text-gray-600 mt-2">
              Created by {creator ? <Link href={`/GUARD-1302/admin/users/${creator.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{getFullName(creator)}</Link> : "Unknown"} on {formatDate(snapshot.createdAt)}
            </p>
          </div>

          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Filters Applied</h2>
            <p className="text-sm text-gray-600">{snapshot.filtersSummary}</p>
            <p className="text-sm text-gray-500 mt-1">Total rows: {snapshot.rowCount}</p>
          </Card>

          <div className="mb-4 flex gap-3 no-print">
            <Button variant="primary" onClick={handleDownloadCSV}>
              Download CSV
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              Print
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Training
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overdue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {snapshot.rows.map((row, index) => {
                    const training = getTraining(row.trainingId);
                    const user = getUserById(row.userId);
                    const site = getSite(user?.siteId);
                    const dept = getDepartment(user?.departmentId);

                    return (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {training?.title || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-sm">{user ? <Link href={`/GUARD-1302/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{getFullName(user)}</Link> : "Unknown"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{site?.name || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{dept?.name || "—"}</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(row.dueAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {row.completedAt ? formatDate(row.completedAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.overdueDays && row.overdueDays > 0 ? (
                            <span className="text-red-600 font-medium">{row.overdueDays} days</span>
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
          </Card>

          {/* Phase II 1H.3: Certificates Section */}
          {(() => {
            // Collect unique user IDs from completions
            const userIds = [...new Set(snapshot.rows.map(row => row.userId))];
            
            // Get all certificates for these users
            const allCertificates = userIds.flatMap(userId => getCertificatesByUserId(userId));
            
            // Filter certificates that might be related to course completions
            // (Note: TrainingCompletion might have courseId if it's course-based)
            const relatedCertificates = allCertificates.filter(cert => {
              // Check if any completion in snapshot is for a course that matches this certificate
              return snapshot.rows.some(row => {
                const training = getTraining(row.trainingId);
                // If training has courseId, match it with certificate's courseId
                return training?.courseId === cert.courseId;
              });
            });

            if (relatedCertificates.length === 0) return null;

            return (
              <Card className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Certificates</h2>
                  <span className="text-sm text-gray-500">({relatedCertificates.length})</span>
                </div>
                <div className="space-y-3">
                  {relatedCertificates.map((cert) => {
                    const user = getUserById(cert.userId);
                    return (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {cert.courseTitle || "Course Certificate"}
                            </span>
                            {user && (
                              <span className="text-sm text-gray-500">
                                • <Link href={`/GUARD-1302/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{getFullName(user)}</Link>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>Serial: <span className="font-mono">{cert.serial}</span></span>
                            <span>Issued: {formatDate(cert.issuedAt)}</span>
                          </div>
                        </div>
                        {cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View PDF
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

