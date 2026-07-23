// Phase I Epic 3: Reminder Rules management page
/**
 * ACCEPTANCE CHECKLIST (Epic 3):
 * ✓ Admin can view list of reminder rules with Name, Trigger, Offset, and Active status
 * ✓ Toggle Active ON/OFF
 * ✓ "Add Rule" button opens modal for creating new rule
 * ✓ "Test Preview" button shows mock message for rule
 * ✓ Edit and delete functionality for rules
 * ✓ Manager can view but not modify rules
 */
"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import ReminderRuleModal from "@/components/ReminderRuleModal";
import { 
  getReminderRules, 
  createReminderRule, 
  updateReminderRule, 
  deleteReminderRule,
  getCurrentUser,
  subscribe 
} from "@/lib/store-guard-1302";
import { ReminderRule } from "@/types";

export default function NotificationSettingsPage() {
  const [rules, setRules] = useState(getReminderRules());
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setRules(getReminderRules());
      setCurrentUser(getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const handleAddRule = () => {
    setEditingRule(undefined);
    setIsModalOpen(true);
  };

  const handleEditRule = (rule: ReminderRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleSaveRule = (rule: ReminderRule) => {
    if (editingRule) {
      updateReminderRule(rule.id, rule);
    } else {
      createReminderRule(rule);
    }
  };

  const handleToggleActive = (rule: ReminderRule) => {
    updateReminderRule(rule.id, { active: !rule.active });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm("Are you sure you want to delete this reminder rule?")) {
      deleteReminderRule(ruleId);
    }
  };

  const isAdmin = currentUser.role === "ADMIN";

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Reminder Rules</h1>
            {isAdmin && (
              <Button variant="primary" onClick={handleAddRule}>
                + Add Rule
              </Button>
            )}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trigger
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Offset Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Escalation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={rule.trigger === "upcoming" ? "default" : rule.trigger === "overdue" ? "warning" : "info"}
                        >
                          {rule.trigger}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule.offsetDays > 0 ? `+${rule.offsetDays}` : rule.offsetDays} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule.escalationAfterDays ? `After ${rule.escalationAfterDays} days` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => isAdmin && handleToggleActive(rule)}
                          disabled={!isAdmin}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            rule.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          } ${isAdmin ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}`}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-sm text-gray-500">
                        No reminder rules configured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">About Reminder Rules</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Upcoming:</strong> Triggers before the due date (use negative offset)</li>
              <li><strong>Overdue:</strong> Triggers after the due date (use positive offset)</li>
              <li><strong>Escalation:</strong> Notifies managers when trainings are severely overdue</li>
              <li>All notifications are in-memory only (no actual emails sent)</li>
            </ul>
          </div>
        </div>

        <ReminderRuleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveRule}
          existingRule={editingRule}
        />
      </AdminLayout>
    </RouteGuard>
  );
}

