// Learner Notifications Page - Polished UI
"use client";

import React, { useState, useEffect } from "react";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import Badge from "@/components/Badge";
import { getCurrentUser, getReceivedNotifications, subscribe, getUser } from "@/lib/store-guard-1302";
import { Notification, getFullName } from "@/types";
import { formatDate } from "@/lib/utils";
import { 
  X, 
  Mail, 
  Bell, 
  Calendar,
  User,
  MessageSquare,
  Inbox
} from "lucide-react";

export default function LearnerNotificationsPage() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const updateNotifications = () => {
      setCurrentUser(getCurrentUser());
      const notifs = getReceivedNotifications(getCurrentUser().id);
      // Sort by date (most recent first)
      notifs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setNotifications(notifs);
    };
    updateNotifications();
    return subscribe(updateNotifications);
  }, []);

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Compliance":
        return { bg: "bg-purple-100", text: "text-purple-700", icon: "text-purple-600" };
      case "Training":
        return { bg: "bg-blue-100", text: "text-blue-700", icon: "text-blue-600" };
      case "Reminder":
        return { bg: "bg-amber-100", text: "text-amber-700", icon: "text-amber-600" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", icon: "text-gray-600" };
    }
  };

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <LearnerLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 text-sm mt-1">
              {notifications.length > 0
                ? `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`
                : "No new notifications"}
            </p>
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Inbox className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm">
                You'll see messages here when your administrator sends updates or reminders.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => {
                const sender = getUser(n.senderId);
                const sourceColor = getSourceColor(n.source);
                
                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNotification(n)}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar/Icon */}
                      <div className={`w-10 h-10 rounded-full ${sourceColor.bg} flex items-center justify-center flex-shrink-0`}>
                        <MessageSquare className={`w-5 h-5 ${sourceColor.icon}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                            {n.subject}
                          </h3>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatDate(n.sentAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {n.body}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {sender ? getFullName(sender) : "System"}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor.bg} ${sourceColor.text}`}>
                            {n.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedNotification && (
          <div 
            className="fixed inset-0 z-50 overflow-y-auto" 
            onClick={() => setSelectedNotification(null)}
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
              <div 
                className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Message Details</h2>
                        <p className="text-xs text-gray-500">
                          {formatDate(selectedNotification.sentAt)}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedNotification(null)} 
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Modal Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          <span className="text-gray-400">From:</span>{" "}
                          <span className="font-medium text-gray-900">
                            {getUser(selectedNotification.senderId) 
                              ? getFullName(getUser(selectedNotification.senderId)!) 
                              : "System"}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedNotification.source === "Compliance" ? "info" : "default"}>
                          {selectedNotification.source}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Subject */}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {selectedNotification.subject}
                      </h3>
                    </div>
                    
                    {/* Body */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {selectedNotification.body}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => setSelectedNotification(null)} 
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </LearnerLayout>
    </RouteGuard>
  );
}
