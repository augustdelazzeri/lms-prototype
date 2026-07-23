"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Plus,
  Radio,
  CheckCircle2,
  FileWarning,
  Clock,
} from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Button from "@/components/Button";
import SignalCard from "@/components/admin/signals/SignalCard";
import LogSignalModal from "@/components/admin/signals/LogSignalModal";
import GenerateTrainingModal from "@/components/admin/signals/GenerateTrainingModal";
import {
  getOperationalSignals,
  getOpenSignals,
  getAllContentCurrencies,
  subscribe,
} from "@/lib/store-guard-1302";
import { users as seedUsers } from "@/data/seed";
import type { OperationalSignal, SignalType, SignalSeverity, SignalStatus } from "@/types";
import { useRouter } from "next/navigation";

export default function SignalsPage() {
  const router = useRouter();
  const [, setTick] = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [generateSignal, setGenerateSignal] = useState<OperationalSignal | null>(null);
  const [typeFilter, setTypeFilter] = useState<SignalType | "">("");
  const [severityFilter, setSeverityFilter] = useState<SignalSeverity | "">("");
  const [statusFilter, setStatusFilter] = useState<SignalStatus | "">("");

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const allSignals = getOperationalSignals();
  const openSignals = getOpenSignals();
  const currencies = getAllContentCurrencies();

  const filteredSignals = useMemo(() => {
    let result = allSignals;
    if (typeFilter) result = result.filter((s) => s.type === typeFilter);
    if (severityFilter) result = result.filter((s) => s.severity === severityFilter);
    if (statusFilter) result = result.filter((s) => s.status === statusFilter);
    return result.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  }, [allSignals, typeFilter, severityFilter, statusFilter]);

  const openCount = openSignals.length;
  const criticalOpen = openSignals.some((s) => s.severity === "critical");
  const actionsPending = allSignals.filter(
    (s) => s.recommendedAction !== "none" && s.status !== "resolved"
  ).length;
  const contentAffected = currencies.filter((c) => c.activeSignals.length > 0).length;
  const resolvedThisMonth = allSignals.filter((s) => {
    if (s.status !== "resolved" || !s.resolvedAt) return false;
    const d = new Date(s.resolvedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
      <AdminLayout>
        <div className="max-w-6xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h1 className="text-xl font-bold text-gray-900">Operational Signals</h1>
              </div>
              <p className="text-sm text-gray-500">
                Track real-world events that affect training content
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowLogModal(true)}>
              <Plus className="w-4 h-4" />
              Log Signal
            </Button>
          </div>

          {/* Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              icon={AlertTriangle}
              label="Open Signals"
              value={openCount}
              highlight={criticalOpen ? "red" : openCount > 0 ? "amber" : "green"}
            />
            <SummaryCard
              icon={Radio}
              label="Actions Pending"
              value={actionsPending}
              highlight={actionsPending > 0 ? "amber" : "green"}
            />
            <SummaryCard
              icon={FileWarning}
              label="Content Affected"
              value={contentAffected}
              highlight={contentAffected > 0 ? "amber" : "green"}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Resolved This Month"
              value={resolvedThisMonth}
              highlight="green"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as SignalType | "")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Types</option>
              <option value="incident">Incident</option>
              <option value="near_miss">Near Miss</option>
              <option value="regulatory_change">Regulatory Change</option>
              <option value="source_update">Source Update</option>
              <option value="equipment_change">Equipment Change</option>
              <option value="process_change">Process Change</option>
              <option value="assessment_anomaly">Assessment Anomaly</option>
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SignalSeverity | "")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SignalStatus | "")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="training_generated">Training Generated</option>
              <option value="resolved">Resolved</option>
            </select>
            {(typeFilter || severityFilter || statusFilter) && (
              <button
                onClick={() => {
                  setTypeFilter("");
                  setSeverityFilter("");
                  setStatusFilter("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Signal List */}
          {filteredSignals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No signals match your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSignals.map((sig) => (
                <SignalCard
                  key={sig.id}
                  signal={sig}
                  onGenerateTraining={(s) => setGenerateSignal(s)}
                />
              ))}
            </div>
          )}
        </div>

        {showLogModal && (
          <LogSignalModal
            allUsers={seedUsers}
            onClose={() => setShowLogModal(false)}
          />
        )}

        {generateSignal && (
          <GenerateTrainingModal
            signal={generateSignal}
            onClose={() => setGenerateSignal(null)}
            onGenerated={(responseId) => {
              setGenerateSignal(null);
              router.push(`/GUARD-1302/admin/training-responses/${responseId}`);
            }}
          />
        )}
      </AdminLayout>
    </RouteGuard>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  highlight: "red" | "amber" | "green";
}) {
  const colors = {
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  const iconColors = {
    red: "text-red-500",
    amber: "text-amber-500",
    green: "text-emerald-500",
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[highlight]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColors[highlight]}`} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
