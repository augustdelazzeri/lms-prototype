// Phase I Epic 1 + User Management: Users page with CRUD
// ✅ Acceptance: Displays all seed users with roles, sites, departments
// ✅ Scope Filtering: Users filtered by selected scope
// ✅ User Management: Create, edit, deactivate/reactivate users
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import NewUserModal from "@/components/users/NewUserModal";
import UserImportModal from "@/components/users/UserImportModal";
import Toast from "@/components/Toast";
import ComplianceBadge from "@/components/ComplianceBadge";
import { getSites, getDepartments, getUsers, deactivateUser, reactivateUser, subscribe } from "@/lib/store-guard-1302";
import { useScope } from "@/hooks/useScope";
import { User, getFullName } from "@/types";
import { Upload, ExternalLink } from "lucide-react";

export default function UsersPage() {
  const { scope } = useScope();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  const sites = getSites();
  const departments = getDepartments();

  useEffect(() => {
    const updateData = () => {
      // Get users based on show deactivated toggle
      const users = getUsers(!showDeactivated); // true = include inactive
      setAllUsers(users);
    };
    
    updateData();
    const unsubscribe = subscribe(updateData);
    return unsubscribe;
  }, [showDeactivated]);

  // Filter by scope
  const filteredUsers = allUsers.filter(user => {
    // Admin always visible
    if (user.role === "ADMIN") return true;
    
    // Filter by scope
    if (scope.siteId !== "ALL" && user.siteId !== scope.siteId) return false;
    if (scope.deptId !== "ALL" && user.departmentId !== scope.deptId) return false;
    
    return true;
  });

  const getSiteName = (siteId?: string) => {
    if (!siteId) return "—";
    const site = sites.find(s => s.id === siteId);
    if (!site) return "—";
    return site.region ? `${site.name} (${site.region})` : site.name;
  };

  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return "—";
    return departments.find(d => d.id === deptId)?.name || "—";
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return "—";
    const manager = allUsers.find(u => u.id === managerId);
    return manager ? getFullName(manager) : "—";
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "error";
      case "MANAGER":
        return "warning";
      case "LEARNER":
        return "info";
      default:
        return "default";
    }
  };

  const handleNewUser = () => {
    setEditUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setIsModalOpen(true);
  };

  const handleDeactivateUser = (user: User) => {
    if (confirm(`Are you sure you want to deactivate ${getFullName(user)}? They will be removed from assignments and reports.`)) {
      try {
        deactivateUser(user.id);
        setToast({ message: "User deactivated successfully", type: "success" });
      } catch (err: any) {
        setToast({ message: err.message || "Failed to deactivate user", type: "error" });
      }
    }
  };

  const handleReactivateUser = (user: User) => {
    if (confirm(`Are you sure you want to reactivate ${getFullName(user)}?`)) {
      try {
        reactivateUser(user.id);
        setToast({ message: "User reactivated successfully", type: "success" });
      } catch (err: any) {
        setToast({ message: err.message || "Failed to reactivate user", type: "error" });
      }
    }
  };

  return (
    <RouteGuard>
      <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-500 mt-1">Manage employee accounts, roles, and department assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Button variant="primary" onClick={handleNewUser}>
              New User
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showDeactivated"
            checked={showDeactivated}
            onChange={(e) => setShowDeactivated(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showDeactivated" className="text-sm text-gray-700">
            Show deactivated users
          </label>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <ComplianceBadge userId={user.id} size="sm" />
                        <Link 
                          href={`/GUARD-1302/admin/users/${user.id}`}
                          className="text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 group"
                        >
                          {getFullName(user)}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.jobTitleText || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getSiteName(user.siteId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDepartmentName(user.departmentId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role === "LEARNER" ? getManagerName(user.managerId) : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={user.active ? "success" : "default"}>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleEditUser(user)}
                          className="text-sm"
                        >
                          Edit
                        </Button>
                        {user.active ? (
                          <Button
                            variant="secondary"
                            onClick={() => handleDeactivateUser(user)}
                            className="text-sm text-orange-600 hover:text-orange-700"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => handleReactivateUser(user)}
                            className="text-sm text-green-600 hover:text-green-700"
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                      No users found. {!showDeactivated && "Try enabling 'Show deactivated users'."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      </AdminLayout>

      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditUser(null);
        }}
        editUser={editUser}
      />

      <UserImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          setToast({ message: "Users imported successfully", type: "success" });
        }}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </RouteGuard>
  );
}

