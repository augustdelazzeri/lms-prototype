"use client";

import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Button from "@/components/Button";
import Card from "@/components/Card";
import UploadModal from "@/components/library/UploadModal";
import AddLibraryItemModal from "@/components/library/AddLibraryItemModal";
import PreviewDrawer from "@/components/library/PreviewDrawer";
import {
  getLibraryItems,
  archiveLibraryItem,
  deleteLibraryItem,
  createNewVersion,
  getCurrentUser,
  subscribe,
  type LibraryFilters as LibraryFiltersType,
} from "@/lib/store-guard-1302";
import { LibraryItem } from "@/types";
import {
  Upload,
  Link as LinkIcon,
  Eye,
  Archive,
  Trash2,
  Copy,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Sparkles,
  Plus,
} from "lucide-react";

export default function LibraryPage() {
  const [allItems, setAllItems] = useState<LibraryItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTagInput, setBatchTagInput] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"" | "file" | "link">("");
  const [filterSourceType, setFilterSourceType] = useState<"" | "policy" | "sop" | "manual" | "regulation" | "text">("");
  const [filterTag, setFilterTag] = useState("");
  const [filterAI, setFilterAI] = useState<"" | "true" | "false">("");

  const currentUser = getCurrentUser();
  const isAdmin = currentUser.role === "ADMIN";

  useEffect(() => {
    const load = () => {
      const filters: LibraryFiltersType = {};
      if (filterType) filters.type = filterType;
      if (filterSourceType) filters.sourceType = filterSourceType;
      if (filterTag) filters.tags = [filterTag];
      if (filterAI !== "") filters.allowedForSynthesis = filterAI === "true";
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      setAllItems(getLibraryItems(filters));
    };
    load();
    const unsubscribe = subscribe(load);
    return unsubscribe;
  }, [searchQuery, filterType, filterSourceType, filterTag, filterAI]);

  const totalCount = useMemo(() => getLibraryItems({}).length, [allItems]);

  const allTags = useMemo(() => {
    const all = getLibraryItems({});
    return Array.from(new Set(all.flatMap((i) => i.tags))).sort();
  }, [allItems]);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [openMenuId]);

  const hasActiveFilters = searchQuery || filterType || filterSourceType || filterTag || filterAI;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("");
    setFilterSourceType("");
    setFilterTag("");
    setFilterAI("");
  };

  const handlePreview = (item: LibraryItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  const handleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to archive this item?")) {
      archiveLibraryItem(id);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      deleteLibraryItem(id);
    }
  };

  const handleNewVersion = (item: LibraryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Create a new version of this item?")) {
      createNewVersion(item.id, {});
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === allItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map((i) => i.id)));
    }
  };

  const handleBatchArchive = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Archive ${selectedIds.size} selected item(s)?`)) {
      selectedIds.forEach((id) => {
        try { archiveLibraryItem(id); } catch { /* skip */ }
      });
      setSelectedIds(new Set());
    }
  };

  const getFileIcon = (item: LibraryItem) => {
    if (item.type === "link") return <LinkIcon className="w-4 h-4 text-gray-400" />;
    switch (item.fileType) {
      case "pdf": return <FileText className="w-4 h-4 text-red-400" />;
      case "image": return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case "video": return <Video className="w-4 h-4 text-purple-400" />;
      default: return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getSourceTypeLabel = (st?: string) => {
    if (!st) return "—";
    const map: Record<string, string> = { policy: "Policy", sop: "SOP", manual: "Manual", regulation: "Regulation", text: "Text" };
    return map[st] ?? st;
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Library</h1>
              <p className="text-gray-500 mt-1">Manage training materials and resources</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Bulk Upload
              </Button>
              <Button variant="primary" onClick={() => setIsAddItemModalOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add to Library
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, description, or tags..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "" | "file" | "link")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Types</option>
                  <option value="file">Files</option>
                  <option value="link">Links</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select
                  value={filterSourceType}
                  onChange={(e) => setFilterSourceType(e.target.value as any)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Source Types</option>
                  <option value="policy">Policy</option>
                  <option value="sop">SOP</option>
                  <option value="manual">Manual</option>
                  <option value="regulation">Regulation</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Synthesis</label>
                <select
                  value={filterAI}
                  onChange={(e) => setFilterAI(e.target.value as "" | "true" | "false")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All</option>
                  <option value="true">AI Enabled</option>
                  <option value="false">AI Disabled</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>Showing {allItems.length} of {totalCount} items</span>
                <button onClick={clearFilters} className="text-primary hover:underline">
                  Clear filters
                </button>
              </div>
            )}
          </Card>

          {/* Batch Actions */}
          {selectedIds.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={batchTagInput}
                    onChange={(e) => setBatchTagInput(e.target.value)}
                    placeholder="Add tag..."
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    onKeyDown={(e) => e.key === "Enter" && batchTagInput.trim() && alert(`Tag "${batchTagInput.trim()}" will be added to ${selectedIds.size} item(s).`)}
                  />
                  <Button variant="secondary" onClick={handleBatchArchive} className="text-sm">
                    <Archive className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-900">
                Clear Selection
              </button>
            </div>
          )}

          {/* Table */}
          {totalCount === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading files or adding links to your library.</p>
                <div className="mt-6 flex gap-3 justify-center">
                  <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <Button variant="primary" onClick={() => setIsAddItemModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Library
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
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === allItems.length && allItems.length > 0}
                          onChange={selectAll}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                          No items match your filters.
                        </td>
                      </tr>
                    ) : (
                      allItems.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handlePreview(item)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => toggleSelection(item.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {getFileIcon(item)}
                              <span className="hover:text-blue-600 transition-colors">{item.title}</span>
                              {item.allowedForSynthesis && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-500 text-[10px] font-medium rounded flex-shrink-0">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  AI
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {item.type === "file" ? (item.fileType ?? "File") : (item.source ?? "Link")}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {getSourceTypeLabel(item.sourceType)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    {tag}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(item.updatedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === item.id ? null : item.id);
                                }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {openMenuId === item.id && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handlePreview(item);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Preview
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      setOpenMenuId(null);
                                      handleNewVersion(item, e);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    New Version
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      setOpenMenuId(null);
                                      handleArchive(item.id, e);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    Archive
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        setOpenMenuId(null);
                                        handleDelete(item.id, e);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onComplete={() => {}}
        />

        <AddLibraryItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          onComplete={() => {}}
        />

        <PreviewDrawer
          item={previewItem}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewItem(null);
          }}
          onUpdate={() => {}}
        />
      </AdminLayout>
    </RouteGuard>
  );
}
