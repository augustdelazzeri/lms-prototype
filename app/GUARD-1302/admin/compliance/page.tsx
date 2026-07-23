/**
 * PHASE I POLISH PACK ACCEPTANCE CHECKLIST:
 * ✓ CSV Import with dry-run preview
 * ✓ Bulk selection and actions (Edit Due Date, Mark Exempt, Add Note)
 * ✓ Create Audit Snapshot button
 * ✓ View Change History for each completion
 * ✓ EXEMPT status badge with tooltip
 * ✓ All existing Epic 2 & 3 functionality preserved
 * ✓ UI Refresh v2: lucide icons, no emojis
 * ✓ Scope Filtering: Completions filtered by selected scope
 */
"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, Paperclip, FileText, Camera, Bell, Upload, Download, Sparkles, Settings, Mail, Plus, AlertCircle, Shield } from "lucide-react";
import UserSkillsPanel from "@/components/admin/skills/UserSkillsPanel";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import CompletionModal from "@/components/CompletionModal";
import Toast from "@/components/Toast";
import CSVImportModal from "@/components/CSVImportModal";
import HistoricImportModal from "@/components/HistoricImportModal";
import ExemptionModal from "@/components/ExemptionModal";
import BulkActionModal from "@/components/BulkActionModal";
import ChangeHistoryDrawer from "@/components/ChangeHistoryDrawer";
import ManualTrainingImportModal from "@/components/ManualTrainingImportModal";
import NotificationComposeModal from "@/components/NotificationComposeModal";
import DropdownMenu from "@/components/DropdownMenu";
import {
  getSites,
  getDepartments,
  getTrainingById,
  getCurrentUser,
  getReminderRules,
  createAuditSnapshot,
  getUser as getUserById,
  subscribe,
  getCourseById,
  getSuspendedUserSkillRecords,
} from "@/lib/store-guard-1302";
import { TrainingCompletion, CompletionStatus, getFullName } from "@/types";
import { formatDate } from "@/lib/utils";
import { runReminderEvaluation } from "@/lib/reminders";
import { useScope } from "@/hooks/useScope";
import { getScopedData } from "@/lib/stats";

function CompliancePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scope } = useScope();
  const activeTab = searchParams.get("tab") || "completions";
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [selectedCompletion, setSelectedCompletion] = useState<TrainingCompletion | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSite, setFilterSite] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("");
  const [filterTraining, setFilterTraining] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<CompletionStatus | "">("");

  // Polish Pack: New modals and states
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isHistoricImportOpen, setIsHistoricImportOpen] = useState(false);
  const [isManualImportOpen, setIsManualImportOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isExemptionModalOpen, setIsExemptionModalOpen] = useState(false);
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"edit_due_date" | "add_note">("edit_due_date");
  const [selectedCompletions, setSelectedCompletions] = useState<Set<string>>(new Set());
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyCompletionId, setHistoryCompletionId] = useState<string>("");
  const [trainings, setTrainings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const sites = getSites();
  const departments = getDepartments();

  useEffect(() => {
    const updateData = () => {
      const { completions: newCompletions, trainings: newTrainings, users: newUsers } = getScopedData(scope);
      setCompletions(newCompletions);
      setTrainings(newTrainings);
      setUsers(newUsers);
      setCurrentUser(getCurrentUser());
    };
    
    updateData();
    const unsubscribe = subscribe(updateData);
    return unsubscribe;
  }, [scope]);

  const getUser = (userId: string) => users.find((u: any) => u.id === userId);
  const getTraining = (trainingId: string) => trainings.find((t: any) => t.id === trainingId);
  const getSite = (siteId?: string) => (siteId ? sites.find((s) => s.id === siteId) : undefined);
  const getDepartment = (deptId?: string) => (deptId ? departments.find((d) => d.id === deptId) : undefined);

  const canModifyCompletion = (completion: TrainingCompletion): boolean => {
    if (currentUser.role === "ADMIN") return true;
    if (currentUser.role === "LEARNER") return false;

    // Manager: check if user is in their scope
    if (currentUser.role === "MANAGER") {
      const user = getUser(completion.userId);
      return user?.siteId === currentUser.siteId;
    }

    return false;
  };

  const handleMarkComplete = (completion: TrainingCompletion) => {
    if (!canModifyCompletion(completion)) {
      alert("You don't have permission to modify this completion.");
      return;
    }
    setSelectedCompletion(completion);
    setIsCompletionModalOpen(true);
  };

  const handleModalSave = () => {
    const { completions: newCompletions, trainings: newTrainings, users: newUsers } = getScopedData(scope);
    setCompletions(newCompletions);
    setTrainings(newTrainings);
    setUsers(newUsers);
  };

  const handleRunReminders = () => {
    const rules = getReminderRules();
    const activeRules = rules.filter((r) => r.active);

    if (activeRules.length === 0) {
      setToastMessage("No active reminder rules found. Please enable rules in Settings → Reminders.");
      setToastType("info");
      return;
    }

    const result = runReminderEvaluation(rules, completions);
    const overdueCount = completions.filter((c) => c.status === "OVERDUE").length;

    setToastMessage(
      `Simulation complete — ${result.notifications.length} notification${result.notifications.length !== 1 ? "s" : ""} generated, ${result.escalations.length} escalation${result.escalations.length !== 1 ? "s" : ""}.`
    );
    setToastType("success");

    // Micro-delight: Show confetti message if no overdue cases
    if (overdueCount === 0) {
      setTimeout(() => {
        setToastMessage("🎉 Congratulations! No overdue trainings found.");
        setToastType("success");
      }, 2000);
    }
  };

  const handleExportCSV = () => {
    const filtered = getFilteredCompletions();
    const csvContent = [
      ["Training", "Employee", "Site", "Department", "Status", "Due Date", "Completed Date", "Overdue Days", "Notes"],
      ...filtered.map((c) => {
        const training = getTraining(c.trainingId);
        const user = getUser(c.userId);
        const site = getSite(user?.siteId);
        const dept = getDepartment(user?.departmentId);

        return [
          training?.title || "",
          user ? getFullName(user) : "",
          site ? (site.region ? `${site.name} (${site.region})` : site.name) : "",
          dept?.name || "",
          c.status,
          formatDate(c.dueAt),
          c.completedAt ? formatDate(c.completedAt) : "",
          c.overdueDays?.toString() || "0",
          c.notes || "",
        ];
      }),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compliance-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateSnapshot = () => {
    const filtered = getFilteredCompletions();
    const filtersSummary = [
      searchQuery && `Search: "${searchQuery}"`,
      filterSite && `Site: ${(() => { const s = sites.find((s) => s.id === filterSite); return s ? (s.region ? `${s.name} (${s.region})` : s.name) : filterSite; })()}`,
      filterDepartment && `Department: ${departments.find((d) => d.id === filterDepartment)?.name}`,
      filterTraining && `Training: ${trainings.find((t) => t.id === filterTraining)?.title}`,
      filterStatus && `Status: ${filterStatus}`,
    ]
      .filter(Boolean)
      .join(", ") || "No filters applied";

    const snapshot = createAuditSnapshot(
      {
        site: filterSite || undefined,
        department: filterDepartment || undefined,
        training: filterTraining || undefined,
        status: filterStatus || undefined,
        search: searchQuery || undefined,
      },
      filtersSummary,
      filtered,
      currentUser.id
    );

    // Navigate to audits page with success toast
    setToastMessage(`Audit snapshot created: ${snapshot.id}`);
    setToastType("success");
    
    // Navigate immediately
    router.push("/GUARD-1302/admin/reports/audits");
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filtered = getFilteredCompletions();
      setSelectedCompletions(new Set(filtered.filter(canModifyCompletion).map((c) => c.id)));
    } else {
      setSelectedCompletions(new Set());
    }
  };

  const handleSelectOne = (completionId: string, checked: boolean) => {
    const newSet = new Set(selectedCompletions);
    if (checked) {
      newSet.add(completionId);
    } else {
      newSet.delete(completionId);
    }
    setSelectedCompletions(newSet);
  };

  const handleBulkExempt = () => {
    const selected = Array.from(selectedCompletions)
      .map((id) => completions.find((c) => c.id === id))
      .filter((c) => c !== undefined) as TrainingCompletion[];

    if (selected.length === 0) {
      alert("No completions selected.");
      return;
    }

    setIsExemptionModalOpen(true);
  };

  const handleBulkAction = (type: "edit_due_date" | "add_note") => {
    const selected = Array.from(selectedCompletions)
      .map((id) => completions.find((c) => c.id === id))
      .filter((c) => c !== undefined) as TrainingCompletion[];

    if (selected.length === 0) {
      alert("No completions selected.");
      return;
    }

    setBulkActionType(type);
    setIsBulkActionModalOpen(true);
  };

  const handleBulkComplete = () => {
    setSelectedCompletions(new Set());
  };

  const handleViewHistory = (completionId: string) => {
    setHistoryCompletionId(completionId);
    setHistoryDrawerOpen(true);
  };

  const getFilteredCompletions = (): TrainingCompletion[] => {
    return completions.filter((completion) => {
      const training = getTraining(completion.trainingId);
      const user = getUser(completion.userId);
      
      // If user doesn't exist, filter out
      if (!user) return false;
      
      // Get training title from training or fallback to course
      let trainingTitle = training?.title;
      if (!trainingTitle && completion.courseId) {
        const course = getCourseById(completion.courseId);
        trainingTitle = course?.title;
      }
      
      // If we can't find a title (no training AND no course), filter out
      if (!trainingTitle) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesUser = getFullName(user).toLowerCase().includes(query);
        const matchesTraining = trainingTitle.toLowerCase().includes(query);
        if (!matchesUser && !matchesTraining) return false;
      }

      // Site filter
      if (filterSite && user.siteId !== filterSite) return false;

      // Department filter
      if (filterDepartment && user.departmentId !== filterDepartment) return false;

      // Training filter
      if (filterTraining && completion.trainingId !== filterTraining) return false;

      // Status filter
      if (filterStatus && completion.status !== filterStatus) return false;

      return true;
    });
  };

  const getStatusBadge = (completion: TrainingCompletion) => {
    const status = completion.status;
    
    if (status === "EXEMPT" && completion.exemptionReason && completion.exemptionAttestedBy) {
      const attestedBy = getUserById(completion.exemptionAttestedBy);
      const attestedByName = attestedBy ? getFullName(attestedBy) : "Unknown";
      const tooltipText = `Exempt: ${completion.exemptionReason}. Attested by ${attestedByName} on ${formatDate(completion.exemptionAttestedAt || "")}`;
      return (
        <Badge variant="exempt" title={tooltipText}>
          Exempt
        </Badge>
      );
    }

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

  const filteredCompletions = getFilteredCompletions();
  const selectedCount = selectedCompletions.size;
  const selectedItems = Array.from(selectedCompletions)
    .map((id) => completions.find((c) => c.id === id))
    .filter((c) => c !== undefined) as TrainingCompletion[];

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compliance</h1>
              <p className="text-gray-500 mt-1">Track and manage training completion status for all employees</p>
            </div>
            {activeTab === "completions" && <div className="flex gap-2">
              {/* Primary CTA: Add Training Record */}
              <Button variant="primary" onClick={() => setIsManualImportOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Training Record
              </Button>

              {/* Import Dropdown */}
              <DropdownMenu
                label="Import"
                icon={<Upload className="w-4 h-4" />}
                variant="secondary"
                items={[
                  {
                    label: "Bulk Assign Trainings",
                    icon: <Upload className="w-4 h-4" />,
                    onClick: () => setIsCSVImportOpen(true),
                  },
                  {
                    label: "Bulk Import History",
                    icon: <FileText className="w-4 h-4" />,
                    onClick: () => setIsHistoricImportOpen(true),
                  },
                ]}
              />

              {/* Reminders Dropdown */}
              {currentUser.role === "ADMIN" && (
                <DropdownMenu
                  label="Reminders"
                  icon={<Bell className="w-4 h-4" />}
                  items={[
                    {
                      label: "Run Reminders Now",
                      icon: <Bell className="w-4 h-4" />,
                      onClick: handleRunReminders,
                    },
                    {
                      label: "Suggest Reminder",
                      icon: <Sparkles className="w-4 h-4" />,
                      onClick: () => setIsComposeModalOpen(true),
                    },
                    {
                      label: "Configure Rules",
                      icon: <Settings className="w-4 h-4" />,
                      onClick: () => router.push("/GUARD-1302/admin/settings/notifications"),
                    },
                    {
                      label: "Notification History",
                      icon: <Mail className="w-4 h-4" />,
                      onClick: () => router.push("/GUARD-1302/admin/notifications"),
                    },
                  ]}
                />
              )}

              {/* More Actions Dropdown */}
              <DropdownMenu
                variant="more"
                items={[
                  {
                    label: "Create Snapshot",
                    icon: <Camera className="w-4 h-4" />,
                    onClick: handleCreateSnapshot,
                  },
                  {
                    label: "Print",
                    icon: <Printer className="w-4 h-4" />,
                    onClick: () => window.print(),
                  },
                  {
                    label: "Export CSV",
                    icon: <Download className="w-4 h-4" />,
                    onClick: handleExportCSV,
                  },
                ]}
              />
            </div>}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            <button
              onClick={() => router.push("/GUARD-1302/admin/compliance?tab=completions")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "completions"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Training Completions
            </button>
            <button
              onClick={() => router.push("/GUARD-1302/admin/compliance?tab=skills")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "skills"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Shield className="w-4 h-4" />
              Skill Records
              {(() => {
                const count = getSuspendedUserSkillRecords().length;
                if (count === 0) return null;
                return (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                    {count}
                  </span>
                );
              })()}
            </button>
          </div>

          {activeTab === "skills" ? (
            <UserSkillsPanel initialFilter={(searchParams.get("filter") || "") as import("@/components/admin/skills/UserSkillsPanel").SkillsPanelFilter} />
          ) : (
          <>

          {/* Bulk Action Toolbar */}
          {selectedCount > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleBulkAction("edit_due_date")}>
                  Edit Due Date
                </Button>
                <Button variant="secondary" onClick={handleBulkExempt}>
                  Mark Exempt
                </Button>
                <Button variant="secondary" onClick={() => handleBulkAction("add_note")}>
                  Add Note
                </Button>
                <Button variant="secondary" onClick={() => setSelectedCompletions(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Employee or training..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="filterSite" className="block text-sm font-medium text-gray-700 mb-1">
                  Site
                </label>
                <select
                  id="filterSite"
                  value={filterSite}
                  onChange={(e) => setFilterSite(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Sites</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}{site.region && ` (${site.region})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filterDepartment" className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  id="filterDepartment"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filterTraining" className="block text-sm font-medium text-gray-700 mb-1">
                  Training
                </label>
                <select
                  id="filterTraining"
                  value={filterTraining}
                  onChange={(e) => setFilterTraining(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Trainings</option>
                  {trainings.map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as CompletionStatus | "")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="EXEMPT">Exempt</option>
                </select>
              </div>
            </div>

            {(searchQuery || filterSite || filterDepartment || filterTraining || filterStatus) && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredCompletions.length} of {completions.length} completions
                </span>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterSite("");
                    setFilterDepartment("");
                    setFilterTraining("");
                    setFilterStatus("");
                  }}
                  className="text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={selectedCount > 0 && selectedCount === filteredCompletions.filter(canModifyCompletion).length}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    </th>
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompletions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                        No completions found.
                      </td>
                    </tr>
                  ) : (
                    filteredCompletions.map((completion) => {
                      const training = getTraining(completion.trainingId);
                      const user = getUser(completion.userId);
                      const site = getSite(user?.siteId);
                      const dept = getDepartment(user?.departmentId);
                      const canModify = canModifyCompletion(completion);
                      const isSelected = selectedCompletions.has(completion.id);
                      
                      // Get display title from training or fallback to course
                      const course = completion.courseId ? getCourseById(completion.courseId) : null;
                      const displayTitle = training?.title || course?.title || "Unknown Training";
                      const displayCourseId = training?.courseId || completion.courseId;
                      const isLMSCourse = training?.policy === 'LMS-COURSE' || !!displayCourseId;

                      return (
                        <tr key={completion.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {canModify && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleSelectOne(completion.id, e.target.checked)}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {isLMSCourse && displayCourseId ? (
                                <a
                                  href={`/GUARD-1302/admin/courses/${displayCourseId}/edit`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  title={`Open course: ${displayTitle}`}
                                >
                                  {displayTitle}
                                </a>
                              ) : (
                                <span>{displayTitle}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{user ? <Link href={`/GUARD-1302/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{getFullName(user)}</Link> : "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{site ? (site.region ? `${site.name} (${site.region})` : site.name) : "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{dept?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm">{getStatusBadge(completion)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(completion.dueAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {completion.completedAt ? formatDate(completion.completedAt) : "—"}
                            {completion.proofUrl && (
                              <a
                                href={completion.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-primary hover:underline text-xs"
                              >
                                View Proof
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="flex justify-end gap-2 items-center">
                              {training?.policyUrl && (
                                <a
                                  href={training.policyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-[#2563EB] hover:underline"
                                  title="View policy document"
                                >
                                  <Paperclip className="w-4 h-4" />
                                </a>
                              )}
                              {completion.status !== "COMPLETED" && completion.status !== "EXEMPT" && (
                                <Button
                                  variant="primary"
                                  onClick={() => handleMarkComplete(completion)}
                                  className="text-xs"
                                  disabled={!canModify}
                                  title={!canModify ? "You don't have permission to modify this completion" : ""}
                                >
                                  Mark Complete
                                </Button>
                              )}
                              <button
                                onClick={() => handleViewHistory(completion.id)}
                                className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                title="View Change History"
                              >
                                <FileText className="w-3 h-3" />
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          </>
          )}

          {/* Modals */}
          <CompletionModal
            isOpen={isCompletionModalOpen}
            onClose={() => setIsCompletionModalOpen(false)}
            completion={selectedCompletion}
            trainingRetrainDays={selectedCompletion ? getTrainingById(selectedCompletion.trainingId)?.retrainIntervalDays : undefined}
            onSave={handleModalSave}
          />

          <CSVImportModal
            isOpen={isCSVImportOpen}
            onClose={() => setIsCSVImportOpen(false)}
            onImportComplete={handleModalSave}
          />

          <HistoricImportModal
            isOpen={isHistoricImportOpen}
            onClose={() => setIsHistoricImportOpen(false)}
            onImportComplete={(created, errors) => {
              handleModalSave();
              if (errors > 0) {
                setToastMessage(`Imported ${created} historic records. ${errors} rows had errors.`);
                setToastType("info");
              } else {
                setToastMessage(`Successfully imported ${created} historic completion records.`);
                setToastType("success");
              }
            }}
          />

          <NotificationComposeModal
            open={isComposeModalOpen}
            onClose={() => setIsComposeModalOpen(false)}
            filters={{
              site: filterSite,
              department: filterDepartment,
              training: filterTraining,
              status: filterStatus,
            }}
            initialTone="direct"
            initialSource="Compliance"
            defaultRecipientMode="learners"
          />

          <ExemptionModal
            isOpen={isExemptionModalOpen}
            onClose={() => setIsExemptionModalOpen(false)}
            completions={selectedItems}
            onComplete={handleBulkComplete}
          />

          <BulkActionModal
            isOpen={isBulkActionModalOpen}
            onClose={() => setIsBulkActionModalOpen(false)}
            actionType={bulkActionType}
            completions={selectedItems}
            onComplete={handleBulkComplete}
          />

          <ChangeHistoryDrawer
            isOpen={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            completionId={historyCompletionId}
          />

          <ManualTrainingImportModal
            isOpen={isManualImportOpen}
            onClose={() => setIsManualImportOpen(false)}
            onImportComplete={(created) => {
              setToastMessage(`Successfully created ${created} training record${created !== 1 ? "s" : ""}.`);
              setToastType("success");
            }}
          />

          {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

export default function CompliancePage() {
  return (
    <Suspense
      fallback={
        <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
          <AdminLayout>
            <div className="max-w-7xl mx-auto py-12 text-center text-gray-500">Loading...</div>
          </AdminLayout>
        </RouteGuard>
      }
    >
      <CompliancePageContent />
    </Suspense>
  );
}
