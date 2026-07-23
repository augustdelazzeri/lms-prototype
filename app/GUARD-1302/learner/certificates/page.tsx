"use client";

import React, { useState, useEffect } from "react";
import LearnerLayout from "@/components/layouts/LearnerLayout";
import RouteGuard from "@/components/RouteGuard";
import CertificateModal from "@/components/learner/certificates/CertificateModal";
import {
  getCurrentUser,
  getCertificatesByUserId,
  getCourseById,
  subscribe,
} from "@/lib/store-guard-1302";
import { Certificate } from "@/types";
import { 
  Award,
  Calendar,
  Download,
  Eye,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CertificatesPage() {
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const user = getCurrentUser();
      setCurrentUser(user);
      const certs = getCertificatesByUserId(user.id);
      // Sort by issue date (most recent first)
      certs.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
      setCertificates(certs);
    };

    loadData();
    const unsubscribe = subscribe(loadData);
    return unsubscribe;
  }, []);

  const handleViewCertificate = (cert: Certificate) => {
    setSelectedCertificate(cert);
    setIsModalOpen(true);
  };

  // Check if certificate is expiring soon (within 30 days)
  const isExpiringSoon = (cert: Certificate) => {
    if (!cert.expiresAt) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(cert.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  // Check if certificate is expired
  const isExpired = (cert: Certificate) => {
    if (!cert.expiresAt) return false;
    return new Date(cert.expiresAt).getTime() < Date.now();
  };

  // Get counts
  const validCount = certificates.filter(c => !isExpired(c)).length;
  const expiringSoonCount = certificates.filter(c => isExpiringSoon(c)).length;
  const expiredCount = certificates.filter(c => isExpired(c)).length;

  return (
    <RouteGuard allowedRoles={["LEARNER"]}>
      <LearnerLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Certificates</h1>
            <p className="text-gray-500 text-sm mt-1">
              {certificates.length} certificate{certificates.length !== 1 ? "s" : ""} earned
              {expiringSoonCount > 0 && ` \u00b7 ${expiringSoonCount} expiring soon`}
              {expiredCount > 0 && ` \u00b7 ${expiredCount} expired`}
            </p>
          </div>

          {/* Certificates Grid */}
          {certificates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
                <Award className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No certificates yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto text-sm">
                Complete courses to earn certificates. They'll appear here once you finish your training.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {certificates.map((cert) => {
                const course = getCourseById(cert.courseId);
                const expired = isExpired(cert);
                const expiringSoon = isExpiringSoon(cert);

                return (
                  <div
                    key={cert.id}
                    onClick={() => handleViewCertificate(cert)}
                    className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group ${
                      expired ? "border-red-200" : expiringSoon ? "border-amber-200" : "border-gray-200"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <Award className={`w-5 h-5 ${expired ? "text-gray-400" : "text-amber-500"}`} />
                        {expired && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expired</span>
                        )}
                        {expiringSoon && !expired && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Expiring Soon</span>
                        )}
                      </div>

                      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-amber-700 transition-colors">
                        {cert.courseTitle || course?.title || "Course Certificate"}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>Issued {formatDate(cert.issuedAt)}</span>
                      </div>

                      {cert.expiresAt && (
                        <div className={`flex items-center gap-2 text-xs mb-3 ${
                          expired ? "text-red-600" : expiringSoon ? "text-amber-600" : "text-gray-500"
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{expired ? "Expired" : "Expires"} {formatDate(cert.expiresAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="px-5 pb-4 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewCertificate(cert); }}
                        className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewCertificate(cert); }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Certificate Modal */}
        <CertificateModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCertificate(null);
          }}
          certificates={selectedCertificate ? [selectedCertificate] : []}
        />
      </LearnerLayout>
    </RouteGuard>
  );
}


