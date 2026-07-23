"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Palette, Award, Globe } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import BrandTab from "@/components/admin/settings/BrandTab";
import CertificatesTab from "@/components/admin/settings/CertificatesTab";
import LocalizationTab from "@/components/admin/settings/LocalizationTab";

const TABS = [
  { key: "brand", label: "Brand", icon: Palette },
  { key: "certificates", label: "Certificates", icon: Award },
  { key: "localization", label: "Localization", icon: Globe },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function CustomizationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") || "brand") as TabKey;

  const setTab = (tab: TabKey) => {
    router.push(`/GUARD-1302/admin/settings/customization?tab=${tab}`);
  };

  return (
    <RouteGuard>
      <AdminLayout>
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Customization</h1>
            <p className="text-gray-500 mt-1">Configure branding, certificates, and regional settings</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === "brand" && <BrandTab />}
          {activeTab === "certificates" && <CertificatesTab />}
          {activeTab === "localization" && <LocalizationTab />}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

export default function CustomizationPage() {
  return (
    <Suspense
      fallback={
        <RouteGuard>
          <AdminLayout>
            <div className="py-12 text-center text-gray-500">Loading...</div>
          </AdminLayout>
        </RouteGuard>
      }
    >
      <CustomizationPageContent />
    </Suspense>
  );
}
