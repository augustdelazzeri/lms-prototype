// Settings: Locations Management - Sites and Departments
"use client";

import React, { useState, useEffect } from "react";
import { Building2, MapPin, Plus, Pencil, Trash2, X, Check, ChevronRight } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import {
  getSites,
  getDepartments,
  createSite,
  updateSite,
  deleteSite,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  subscribe,
} from "@/lib/store-guard-1302";
import { Site, Department } from "@/types";

export default function LocationsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  
  // Modal states
  const [isAddingSite, setIsAddingSite] = useState(false);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  
  // Form states
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteRegion, setNewSiteRegion] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    const loadData = () => {
      setSites(getSites());
      setDepartments(getDepartments());
    };
    
    loadData();
    const unsubscribe = subscribe(loadData);
    return unsubscribe;
  }, []);

  // Auto-select first site if none selected
  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const filteredDepartments = selectedSiteId
    ? departments.filter(d => d.siteId === selectedSiteId)
    : [];

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  // Site handlers
  const handleAddSite = () => {
    if (!newSiteName.trim()) return;
    
    const site = createSite(newSiteName.trim(), newSiteRegion.trim() || undefined);
    setNewSiteName("");
    setNewSiteRegion("");
    setIsAddingSite(false);
    setSelectedSiteId(site.id);
    setToast({ message: `Site "${site.name}" created`, type: "success" });
  };

  const handleUpdateSite = () => {
    if (!editingSite || !newSiteName.trim()) return;
    
    updateSite(editingSite.id, newSiteName.trim(), newSiteRegion.trim() || undefined);
    setEditingSite(null);
    setNewSiteName("");
    setNewSiteRegion("");
    setToast({ message: "Site updated", type: "success" });
  };

  const handleDeleteSite = (site: Site) => {
    const result = deleteSite(site.id);
    if (result.success) {
      if (selectedSiteId === site.id) {
        setSelectedSiteId(sites.find(s => s.id !== site.id)?.id || null);
      }
      setToast({ message: `Site "${site.name}" deleted`, type: "success" });
    } else {
      setToast({ message: result.error || "Failed to delete site", type: "error" });
    }
  };

  // Department handlers
  const handleAddDepartment = () => {
    if (!newDepartmentName.trim() || !selectedSiteId) return;
    
    const dept = createDepartment(newDepartmentName.trim(), selectedSiteId);
    setNewDepartmentName("");
    setIsAddingDepartment(false);
    setToast({ message: `Department "${dept.name}" created`, type: "success" });
  };

  const handleUpdateDepartment = () => {
    if (!editingDepartment || !newDepartmentName.trim()) return;
    
    updateDepartment(editingDepartment.id, newDepartmentName.trim());
    setEditingDepartment(null);
    setNewDepartmentName("");
    setToast({ message: "Department updated", type: "success" });
  };

  const handleDeleteDepartment = (dept: Department) => {
    const result = deleteDepartment(dept.id);
    if (result.success) {
      setToast({ message: `Department "${dept.name}" deleted`, type: "success" });
    } else {
      setToast({ message: result.error || "Failed to delete department", type: "error" });
    }
  };

  const startEditSite = (site: Site) => {
    setEditingSite(site);
    setNewSiteName(site.name);
    setNewSiteRegion(site.region || "");
    setIsAddingSite(false);
  };

  const startEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setNewDepartmentName(dept.name);
    setIsAddingDepartment(false);
  };

  const cancelSiteEdit = () => {
    setEditingSite(null);
    setIsAddingSite(false);
    setNewSiteName("");
    setNewSiteRegion("");
  };

  const cancelDepartmentEdit = () => {
    setEditingDepartment(null);
    setIsAddingDepartment(false);
    setNewDepartmentName("");
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
            <p className="text-gray-500 mt-1">Manage your organization&apos;s sites and departments</p>
          </div>

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sites Panel */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-900">Sites</h2>
                    <span className="text-sm text-gray-500">({sites.length})</span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => { setIsAddingSite(true); setEditingSite(null); setNewSiteName(""); }}
                    className="text-sm py-1.5 px-3"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Site
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {/* Add Site Form */}
                {isAddingSite && (
                  <div className="px-5 py-3 bg-blue-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        placeholder="Site name..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                      />
                      <input
                        type="text"
                        value={newSiteRegion}
                        onChange={(e) => setNewSiteRegion(e.target.value)}
                        placeholder="Region..."
                        className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                      />
                      <button
                        onClick={handleAddSite}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelSiteEdit}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sites List */}
                {sites.length === 0 && !isAddingSite ? (
                  <div className="px-5 py-8 text-center text-gray-500">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No sites yet. Add your first site to get started.</p>
                  </div>
                ) : (
                  sites.map((site) => (
                    <div
                      key={site.id}
                      className={`group px-5 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedSiteId === site.id
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : "hover:bg-gray-50 border-l-4 border-transparent"
                      }`}
                      onClick={() => setSelectedSiteId(site.id)}
                    >
                      {editingSite?.id === site.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={newSiteName}
                            onChange={(e) => setNewSiteName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateSite()}
                          />
                          <input
                            type="text"
                            value={newSiteRegion}
                            onChange={(e) => setNewSiteRegion(e.target.value)}
                            placeholder="Region..."
                            className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateSite()}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateSite(); }}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelSiteEdit(); }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">
                              {site.name}
                              {site.region && (
                                <span className="font-normal text-gray-500 ml-1">({site.region})</span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500">
                              {departments.filter(d => d.siteId === site.id).length} dept(s)
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditSite(site); }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSite(site); }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Departments Panel */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-900">
                      Departments
                      {selectedSite && (
                        <span className="font-normal text-gray-500 ml-1">
                          ({selectedSite.name}{selectedSite.region && ` - ${selectedSite.region}`})
                        </span>
                      )}
                    </h2>
                    <span className="text-sm text-gray-500">({filteredDepartments.length})</span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => { setIsAddingDepartment(true); setEditingDepartment(null); setNewDepartmentName(""); }}
                    disabled={!selectedSiteId}
                    className="text-sm py-1.5 px-3"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Department
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {/* Add Department Form */}
                {isAddingDepartment && selectedSiteId && (
                  <div className="px-5 py-3 bg-blue-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        placeholder="Department name..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
                      />
                      <button
                        onClick={handleAddDepartment}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelDepartmentEdit}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Departments List */}
                {!selectedSiteId ? (
                  <div className="px-5 py-8 text-center text-gray-500">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Select a site to view its departments</p>
                  </div>
                ) : filteredDepartments.length === 0 && !isAddingDepartment ? (
                  <div className="px-5 py-8 text-center text-gray-500">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No departments in this site. Add one to get started.</p>
                  </div>
                ) : (
                  filteredDepartments.map((dept) => (
                    <div
                      key={dept.id}
                      className="group px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      {editingDepartment?.id === dept.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={newDepartmentName}
                            onChange={(e) => setNewDepartmentName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleUpdateDepartment()}
                          />
                          <button
                            onClick={handleUpdateDepartment}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelDepartmentEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-gray-900">{dept.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditDepartment(dept)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(dept)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-blue-900 mb-1">About Locations</h3>
            <p className="text-sm text-blue-700">
              Sites represent physical locations (e.g., Plant A, Plant B). Departments are organizational 
              units within each site (e.g., Warehouse, Packaging, Maintenance). Users are assigned to 
              a site and department, and managers can view data for their assigned locations.
            </p>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AdminLayout>
    </RouteGuard>
  );
}
