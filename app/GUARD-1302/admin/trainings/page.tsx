"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import TrainingModal from "@/components/TrainingModal";
import { getCompletionsByTrainingId, deleteTraining, subscribe } from "@/lib/store-guard-1302";
import { Training, TrainingCategory, TrainingStatus } from "@/types";
import { useScope } from "@/hooks/useScope";
import { getScopedData } from "@/lib/stats";

const TRAINING_CATEGORIES: TrainingCategory[] = ["Safety", "Compliance", "Onboarding", "Technical", "HR", "Other"];
const TRAINING_STATUSES: TrainingStatus[] = ["active", "draft", "archived"];

const CATEGORY_COLORS: Record<TrainingCategory, { bg: string; text: string }> = {
  Safety: { bg: "bg-red-100", text: "text-red-800" },
  Compliance: { bg: "bg-amber-100", text: "text-amber-800" },
  Onboarding: { bg: "bg-green-100", text: "text-green-800" },
  Technical: { bg: "bg-blue-100", text: "text-blue-800" },
  HR: { bg: "bg-purple-100", text: "text-purple-800" },
  Other: { bg: "bg-gray-100", text: "text-gray-800" },
};

export default function TrainingsPage() {
  const router = useRouter();
  const { scope } = useScope();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | undefined>();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | TrainingStatus>("");
  const [filterCategory, setFilterCategory] = useState<"" | TrainingCategory>("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const updateData = () => {
      const { trainings: scopedTrainings } = getScopedData(scope);
      setTrainings(scopedTrainings);
    };
    updateData();
    const unsubscribe = subscribe(updateData);
    return unsubscribe;
  }, [scope]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-tags-dropdown]")) {
        setIsTagsDropdownOpen(false);
      }
    };
    if (isTagsDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isTagsDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  const handleCreate = () => {
    setSelectedTraining(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (training: Training) => {
    setSelectedTraining(training);
    setIsModalOpen(true);
  };

  const handleDelete = (trainingId: string) => {
    if (confirm("Are you sure you want to delete this training? All associated completions will be removed.")) {
      deleteTraining(trainingId);
    }
  };

  const handleModalSave = () => {
    const { trainings: scopedTrainings } = getScopedData(scope);
    setTrainings(scopedTrainings);
  };

  const getCompletionStats = (trainingId: string) => {
    const completions = getCompletionsByTrainingId(trainingId);
    const assigned = completions.filter((c) => c.status === "ASSIGNED").length;
    const completed = completions.filter((c) => c.status === "COMPLETED").length;
    const overdue = completions.filter((c) => c.status === "OVERDUE").length;
    return { assigned, completed, overdue };
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    trainings.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [trainings]);

  const toggleTagFilter = (tag: string) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const hasActiveFilters = filterStatus || filterCategory || filterTags.length > 0 || searchQuery.trim();

  const clearFilters = () => {
    setFilterStatus("");
    setFilterCategory("");
    setFilterTags([]);
    setSearchQuery("");
  };

  const filteredTrainings = useMemo(() => {
    return trainings.filter((t) => {
      if (!filterStatus && t.status === "archived") return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterTags.length > 0) {
        const trainingTags = t.tags || [];
        if (!filterTags.every((tag) => trainingTags.includes(tag))) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesStandard = t.standardRef?.toLowerCase().includes(query);
        const matchesTags = t.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesStandard && !matchesTags) return false;
      }
      return true;
    });
  }, [trainings, searchQuery, filterStatus, filterCategory, filterTags]);

  const visibleTotal = trainings.filter((t) => filterStatus === "archived" || t.status !== "archived").length;

  const getStatusBadge = (status: TrainingStatus) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case "draft":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>;
      case "archived":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Archived</span>;
    }
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trainings</h1>
              <p className="text-gray-500 mt-1">Define training requirements and assign them to your workforce</p>
            </div>
            <Button variant="primary" onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Training
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, standard, or tags..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "" | TrainingStatus)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Statuses</option>
                  {TRAINING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as "" | TrainingCategory)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Categories</option>
                  {TRAINING_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="relative" data-tags-dropdown>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <button
                  type="button"
                  onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <span className={filterTags.length > 0 ? "text-gray-900" : "text-gray-500"}>
                    {filterTags.length > 0 ? `${filterTags.length} tag${filterTags.length > 1 ? "s" : ""} selected` : "All Tags"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTagsDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isTagsDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {allTags.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">No tags available</div>
                    ) : (
                      allTags.map((tag) => (
                        <label key={tag} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterTags.includes(tag)}
                            onChange={() => toggleTagFilter(tag)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{tag}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>Showing {filteredTrainings.length} of {visibleTotal} trainings</span>
                <button onClick={clearFilters} className="text-primary hover:underline">
                  Clear filters
                </button>
              </div>
            )}
          </Card>

          {/* Table */}
          {trainings.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <h3 className="text-sm font-semibold text-gray-900">No trainings yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first training program.</p>
                <div className="mt-6">
                  <Button variant="primary" onClick={handleCreate} className="inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create First Training
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrainings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          No trainings match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTrainings.map((training) => {
                        const stats = getCompletionStats(training.id);
                        const total = stats.assigned + stats.completed + stats.overdue;

                        return (
                          <tr
                            key={training.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/GUARD-1302/admin/trainings/${training.id}`)}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              <span className="hover:text-blue-600 transition-colors">{training.title}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {training.category ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[training.category].bg} ${CATEGORY_COLORS[training.category].text}`}>
                                  {training.category}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {training.tags && training.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {training.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      {tag}
                                    </span>
                                  ))}
                                  {training.tags.length > 3 && (
                                    <span className="text-xs text-gray-400">+{training.tags.length - 3}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {getStatusBadge(training.status)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {total > 0 ? (
                                <span>
                                  <span className="font-medium text-emerald-600">{stats.completed}</span>
                                  <span className="text-gray-400"> / </span>
                                  <span className="font-medium text-gray-700">{total}</span>
                                  {stats.overdue > 0 && (
                                    <span className="ml-1.5 text-xs text-orange-600 font-medium">({stats.overdue} overdue)</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="relative inline-block">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === training.id ? null : training.id);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {openMenuId === training.id && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        handleEdit(training);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        handleDelete(training.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                )}
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
          )}

          <TrainingModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            training={selectedTraining}
            onSave={handleModalSave}
          />
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
