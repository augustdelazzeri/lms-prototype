"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import { Globe, Check, X, Info, Sparkles } from "lucide-react";
import {
  getOrganization,
  updateOrganizationSettings,
  subscribe,
} from "@/lib/store";

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "UTC", label: "UTC (Universal)" },
];

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-01-31)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (01/31/2024)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/01/2024)" },
];

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  pt: "Portuguese (Português)",
  it: "Italian (Italiano)",
  zh: "Mandarin (中文)",
  ja: "Japanese (日本語)"
};

export default function LocalizationTab() {
  const [organization, setOrganization] = useState(getOrganization());
  const [timezone, setTimezone] = useState(
    organization.settings?.timezone || "America/Los_Angeles"
  );
  const [dateFormat, setDateFormat] = useState<"YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY">(
    organization.settings?.dateFormat || "YYYY-MM-DD"
  );
  
  // Multi-Language State (H1 Requirement)
  const [primaryLanguage, setPrimaryLanguage] = useState(organization.settings?.primaryLanguage || "en");
  const [secondaryLanguages, setSecondaryLanguages] = useState<string[]>(organization.settings?.secondaryLanguages || []);
  const [autoGenerate, setAutoGenerate] = useState(organization.settings?.autoGenerate || false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const org = getOrganization();
      setOrganization(org);
      setTimezone(org.settings?.timezone || "America/Los_Angeles");
      setDateFormat(org.settings?.dateFormat || "YYYY-MM-DD");
      setPrimaryLanguage(org.settings?.primaryLanguage || "en");
      setSecondaryLanguages(org.settings?.secondaryLanguages || []);
      setAutoGenerate(org.settings?.autoGenerate || false);
    });
    return unsubscribe;
  }, []);

  const handleSave = () => {
    updateOrganizationSettings({
      settings: {
        ...organization.settings,
        timezone,
        dateFormat,
        primaryLanguage,
        secondaryLanguages,
        autoGenerate
      },
    });

    setToastMessage("Localization settings saved successfully");
    setToastType("success");
  };

  const toggleSecondaryLanguage = (lang: string) => {
    if (lang === primaryLanguage) return;
    setSecondaryLanguages(prev => 
      prev.includes(lang) 
        ? prev.filter(l => l !== lang) 
        : prev.length < 3 ? [...prev, lang] : prev
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="size-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Regional & Language Preferences
            </h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-6 border-b border-gray-100 pb-6">
            Configure how dates, times, and languages are handled across your organization's learning platform.
          </p>

          <div className="grid grid-cols-2 gap-8">
            {/* Left Column: Regional */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Regional Settings</h3>
              
              {/* Timezone */}
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-2">
                  Display Date Format
                </label>
                <select
                  id="dateFormat"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                >
                  {DATE_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <Info className="size-3" />
                  Preview: {new Date().toLocaleDateString('en-US')}
                </p>
              </div>
            </div>

            {/* Right Column: Multi-Language (H1 Requirement) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Multi-Language AI</h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100">H1 Story</span>
              </div>

              {/* Primary Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Content Language
                </label>
                <select
                  value={primaryLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setPrimaryLanguage(newLang);
                    setSecondaryLanguages(prev => prev.filter(l => l !== newLang));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm font-medium"
                >
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Secondary Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enabled Secondary Languages
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(SUPPORTED_LANGUAGES).filter(([code]) => code !== primaryLanguage).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => toggleSecondaryLanguage(code)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        secondaryLanguages.includes(code)
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                          : secondaryLanguages.length >= 3
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {name}
                      {secondaryLanguages.includes(code) && <Check className="size-3" />}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Select up to 3 additional languages for AI course generation.</p>
              </div>

              {/* Auto-generate Toggle */}
              <div className={`p-4 rounded-xl border transition-all ${autoGenerate ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex items-center mt-1">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={autoGenerate}
                      onChange={() => setAutoGenerate(!autoGenerate)}
                    />
                    <div className={`block w-8 h-5 rounded-full transition-colors ${autoGenerate ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform ${autoGenerate ? 'translate-x-3' : ''}`}></div>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Sparkles className="size-3 text-blue-600" />
                      Auto-generate secondary versions
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      AI will automatically translate and build course versions in all enabled languages during the creation wizard.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-100">
            <Button variant="primary" onClick={handleSave}>
              Save Localization Settings
            </Button>
          </div>
        </div>
      </Card>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
