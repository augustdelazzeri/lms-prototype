// Phase I AI Uplift - Unified: Notifications Archive with Sent/Received Tabs
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import NotificationComposeModal from "@/components/NotificationComposeModal";
import { 
  getNotifications, 
  getSentNotifications,
  getReceivedNotifications,
  getCurrentUser,
  getUser,
  clearAllNotifications,
  subscribe 
} from "@/lib/store-guard-1302";
import { Notification, getFullName } from "@/types";
import { formatDate } from "@/lib/utils";
import { useScope } from "@/hooks/useScope";
import { X, Eye, RefreshCw } from "lucide-react";

type TabType = "sent" | "received";

export default function NotificationsArchivePage() {
  const { scope } = useScope();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>("sent");
  const [filterSource, setFilterSource] = useState<"" | "Compliance" | "Coach">("");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [resendNotification, setResendNotification] = useState<Notification | null>(null);

  // Load notifications
  const [sentNotifications, setSentNotifications] = useState<Notification[]>([]);
  const [receivedNotifications, setReceivedNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const updateNotifications = () => {
      setCurrentUser(getCurrentUser());
      const user = getCurrentUser();
      
      // Sent: Admin sees all with senderId, Manager sees only their sent
      if (user.role === "ADMIN") {
        setSentNotifications(getNotifications().filter(n => n.senderId));
      } else {
        setSentNotifications(getSentNotifications(user.id));
      }
      
      // Received: notifications addressed to current user
      setReceivedNotifications(getReceivedNotifications(user.id));
    };

    updateNotifications();
    const unsubscribe = subscribe(updateNotifications);
    return unsubscribe;
  }, []);

  // Filter notifications based on active tab and source filter
  const displayedNotifications = (activeTab === "sent" ? sentNotifications : receivedNotifications)
    .filter(n => {
      if (!filterSource) return true;
      return n.source === filterSource;
    });

  const handleRowClick = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
  };

  const handleResend = (notification: Notification) => {
    setResendNotification(notification);
    setSelectedNotification(null);
    setIsComposeModalOpen(true);
  };

  const handleCloseCompose = () => {
    setIsComposeModalOpen(false);
    setResendNotification(null);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all notifications?")) {
      clearAllNotifications();
    }
  };

  const isAdmin = currentUser.role === "ADMIN";

  return (
    <RouteGuard>
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-500 mt-1">
                View and manage sent and received notifications
              </p>
            </div>
            {isAdmin && (
              <Button variant="secondary" onClick={handleClearAll}>
                Clear All
              </Button>
            )}
          </div>

          <Card>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button 
                onClick={() => setActiveTab("sent")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "sent" 
                    ? "border-b-2 border-blue-500 text-blue-600" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sent ({sentNotifications.length})
              </button>
              <button 
                onClick={() => setActiveTab("received")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "received" 
                    ? "border-b-2 border-blue-500 text-blue-600" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Received ({receivedNotifications.length})
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value as "" | "Compliance" | "Coach")}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">All Sources</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Coach">Coach</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {activeTab === "sent" ? "Sent At" : "Received At"}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {activeTab === "sent" ? "To" : "From"}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Audience
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        No notifications found
                      </td>
                    </tr>
                  ) : (
                    displayedNotifications.map((notification) => {
                      const recipients = notification.recipients || [];
                      const firstTwo = recipients.slice(0, 2);
                      const remaining = recipients.length - 2;
                      const sender = getUser(notification.senderId);

                      return (
                        <tr
                          key={notification.id}
                          onClick={() => handleRowClick(notification)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(notification.sentAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {activeTab === "sent" ? (
                              <>
                                {firstTwo.map((r) => r.name).join(", ")}
                                {remaining > 0 && ` +${remaining} more`}
                              </>
                            ) : (
                              sender ? <Link href={`/GUARD-1302/admin/users/${sender.id}`} className="text-blue-600 hover:text-blue-800 hover:underline" onClick={(e) => e.stopPropagation()}>{getFullName(sender)}</Link> : "System"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {notification.subject}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={notification.source === "Compliance" ? "info" : "default"}>
                              {notification.source}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={
                              notification.audience === "MANAGERS" ? "warning" : 
                              notification.audience === "LEARNERS" ? "success" : "default"
                            }>
                              {notification.audience === "MANAGERS" ? "Managers" : 
                               notification.audience === "LEARNERS" ? "Learners" : "Specific"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Detail Modal */}
        {selectedNotification && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={handleCloseDetail}>
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
              
              <div 
                className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Notification Details</h2>
                  </div>
                  <button
                    onClick={handleCloseDetail}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Header Info */}
                  <div className="pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500">From:</span>
                      <span className="text-sm">
                        {getUser(selectedNotification.senderId) 
                          ? <Link href={`/GUARD-1302/admin/users/${getUser(selectedNotification.senderId)!.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{getFullName(getUser(selectedNotification.senderId)!)}</Link>
                          : "System"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500">Sent:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedNotification.sentAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500">Source:</span>
                      <Badge variant={selectedNotification.source === "Compliance" ? "info" : "default"}>
                        {selectedNotification.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Audience:</span>
                      <Badge variant={
                        selectedNotification.audience === "MANAGERS" ? "warning" : 
                        selectedNotification.audience === "LEARNERS" ? "success" : "default"
                      }>
                        {selectedNotification.audience === "MANAGERS" ? "Managers" : 
                         selectedNotification.audience === "LEARNERS" ? "Learners" : "Specific Users"}
                      </Badge>
                    </div>
                  </div>

                  {/* Recipients */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {activeTab === "sent" ? "To:" : "Also sent to:"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedNotification.recipients.map((recipient) => (
                        <div
                          key={recipient.userId}
                          className="inline-flex flex-col px-3 py-2 bg-blue-50 text-blue-900 rounded-lg text-xs"
                        >
                          <span className="font-medium">{recipient.name}</span>
                          <span className="text-blue-700">{recipient.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject:</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900">
                      {selectedNotification.subject}
                    </div>
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message Body:</label>
                    <pre className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
                      {selectedNotification.body}
                    </pre>
                  </div>

                  {/* Context Snapshot */}
                  {selectedNotification.contextSnapshot && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Context Snapshot:</label>
                      <div className="px-3 py-2 bg-gray-50 rounded-md text-xs text-gray-700 space-y-1">
                        {selectedNotification.contextSnapshot.siteName && (
                          <div><strong>Site:</strong> {selectedNotification.contextSnapshot.siteName}</div>
                        )}
                        {selectedNotification.contextSnapshot.departmentName && (
                          <div><strong>Department:</strong> {selectedNotification.contextSnapshot.departmentName}</div>
                        )}
                        <div><strong>Overdue:</strong> {selectedNotification.contextSnapshot.countOverdue}</div>
                        <div><strong>Due Soon:</strong> {selectedNotification.contextSnapshot.dueSoonCount}</div>
                        {selectedNotification.contextSnapshot.topTrainingTitle && (
                          <div><strong>Top Training:</strong> {selectedNotification.contextSnapshot.topTrainingTitle}</div>
                        )}
                        {selectedNotification.contextSnapshot.nearestDueDate && (
                          <div><strong>Nearest Due Date:</strong> {selectedNotification.contextSnapshot.nearestDueDate}</div>
                        )}
                        {selectedNotification.contextSnapshot.onTimePct !== undefined && (
                          <div><strong>On-Time %:</strong> {selectedNotification.contextSnapshot.onTimePct}%</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <Button variant="secondary" onClick={handleCloseDetail}>
                    Close
                  </Button>
                  {activeTab === "sent" && (
                    <Button variant="primary" onClick={() => handleResend(selectedNotification)}>
                      <RefreshCw className="w-4 h-4" />
                      Re-send...
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compose Modal for Re-send */}
        {isComposeModalOpen && resendNotification && (
          <NotificationComposeModal
            open={isComposeModalOpen}
            onClose={handleCloseCompose}
            initialSource={resendNotification.source}
            prefilledData={{
              subject: resendNotification.subject,
              body: resendNotification.body,
              recipients: resendNotification.recipients,
              audience: resendNotification.audience,
            }}
          />
        )}
      </AdminLayout>
    </RouteGuard>
  );
}
